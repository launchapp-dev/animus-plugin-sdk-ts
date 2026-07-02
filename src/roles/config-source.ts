// config_source role contract (v0.7).
//
// A config_source plugin is the kernel's EXCLUSIVE source of the base
// `WorkflowConfig` (workflows/agents/phases/schedules/triggers/daemon). The
// kernel sources its base config from an installed config_source plugin — with
// none installed the daemon refuses to start. Reference impl:
// `animus-config-postgres` (portal team_{agent,workflow,phase} → WorkflowConfig)
// and `animus-config-yaml` (`.animus/workflows*.yaml`).
//
// Method names + wire shapes track `animus-config-protocol` (v0.7.0-rc.2).

import type { CallContext, HealthReport } from './context.js';
import type {
  ConfigLoadRequest,
  ConfigLoadResponse,
  ConfigValidateRequest,
  ConfigValidateResponse,
  ConfigWriteRequest,
  ConfigWriteResponse,
} from '../types/generated/config.js';

export type * from '../types/generated/config.js';
export {
  ActorSchema,
  ConfigLoadRequestSchema,
  ConfigLoadResponseSchema,
  ConfigValidateRequestSchema,
  ConfigValidateResponseSchema,
  ConfigWriteRequestSchema,
  ConfigWriteResponseSchema,
  ConfigModelSchema,
} from '../types/generated/config.js';

/** JSON-RPC method names for the config_source role (Rust `METHOD_CONFIG_*`). */
export const CONFIG_SOURCE_METHODS = {
  load: 'config/load',
  validate: 'config/validate',
  write: 'config/write',
} as const;

/** Manifest capability FLAG (not an RPC method) the kernel gates `config/write`
 *  on. A read-only config source omits it. */
export const CONFIG_WRITE_CAPABILITY = 'config_write';

export interface ConfigSource {
  /** Assemble + return the canonical `WorkflowConfig` (animus.workflow-config.v2).
   *  MAY scope by `params.actor` (per-user/per-tenant overlays). */
  load(params: ConfigLoadRequest, ctx: CallContext): Promise<ConfigLoadResponse> | ConfigLoadResponse;
  /** Structurally validate the current config, returning diagnostics. */
  validate(params: ConfigValidateRequest, ctx: CallContext): Promise<ConfigValidateResponse> | ConfigValidateResponse;
  /** Persist a kernel-validated `ConfigModel`. Gated on the `config_write`
   *  capability; omit to advertise a read-only source. */
  write?(params: ConfigWriteRequest, ctx: CallContext): Promise<ConfigWriteResponse> | ConfigWriteResponse;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
