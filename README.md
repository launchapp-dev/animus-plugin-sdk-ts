# @launchapp-dev/animus-plugin-sdk

TypeScript SDK for authoring [Animus](https://github.com/launchapp-dev/animus-cli) plugins. Ship a plugin for **any** Animus role in TypeScript without reading the Rust source.

> Status: **0.1.x, protocol 1.1.0.** All plugin roles are wired (subject, provider, trigger, transport, log-storage, queue, workflow-runner, durable-store, memory-store, notifier). Types are generated as **Zod schemas** from the Rust protocol crates — Rust is the single source of truth.

This repo is the canonical home of the TypeScript plugin SDK. The Rust
orchestrator lives in
[`launchapp-dev/animus-cli`](https://github.com/launchapp-dev/animus-cli); this
package is published independently to npm so plugin authors can depend on a
stable TypeScript contract without pulling the Rust toolchain.

## Install

```bash
npm install @launchapp-dev/animus-plugin-sdk
# or
pnpm add @launchapp-dev/animus-plugin-sdk
```

Requires Node 20+.

## Layered, subpath imports

The package is one publishable module with **subpath exports** that mirror the
Rust protocol crates. Import `definePlugin` and the base/runtime surface from
the root; import a role's contract + generated Zod types from its subpath.

```ts
import { definePlugin, PluginKind, PROTOCOL_VERSION } from '@launchapp-dev/animus-plugin-sdk';

// Role contracts + generated Zod schemas + role helpers:
import type { SubjectBackend } from '@launchapp-dev/animus-plugin-sdk/subject';
import type { Provider } from '@launchapp-dev/animus-plugin-sdk/provider';
import type { TriggerBackend } from '@launchapp-dev/animus-plugin-sdk/trigger';
import type { TransportBackend } from '@launchapp-dev/animus-plugin-sdk/transport';
import type { LogStorageBackend } from '@launchapp-dev/animus-plugin-sdk/log-storage';
import type { Queue } from '@launchapp-dev/animus-plugin-sdk/queue';
import type { WorkflowRunner } from '@launchapp-dev/animus-plugin-sdk/workflow-runner';
import type { DurableStore } from '@launchapp-dev/animus-plugin-sdk/durable-store';
import type { MemoryStore } from '@launchapp-dev/animus-plugin-sdk/memory-store';
import type { Notifier } from '@launchapp-dev/animus-plugin-sdk/notifier';

// Generated Zod schemas are exported alongside the types, e.g.:
import { AgentRunRequestSchema } from '@launchapp-dev/animus-plugin-sdk/provider';
import { SubjectFilterSchema, WireSubjectSchema } from '@launchapp-dev/animus-plugin-sdk/subject';
```

The base/runtime layer (root export) holds the wire transport, handshake, the
JSON-RPC loop, the manifest/capabilities builder, error codes, and
`PROTOCOL_VERSION`. Each subpath layer adds that role's generated Zod
types, its role-contract interface(s), and role-specific helpers. The root
export also re-exports every role contract for backward compatibility.

## Rust is the source of truth (Zod codegen)

All wire types are generated as Zod schemas from the Rust-emitted JSON Schema
bundles vendored under `schemas/<crate>/_all.json`. Each protocol crate becomes
a module under `src/types/generated/<crate>.ts`:

```ts
export const SubjectFilterSchema = z.object({ /* ... */ }).passthrough();
export type SubjectFilter = z.infer<typeof SubjectFilterSchema>;
```

The runtime uses these schemas to **validate inbound params** before routing to
your `impl` — a malformed request gets a `-32602` (`invalid_params`) reply with
the Zod issue list in `error.data`, not a crash.

Regenerate after updating the vendored schemas:

```bash
npm run codegen        # emit src/types/generated/*.ts from schemas/*/_all.json
npm run codegen:check  # CI drift guard — fails if committed output is stale
```

Open-string Rust enums (`PluginKind`, `TriggerActionHint`, `TriggerAckStatus`)
widen to a literal-union plus `z.string()` so you get autocomplete on the known
values while unknown values still validate (forward-compat). JSON-RPC envelope
fields (`params`/`result`/`payload`/`data`/`id`) stay permissive (`z.unknown()`).

## Hello world: a subject backend

```ts
#!/usr/bin/env node
import { definePlugin } from '@launchapp-dev/animus-plugin-sdk';

definePlugin({
  kind: 'subject_backend',
  name: 'animus-subject-hello',
  version: '0.1.0',
  description: 'One hard-coded subject — proof the SDK works',
  subject_kinds: ['task'],
  impl: {
    // Return `subjects` (not `items`). The SDK auto-fills `fetched_at` and
    // backstops missing `status`/`created_at`/`updated_at` for demos.
    list: () => ({
      subjects: [
        {
          id: 'task:HELLO-1',
          kind: 'task',
          title: 'Hello from TS!',
          status: 'ready',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }),
    // `kind` is parsed from the inbound method (e.g. `subject/get`) and supplied via ctx.
    get: ({ id }, ctx) => ({
      id,
      kind: ctx.kind,
      title: 'Hello from TS!',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  },
}).run();
```

The Animus daemon dispatches subject calls as canonical `subject/<verb>` (with
legacy `<kind>/<verb>` routes still honored) — the SDK routes those to your
`impl` automatically and exposes the resolved kind via `ctx.kind`.

```bash
animus plugin install ./pack.toml
animus subject list --kind task
```

## A provider (streaming)

```ts
import { definePlugin } from '@launchapp-dev/animus-plugin-sdk';

definePlugin({
  kind: 'provider',
  name: 'animus-provider-demo',
  version: '0.1.0',
  description: 'Echo provider',
  impl: {
    run: async (params, ctx) => {
      await ctx.stream.thinking({ text: 'planning…' });
      await ctx.stream.output({ text: `echo: ${params.prompt}` });
      return {
        session_id: 'sess-1',
        exit_code: 0,
        output: `echo: ${params.prompt}`,
        metadata: [], tool_calls: [], tool_results: [], thinking: [], errors: [],
        duration_ms: 12, backend: 'demo:1.0.0',
        tokens_used: { input: 0, output: 0, cached: 0, cache_writes: 0 },
      };
    },
  },
}).run();
```

`ctx.stream` emits the `agent/output|thinking|toolCall|toolResult|error`
notifications; the resolved return value is the final `AgentRunResponse`.

## What the SDK does for you

- Handles `--manifest` / `--help` CLI shortcuts (the host calls `--manifest` during install).
- Runs the newline-delimited JSON-RPC 2.0 loop on stdin/stdout (UTF-8 safe across chunk boundaries; serialized write queue; EOF-as-exit).
- Implements `initialize`, `$/ping`, `health/check`, `shutdown`, `exit`.
- Validates the host's `protocol_version` (strict major-version match) and tolerates the additive v1.1.0 `init_extensions` field.
- **Validates inbound domain params with the generated Zod schemas** and routes them to your `impl`.
- Advertises only the methods your `impl` can actually serve, so the host's preflight never misroutes.
- Emits the v1.1.0 `kind_capabilities` map for the new kinds; leaves it empty for v1.0.0 kinds so wire output stays byte-identical.
- Returns `-32001` (`method_not_supported`) for optional methods you didn't implement, and `-32601` (`method_not_found`) for unknown methods.

Stdout is reserved for protocol frames. The SDK writes diagnostics to stderr; you should too.

## Roles

All roles from the protocol spec are wired. Advertise only the methods you
implement — optional methods you omit return `-32001` so the host can fall back.

| Kind                  | Subpath              | Methods wired |
| --------------------- | -------------------- | ------------- |
| `subject_backend`     | `/subject`           | `subject/list`, `subject/get`, `subject/schema`, optional `subject/create`, `subject/update`, `subject/status`, `subject/next`, `subject/delete`; legacy `<kind>/*` routes |
| `provider`            | `/provider`          | `agent/run`, optional `agent/resume`, `agent/cancel`; streams `agent/output|thinking|toolCall|toolResult|error` |
| `trigger_backend`     | `/trigger`           | `trigger/watch` (→ `trigger/event` notifications), `trigger/schema`, optional `trigger/ack` |
| `transport_backend`   | `/transport`         | `transport/start`, `transport/shutdown`, `transport/schema` |
| `log_storage_backend` | `/log-storage`       | `log_storage/store`, `log_storage/schema`, optional `log_storage/query`, `log_storage/tail` (→ `log_storage/event`) |
| `queue`               | `/queue`             | `queue/enqueue|list|lease|stats|hold|release|drop|mark_assigned|completion|reorder` |
| `workflow_runner`     | `/workflow-runner`   | `workflow/execute`, `workflow/run_phase` |
| `durable_store`       | `/durable-store`     | `durable/begin_workflow_run|begin_step|commit_step|abandon_step|recover_in_flight|query_run` |
| `memory_store`        | `/memory-store`      | `memory/put|get|query|list_scopes|delete_scope` |
| `notifier`            | `/notifier`          | `notifier/notify`, `notifier/schema`, optional `notifier/flush` |

## Scripts

```bash
pnpm install
pnpm run codegen        # regenerate Zod modules from vendored schemas
pnpm run codegen:check  # drift guard
pnpm run build          # tsc → dist/ (all subpath entrypoints)
pnpm run typecheck      # strict-mode tsc
pnpm test               # vitest
```

## License

Elastic License 2.0.
