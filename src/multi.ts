// Multi-kind authoring surface: `definePlugin({ roles: [...] })`.
//
// One process, one serve loop, several roles. Each role contributes a flat
// method table + capability markers; the SDK flattens them into one routing
// table, emits `plugin_kind` (primary) + `plugin_kinds` (all), merges
// capabilities and per-kind crate versions, and drives everything on the public
// `runServeLoop`. This is the SDK-native form of the pattern
// `animus-postgres` previously hand-rolled (see SDK-GAPS.md gap 1).

import process from 'node:process';

import { buildInitializeResult, buildManifest, validateInitializeParams, type PluginIdentity } from './handshake.js';
import type { CallContext, HealthReport } from './roles/context.js';
import { runServeLoop, type RpcHandler } from './serve-loop.js';
import {
  ErrorCode,
  type EnvRequirement,
  type KindCapability,
  type InitializeParams,
  type PluginCapabilities,
  type PluginManifest,
  type RpcResponse,
} from './types/index.js';
import { errorResponse, okResponse } from './wire.js';

/** One role a multi-kind plugin serves. */
export interface Role {
  /** The `PLUGIN_KIND_*` string this role fills (e.g. `"config_source"`). */
  kind: string;
  /** Domain-method routing table for this role (`"config/load"` → handler). */
  methods: Record<string, RpcHandler>;
  /** Extra capability tokens for this role beyond its method names — capability
   *  FLAGS (e.g. `"config_write"`) or preflight markers. Method names are
   *  advertised automatically from `methods`. */
  capabilities?: string[];
  /** Subject kinds this role produces (subject_backend role only). Emitted as
   *  `subject_kind:<k>` preflight markers + `capabilities.subject_kinds`. */
  subject_kinds?: string[];
  /** Per-kind protocol crate version (v1.1.0 `kind_capabilities` entry). */
  kind_capability?: KindCapability;
}

export interface MultiPluginSpec {
  name: string;
  version: string;
  description: string;
  /** The roles this one process serves. The first role's `kind` is the primary
   *  unless `primary_kind` overrides it. */
  roles: Role[];
  /** Override the primary/legacy `plugin_kind`. Must be one of the role kinds.
   *  Defaults to `roles[0].kind`. */
  primary_kind?: string;
  env_required?: EnvRequirement[];
  notification_buffer_size?: number | null;
  /** Process-wide extra capability tokens (in addition to per-role ones). */
  extra_capabilities?: string[];
  /** Whether this plugin consumes host-injected MCP servers (protocol 1.2.0+).
   *  First-class, plugin-DECLARED capability (REQUIREMENT-039). Omit to leave
   *  undeclared (kernel default); set `false` to opt out. */
  supports_mcp?: boolean;
  /** Optional health probe for `health/check` (else reports `healthy`). */
  health?: (ctx: CallContext) => Promise<HealthReport> | HealthReport;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  skipCliArgs?: boolean;
}

export interface PluginHandle {
  run(): Promise<void>;
  manifest(): PluginManifest;
  initialize(params: InitializeParams): RpcResponse;
}

// Kinds for which the SDK auto-populates a `kind_capabilities` entry when a role
// omits `kind_capability`, mirroring single-kind `definePlugin`'s
// `deriveKindCapabilities` (the v1.1.0 roles) plus the v0.7 typed BaaS roles.
// Keeps a multi-kind plugin's `initialize` reply consistent with its
// single-kind equivalents. Authors can still override per role.
const DEFAULT_KIND_CAPABILITY_KINDS = new Set<string>([
  'workflow_runner',
  'queue',
  'durable_store',
  'memory_store',
  'notifier',
  'config_source',
  'workflow_journal',
  'conversation_store',
]);

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

interface Composed {
  identity: PluginIdentity;
  capabilities: PluginCapabilities;
  kindCapabilities?: Record<string, KindCapability>;
  pluginKinds: string[];
  subjectKindMarkers: string[];
  methods: Map<string, RpcHandler>;
}

function compose(spec: MultiPluginSpec): Composed {
  if (!spec.roles || spec.roles.length === 0) {
    throw new TypeError('definePlugin: `roles` must contain at least one role');
  }
  for (const role of spec.roles) {
    if (!role.kind || typeof role.kind !== 'string') throw new TypeError('definePlugin: each role needs a `kind`');
    if (!role.methods || typeof role.methods !== 'object') {
      throw new TypeError(`definePlugin: role '${role.kind}' needs a \`methods\` table`);
    }
  }

  const primary = spec.primary_kind ?? spec.roles[0]!.kind;
  if (!spec.roles.some((r) => r.kind === primary)) {
    throw new TypeError(`definePlugin: primary_kind '${primary}' is not one of the declared roles`);
  }
  const pluginKinds = dedupe([primary, ...spec.roles.map((r) => r.kind)]);

  // Flatten every role's methods into one routing table (warn on collision).
  const methods = new Map<string, RpcHandler>();
  const methodNames: string[] = [];
  const roleCaps: string[] = [];
  const subjectKinds: string[] = [];
  const subjectKindMarkers: string[] = [];
  const kindCapabilities: Record<string, KindCapability> = {};

  for (const role of spec.roles) {
    for (const [name, handler] of Object.entries(role.methods)) {
      if (methods.has(name)) {
        process.stderr.write(`[${spec.name}] WARNING: duplicate method '${name}' across roles\n`);
      }
      methods.set(name, handler);
      methodNames.push(name);
    }
    if (role.capabilities) roleCaps.push(...role.capabilities);
    if (role.subject_kinds) {
      for (const k of role.subject_kinds) {
        subjectKinds.push(k);
        subjectKindMarkers.push(`subject_kind:${k}`);
      }
    }
    if (role.kind_capability) {
      kindCapabilities[role.kind] = role.kind_capability;
    } else if (DEFAULT_KIND_CAPABILITY_KINDS.has(role.kind) && !(role.kind in kindCapabilities)) {
      kindCapabilities[role.kind] = { crate_version: '0.1.0', extra: {} };
    }
  }

  const capabilities: PluginCapabilities = {
    methods: dedupe([...methodNames, ...roleCaps, 'health/check', ...(spec.extra_capabilities ?? [])]),
  };
  const uniqueSubjectKinds = dedupe(subjectKinds);
  if (uniqueSubjectKinds.length > 0) capabilities.subject_kinds = uniqueSubjectKinds;

  const identity: PluginIdentity = {
    name: spec.name,
    version: spec.version,
    description: spec.description,
    plugin_kind: primary,
  };

  return {
    identity,
    capabilities,
    kindCapabilities: Object.keys(kindCapabilities).length > 0 ? kindCapabilities : undefined,
    pluginKinds,
    subjectKindMarkers: dedupe(subjectKindMarkers),
    methods,
  };
}

export function defineMultiPlugin(spec: MultiPluginSpec): PluginHandle {
  if (!spec.name || typeof spec.name !== 'string') throw new TypeError('definePlugin: `name` is required');
  if (!spec.version || typeof spec.version !== 'string') throw new TypeError('definePlugin: `version` is required');
  if (!spec.description || typeof spec.description !== 'string') {
    throw new TypeError('definePlugin: `description` is required');
  }

  const c = compose(spec);
  const manifest = buildManifest(c.identity, c.capabilities, {
    env_required: spec.env_required,
    notification_buffer_size: spec.notification_buffer_size,
    extra_capabilities: c.subjectKindMarkers,
    plugin_kinds: c.pluginKinds,
    supports_mcp: spec.supports_mcp,
  });

  return {
    manifest: () => manifest,
    initialize: (params) => {
      const incompat = validateInitializeParams(params);
      if (incompat) return errorResponse(null, ErrorCode.InvalidRequest, incompat);
      return okResponse(null, buildInitializeResult(c.identity, c.capabilities, c.kindCapabilities, c.pluginKinds));
    },
    run: () =>
      runServeLoop({
        manifest,
        identity: c.identity,
        capabilities: c.capabilities,
        kindCapabilities: c.kindCapabilities,
        pluginKinds: c.pluginKinds,
        methods: c.methods,
        health: spec.health,
        input: spec.input,
        output: spec.output,
        skipCliArgs: spec.skipCliArgs,
      }),
  };
}
