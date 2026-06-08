// Handshake helpers: build a one-shot `PluginManifest` (printed in response to
// `--manifest`) and the `initialize` reply that the host expects on first
// contact.
//
// The shapes here track `crates/animus-plugin-protocol` and the JSON Schema
// artifacts at `schemas/animus-plugin-protocol/*.json`. Once T2 lands generated
// types we will swap the imports from `./types/index.js` to
// `./types/generated.js`.

import type {
  InitializeParams,
  InitializeResult,
  KindCapability,
  PluginCapabilities,
  PluginInfo,
  PluginManifest,
} from './types/index.js';
import { PROTOCOL_VERSION } from './types/index.js';

/** Inputs that describe a plugin's static identity. */
export interface PluginIdentity {
  /** Published plugin name (e.g. `"animus-subject-linear"`). */
  name: string;
  /** Plugin semver. */
  version: string;
  /** Human-readable description; shown by `animus plugin info`. */
  description: string;
  /** One of the `PluginKind` string constants. */
  plugin_kind: string;
}

/** Build a flat `PluginManifest` for emission via `--manifest`.
 *
 *  The host's preflight scans `manifest.capabilities` for
 *  `subject_kind:<kind>` tokens (see `crates/orchestrator-core/src/plugin_preflight/mod.rs`).
 *  Callers should pass any such tokens via `options.extra_capabilities` so that
 *  a TS subject backend that claims `task` is recognized as satisfying
 *  `subject_kind:task` without needing to spawn.
 */
export function buildManifest(
  identity: PluginIdentity,
  capabilities: PluginCapabilities,
  options: {
    env_required?: PluginManifest['env_required'];
    notification_buffer_size?: number | null;
    extra_capabilities?: string[];
  } = {},
): PluginManifest {
  const methods = capabilities.methods ?? [];
  const extras = options.extra_capabilities ?? [];
  // De-dupe while preserving insertion order.
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const c of [...methods, ...extras]) {
    if (!seen.has(c)) {
      seen.add(c);
      merged.push(c);
    }
  }
  return {
    name: identity.name,
    version: identity.version,
    plugin_kind: identity.plugin_kind,
    description: identity.description,
    protocol_version: PROTOCOL_VERSION,
    capabilities: merged,
    env_required: options.env_required ?? [],
    notification_buffer_size: options.notification_buffer_size ?? null,
  };
}

/** Build the `initialize` reply payload.
 *
 *  `kindCapabilities` (v1.1.0+) carries the per-kind protocol crate version for
 *  the new kinds. v1.0.0 kinds pass `undefined`/empty so the wire output stays
 *  byte-identical to the pre-v1.1.0 shape. */
export function buildInitializeResult(
  identity: PluginIdentity,
  capabilities: PluginCapabilities,
  kindCapabilities?: Record<string, KindCapability>,
): InitializeResult {
  const plugin_info: PluginInfo = {
    name: identity.name,
    version: identity.version,
    plugin_kind: identity.plugin_kind,
    description: identity.description,
  };
  const result: InitializeResult = {
    protocol_version: PROTOCOL_VERSION,
    plugin_info,
    capabilities,
  };
  if (kindCapabilities && Object.keys(kindCapabilities).length > 0) {
    (result as InitializeResult & { kind_capabilities: Record<string, KindCapability> }).kind_capabilities =
      kindCapabilities;
  }
  return result;
}

/**
 * Inspect an incoming `initialize` params payload and decide whether the
 * host's protocol version is acceptable. The current rule (matching the Rust
 * host's posture) is **strict major-version match**: a `1.x` plugin will
 * accept any `1.x` host but reject `0.x` or `2.x`.
 *
 * Returns `null` when compatible, or a human-readable reason when not.
 */
export function validateInitializeParams(params: InitializeParams): string | null {
  if (typeof params.protocol_version !== 'string' || params.protocol_version.length === 0) {
    return 'host did not advertise a protocol_version';
  }
  const hostMajor = params.protocol_version.split('.', 1)[0];
  const pluginMajor = PROTOCOL_VERSION.split('.', 1)[0];
  if (hostMajor !== pluginMajor) {
    return `incompatible protocol version: host=${params.protocol_version}, plugin=${PROTOCOL_VERSION}`;
  }
  return null;
}
