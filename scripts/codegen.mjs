#!/usr/bin/env node
// Code-generates **Zod schemas** from the Rust-emitted JSON Schema bundles in
// schemas/<crate>/_all.json. The Rust protocol crates are the single source of
// truth; this emitter is deterministic and re-runnable (the drift check
// regenerates into a temp dir and diffs).
//
// Output: one module per protocol crate under src/types/generated/<crate>.ts,
// each exporting `export const XSchema = z.object({...})` plus
// `export type X = z.infer<typeof XSchema>` for every $def in that bundle.
//
// Design notes:
//   - $refs resolve to the sibling `<Name>Schema` const within the same module
//     (all defs in a bundle live in one file). Forward references are handled
//     via `z.lazy(() => NameSchema)` only when a def is used before it is
//     declared; we topologically emit and fall back to lazy for cycles.
//   - Open-string enums on the Rust side (PluginKind, TriggerActionHint,
//     TriggerAckStatus) flatten an `Other(String)` variant to `string` on the
//     wire. They are widened to a literal-union the schema accepts plus any
//     string, so authors get autocomplete while unknown values still validate.
//   - Schemaless fields (no type/$ref/oneOf/anyOf) — the JSON-RPC envelope
//     fields `params`/`result`/`payload`/`data`/`id`/`input_schema` — emit
//     `z.unknown()` so they stay permissive (never reject a valid frame).
//   - Name collisions are avoided: each $def emits exactly one `<Name>Schema`.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const schemasRoot = resolve(repoRoot, "schemas");
// Output dir is overridable so the drift check can target a staging directory.
const outDir = process.env.ANIMUS_CODEGEN_OUT_DIR
  ? resolve(process.env.ANIMUS_CODEGEN_OUT_DIR)
  : resolve(repoRoot, "src/types/generated");

// Crate -> module file name (kebab-case of the crate, dropping the `animus-`
// prefix and `-protocol` suffix). Discovered from the schemas/ directory so a
// new vendored bundle is picked up automatically.
function moduleNameForCrate(crate) {
  return crate.replace(/^animus-/, "").replace(/-protocol$/, "");
}

// Open-string enum vocabularies. Mirrors the Rust `PLUGIN_KIND_*`,
// `TriggerActionHint::*`, `TriggerAckStatus::*` constants. Each of these Rust
// types has an `Other(String)` variant that flattens to a bare `string` on the
// wire, so the generated schema accepts the known literals OR any other string.
const OPEN_ENUMS = {
  PluginKind: [
    "provider",
    "subject_backend",
    "task_backend",
    "trigger_backend",
    "log_storage_backend",
    "transport_backend",
    "workflow_runner",
    "queue",
    "durable_store",
    "memory_store",
    "notifier",
    "web_ui",
    "custom",
  ],
  TriggerActionHint: ["create_task", "run_workflow"],
  TriggerAckStatus: ["dispatched", "queued", "unmatched", "skipped", "failed", "shutdown"],
};

function indent(s, n) {
  const pad = "  ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

// Render a Zod expression for an arbitrary JSON-Schema node. `refName` is
// resolved against the set of defs in the current bundle.
function renderNode(node, ctx) {
  if (node === true || node === undefined) return "z.unknown()";
  if (node === false) return "z.never()";

  // $ref → sibling schema const (possibly lazy for forward/cyclic refs).
  if (node.$ref) {
    const refName = node.$ref.replace("#/$defs/", "");
    return ctx.refExpr(refName);
  }

  // oneOf / anyOf → union. (Internally-tagged Rust enums emit oneOf of objects;
  // nullable refs emit anyOf of [ref, null].)
  const variants = node.oneOf ?? node.anyOf;
  if (Array.isArray(variants)) {
    if (variants.length === 1) return renderNode(variants[0], ctx);
    // oneOf of `{const: "x", type: "string"}` is a closed string enum.
    if (variants.every((v) => typeof v.const === "string" && (v.type === "string" || v.type === undefined))) {
      const lits = variants.map((v) => JSON.stringify(v.const));
      return `z.enum([${lits.join(", ")}])`;
    }
    const rendered = variants.map((v) => renderNode(v, ctx));
    return `z.union([${rendered.join(", ")}])`;
  }

  if (node.const !== undefined) {
    return `z.literal(${JSON.stringify(node.const)})`;
  }

  if (Array.isArray(node.enum)) {
    if (node.enum.every((v) => typeof v === "string")) {
      return `z.enum([${node.enum.map((v) => JSON.stringify(v)).join(", ")}])`;
    }
    return `z.union([${node.enum.map((v) => `z.literal(${JSON.stringify(v)})`).join(", ")}])`;
  }

  // `type` may be a string, or an array including "null" (nullable).
  let type = node.type;
  if (Array.isArray(type)) {
    const nonNull = type.filter((t) => t !== "null");
    const hasNull = type.includes("null");
    if (nonNull.length === 0) return "z.null()";
    const inner = renderNode({ ...node, type: nonNull.length === 1 ? nonNull[0] : nonNull }, ctx);
    return hasNull ? `${inner}.nullable()` : inner;
  }

  switch (type) {
    case "string":
      if (node.format === "date-time") return "z.string().datetime({ offset: true })";
      return "z.string()";
    case "integer":
      return applyNumericBounds("z.number().int()", node);
    case "number":
      return applyNumericBounds("z.number()", node);
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    case "array": {
      const item = node.items ? renderNode(node.items, ctx) : "z.unknown()";
      return `z.array(${item})`;
    }
    case "object": {
      // Map type: additionalProperties is a schema (not bool).
      if (node.additionalProperties && typeof node.additionalProperties === "object") {
        const val = renderNode(node.additionalProperties, ctx);
        return `z.record(z.string(), ${val})`;
      }
      // Free-form object with no declared properties → permissive record.
      if (!node.properties || Object.keys(node.properties).length === 0) {
        return "z.record(z.string(), z.unknown())";
      }
      return renderObject(node, ctx);
    }
    default:
      // No type, no $ref, no union → schemaless. Keep permissive: this is how
      // the JSON-RPC envelope fields (params/result/payload/data/id/
      // input_schema) and Rust `serde_json::Value` fields appear.
      return "z.unknown()";
  }
}

// Translate JSON-Schema numeric constraints (`minimum`/`maximum`) and unsigned
// integer formats (`uint`, `uint8`, ...) into Zod refinements so the generated
// validators stay faithful to the Rust source-of-truth schemas.
function applyNumericBounds(base, node) {
  let out = base;
  const isUnsigned = typeof node.format === "string" && node.format.startsWith("uint");
  if (typeof node.minimum === "number") {
    out += `.min(${node.minimum})`;
  } else if (isUnsigned) {
    out += `.min(0)`;
  }
  if (typeof node.maximum === "number") {
    out += `.max(${node.maximum})`;
  }
  return out;
}

function renderObject(node, ctx) {
  const props = node.properties ?? {};
  const required = new Set(node.required ?? []);
  const keys = Object.keys(props); // preserve schema order (deterministic)
  const lines = [];
  for (const key of keys) {
    let expr = renderNode(props[key], ctx);
    if (!required.has(key)) expr = `${expr}.optional()`;
    lines.push(`${JSON.stringify(key)}: ${expr},`);
  }
  const body = lines.join("\n");
  let obj = `z.object({\n${indent(body, 1)}\n})`;
  // Allow unknown extra keys (forward-compat with newer hosts/minors).
  obj = `${obj}.passthrough()`;
  return obj;
}

// Collect the direct $ref dependencies of a def so we can topologically sort.
function collectRefs(node, acc) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collectRefs(n, acc);
    return;
  }
  if (typeof node.$ref === "string") {
    acc.add(node.$ref.replace("#/$defs/", ""));
  }
  for (const k of Object.keys(node)) {
    if (k === "$ref") continue;
    collectRefs(node[k], acc);
  }
}

function compileBundle(crate) {
  const bundlePath = resolve(schemasRoot, crate, "_all.json");
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8"));
  const defs = bundle.$defs ?? {};
  const names = Object.keys(defs).sort();

  // Build dependency graph for a deterministic topo order; cycles fall back to
  // z.lazy. `declared` tracks which schema consts have been emitted already so
  // refExpr can decide between a direct reference and a lazy one.
  const deps = new Map();
  for (const name of names) {
    const acc = new Set();
    collectRefs(defs[name], acc);
    acc.delete(name); // ignore self-ref for ordering
    deps.set(name, [...acc].filter((d) => names.includes(d)).sort());
  }

  // Kahn-ish topo sort (deterministic by sorted name order).
  const ordered = [];
  const emitted = new Set();
  const visiting = new Set();
  function visit(name) {
    if (emitted.has(name)) return;
    if (visiting.has(name)) return; // cycle; will be lazy-referenced
    visiting.add(name);
    for (const d of deps.get(name) ?? []) visit(d);
    visiting.delete(name);
    if (!emitted.has(name)) {
      emitted.add(name);
      ordered.push(name);
    }
  }
  for (const name of names) visit(name);

  const declared = new Set();
  const chunks = [];
  for (const name of ordered) {
    const ctx = {
      refExpr: (refName) => {
        const schemaConst = `${refName}Schema`;
        // Forward reference (not yet declared) or self-reference → lazy.
        if (refName === name || !declared.has(refName)) {
          return `z.lazy(() => ${schemaConst})`;
        }
        return schemaConst;
      },
    };

    // Open-string enums: emit the widened union regardless of how schemars
    // rendered them, so authors get autocomplete + forward-compat.
    let expr;
    if (OPEN_ENUMS[name]) {
      const lits = OPEN_ENUMS[name].map((v) => `z.literal(${JSON.stringify(v)})`);
      // `z.string()` last keeps the union open to unknown wire values.
      expr = `z.union([${lits.join(", ")}, z.string()])`;
    } else {
      expr = renderNode(defs[name], ctx);
    }

    declared.add(name);
    chunks.push(
      `export const ${name}Schema = ${expr};\n` +
        `export type ${name} = z.infer<typeof ${name}Schema>;`,
    );
  }

  const banner = [
    `// AUTO-GENERATED FROM schemas/${crate}/_all.json — DO NOT EDIT BY HAND.`,
    `// Regenerate via: pnpm run codegen`,
    `import { z } from "zod";`,
    "",
    "",
  ].join("\n");

  return {
    module: moduleNameForCrate(crate),
    content: banner + chunks.join("\n\n") + "\n",
    typeCount: names.length,
  };
}

function discoverCrates() {
  return readdirSync(schemasRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => {
      try {
        readFileSync(resolve(schemasRoot, name, "_all.json"));
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const crates = discoverCrates();
  const results = [];
  for (const crate of crates) {
    const result = compileBundle(crate);
    const outPath = resolve(outDir, `${result.module}.ts`);
    writeFileSync(outPath, result.content);
    results.push({ ...result, outPath });
    if (!process.env.ANIMUS_CODEGEN_OUT_DIR) {
      console.log(`wrote ${basename(outPath)} (${result.typeCount} types)`);
    }
  }

  // index barrel re-exporting every generated module (namespaced to avoid
  // cross-crate name collisions like SubjectId / SubjectDispatch).
  const barrelLines = [
    "// AUTO-GENERATED — DO NOT EDIT BY HAND.",
    "// Regenerate via: pnpm run codegen",
    "",
  ];
  for (const r of results) {
    barrelLines.push(`export * as ${camel(r.module)} from "./${r.module}.js";`);
  }
  barrelLines.push("");
  writeFileSync(resolve(outDir, "index.ts"), barrelLines.join("\n"));
  if (!process.env.ANIMUS_CODEGEN_OUT_DIR) {
    console.log(`wrote index.ts (barrel, ${results.length} modules)`);
  }
}

function camel(kebab) {
  return kebab.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

main();
