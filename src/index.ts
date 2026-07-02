// Base / runtime / definePlugin entrypoint for `@launchapp-dev/animus-plugin-sdk`.
//
// This is the back-compat `.` export: everything plugin authors reached for
// before still lives here. Role-specific generated Zod types + contracts are
// ALSO published as subpath exports (`@launchapp-dev/animus-plugin-sdk/subject`,
// `/provider`, `/trigger`, …) — see package.json `exports`.

// --- top-level author entrypoint ---
export { definePlugin } from './plugin.js';
export type { PluginSpec, PluginHandle } from './plugin.js';

// --- multi-kind (v0.7): one process, many roles, one serve loop ---
export { defineMultiPlugin } from './multi.js';
export type { MultiPluginSpec, Role } from './multi.js';

// --- public lifecycle serve loop (compose your own dispatch) ---
export { runServeLoop, extractActor } from './serve-loop.js';
export type { RpcHandler, ServeLoopOptions } from './serve-loop.js';

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

// --- v0.7 role contracts (config_source / workflow_journal / conversation_store) ---
export type { ConfigSource } from './roles/config-source.js';
export { CONFIG_SOURCE_METHODS, CONFIG_WRITE_CAPABILITY } from './roles/config-source.js';
export type { WorkflowJournal, JournalRun, JournalEvent, JournalEventKind, JournalSchema } from './roles/workflow-journal.js';
export { WORKFLOW_JOURNAL_METHODS } from './roles/workflow-journal.js';
export type { ConversationStore } from './roles/conversation-store.js';
export { CONVERSATION_STORE_METHODS } from './roles/conversation-store.js';

// --- handshake helpers (rarely needed directly) ---
export { buildInitializeResult, buildManifest, validateInitializeParams } from './handshake.js';
export type { PluginIdentity } from './handshake.js';

// --- low-level wire (advanced) ---
export { createWire, encodeFrame, errorResponse, okResponse, parseFrame } from './wire.js';
export type { FrameHandler, Wire, WireOptions } from './wire.js';

// --- protocol constants & shared types ---
export { ErrorCode, PluginKind, PROTOCOL_VERSION } from './types/index.js';
export type {
  Actor,
  Visibility,
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
