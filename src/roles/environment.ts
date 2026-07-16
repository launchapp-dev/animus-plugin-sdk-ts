// environment role contract (v0.7).
//
// An environment plugin materializes an execution context (a git worktree, a
// local container, a remote VM, ...) and runs `HarnessCommand`s inside it on
// behalf of the provider/runner layer. The kernel routes a `prepare` call to
// the plugin whose declared environment kind matches `EnvironmentSpec.kind`,
// then hands the returned `EnvironmentHandle` back on every `exec` / `teardown`.
//
// Lifecycle:
//   1. `environment/prepare`     — materialize the context, return a handle.
//   2. `environment/exec`        — run a command, capture aggregated output.
//      `environment/exec_stream` — same, but emit incremental
//                                   `environment/output` notifications for
//                                   stdout/stderr as they arrive (opt-in).
//   3. `environment/teardown`    — dispose of the context (idempotent).
//
// `exec` is the baseline every environment plugin MUST implement;
// `exec_stream` is opt-in — omit it to advertise a non-streaming environment.
//
// Method names + wire shapes track `animus-environment-protocol` (v0.7.0-rc.2).
// Reference impls: `animus-environment-worktree` (Rust, local git worktrees)
// and `animus-environment-docker` (TS, local Docker via `docker exec`).

import type { CallContext, HealthReport } from './context.js';
import type {
  ExecNotification,
  ExecRequest,
  ExecResponse,
  ExecSessionRequest,
  ExecSessionResponse,
  PrepareRequest,
  PrepareResponse,
  TeardownRequest,
  TeardownResponse,
} from '../types/generated/environment.js';

export type * from '../types/generated/environment.js';
export {
  EnvironmentHandleSchema,
  EnvironmentSpecSchema,
  ExecNotificationSchema,
  ExecRequestSchema,
  ExecResponseSchema,
  ExecSessionRequestSchema,
  ExecSessionResponseSchema,
  ExecStreamSchema,
  HarnessCommandSchema,
  PrepareRequestSchema,
  PrepareResponseSchema,
  RepoRefSchema,
  TeardownRequestSchema,
  TeardownResponseSchema,
} from '../types/generated/environment.js';

/** JSON-RPC method names for the environment role (Rust `METHOD_ENVIRONMENT_*`). */
export const ENVIRONMENT_METHODS = {
  prepare: 'environment/prepare',
  exec: 'environment/exec',
  execStream: 'environment/exec_stream',
  execSession: 'environment/exec_session',
  teardown: 'environment/teardown',
} as const;

/** Server-streaming notification an `exec_stream` call emits mid-exec
 *  (Rust `NOTIFICATION_ENVIRONMENT_OUTPUT`). */
export const ENVIRONMENT_OUTPUT_NOTIFICATION = 'environment/output';

/** Server-streaming notification an `exec_session` call emits per journal event
 *  (Rust `NOTIFICATION_ENVIRONMENT_JOURNAL`). */
export const ENVIRONMENT_JOURNAL_NOTIFICATION = 'environment/journal';

/** Emit an incremental `environment/output` notification for an in-flight
 *  `exec_stream`. Passed to the author's `execStream` handler so it can stream
 *  stdout/stderr deltas back to the host as they arrive. */
export type EnvironmentOutputEmitter = (note: ExecNotification) => void;

/** Emit an `environment/journal` notification for an in-flight `exec_session`.
 *  Passed to the author's `execSession` handler so it can forward the node's
 *  journal events (an `ExecNotification` `Journal` variant) as they arrive. */
export type EnvironmentJournalEmitter = (note: ExecNotification) => void;

export interface Environment {
  /** Materialize the execution context described by `params.spec` and return an
   *  opaque handle used for subsequent `exec` / `teardown` calls. */
  prepare(params: PrepareRequest, ctx: CallContext): Promise<PrepareResponse> | PrepareResponse;
  /** Run `params.command` inside the prepared context, honouring `stdin` /
   *  `timeout_secs`, and return the aggregated `ExecResponse`. */
  exec(params: ExecRequest, ctx: CallContext): Promise<ExecResponse> | ExecResponse;
  /** Like `exec`, but stream stdout/stderr deltas via `emit(...)` as they
   *  arrive, then resolve with the aggregated `ExecResponse`. Omit to advertise
   *  a non-streaming environment (the host falls back to `exec`). */
  execStream?(
    params: ExecRequest,
    emit: EnvironmentOutputEmitter,
    ctx: CallContext,
  ): Promise<ExecResponse> | ExecResponse;
  /** Dispatch a subject to the environment's OWN animus (REQ-052 remote-animus):
   *  the node runs the workflow through its own provider/session layer and this
   *  handler forwards its journal events via `emit(...)`, then resolves with the
   *  node-local run's terminal `ExecSessionResponse`. Omit to advertise an
   *  environment that only runs raw commands (the host falls back to exec). */
  execSession?(
    params: ExecSessionRequest,
    emit: EnvironmentJournalEmitter,
    ctx: CallContext,
  ): Promise<ExecSessionResponse> | ExecSessionResponse;
  /** Dispose of the prepared context. MUST be idempotent — a second teardown of
   *  an already-gone context resolves successfully. */
  teardown(params: TeardownRequest, ctx: CallContext): Promise<TeardownResponse> | TeardownResponse;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
