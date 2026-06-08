// Base / runtime / definePlugin entrypoint for `@launchapp-dev/animus-plugin-sdk`.
//
// This is the back-compat `.` export: everything plugin authors reached for
// before still lives here. Role-specific generated Zod types + contracts are
// ALSO published as subpath exports (`@launchapp-dev/animus-plugin-sdk/subject`,
// `/provider`, `/trigger`, …) — see package.json `exports`.

// --- top-level author entrypoint ---
export { definePlugin } from './plugin.js';
export type { PluginSpec, PluginHandle } from './plugin.js';

// --- role contracts (back-compat surface) ---
export type {
  CallContext,
  HealthReport,
  Subject,
  SubjectBackend,
  SubjectCallContext,
  SubjectCreateRequest,
  SubjectListParams,
  SubjectListResult,
  SubjectPatch,
  SubjectStatus,
  TriggerBackend,
  TriggerEvent,
  TriggerSchema,
  Provider,
  ProviderCallContext,
  AgentStream,
  ProviderRunParams,
  ProviderRunResult,
  TransportBackend,
  LogStorageBackend,
  Queue,
  WorkflowRunner,
  DurableStore,
  MemoryStore,
  Notifier,
} from './roles.js';

// --- handshake helpers (rarely needed directly) ---
export { buildInitializeResult, buildManifest, validateInitializeParams } from './handshake.js';
export type { PluginIdentity } from './handshake.js';

// --- low-level wire (advanced) ---
export { createWire, encodeFrame, errorResponse, okResponse, parseFrame } from './wire.js';
export type { FrameHandler, Wire, WireOptions } from './wire.js';

// --- protocol constants & shared types ---
export { ErrorCode, PluginKind, PROTOCOL_VERSION } from './types/index.js';
export type {
  EnvRequirement,
  HealthCheckResult,
  HealthStatus,
  HostCapabilities,
  HostInfo,
  InitializeParams,
  InitializeResult,
  KindCapability,
  McpTool,
  PluginCapabilities,
  PluginInfo,
  PluginKindString,
  PluginManifest,
  RpcError,
  RpcId,
  RpcNotification,
  RpcRequest,
  RpcResponse,
} from './types/index.js';
