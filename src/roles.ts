// Back-compat barrel for role contracts. The contracts now live one-per-file
// under `./roles/` and are also published as subpath exports
// (`@launchapp-dev/animus-plugin-sdk/<role>`). This module re-exports them so
// the historical `import { SubjectBackend } from '.../roles.js'` path and the
// `.` entrypoint keep working unchanged.

export type { CallContext, HealthReport } from './roles/context.js';

// subject_backend
export type {
  Subject,
  SubjectStatus,
  SubjectListParams,
  SubjectListResult,
  SubjectCallContext,
  SubjectCreateRequest,
  SubjectPatch,
  SubjectBackend,
} from './roles/subject.js';

// trigger_backend
export type { TriggerEvent, TriggerSchema, TriggerBackend } from './roles/trigger.js';

// provider
export type { Provider, ProviderCallContext, AgentStream, AgentRunRequest, AgentRunResponse } from './roles/provider.js';

// transport_backend
export type { TransportBackend, TransportConfig, TransportInfo, TransportSchema } from './roles/transport.js';

// log_storage_backend
export type { LogStorageBackend, LogEntry, LogQuery, LogQueryResult, LogStorageSchema } from './roles/log-storage.js';

// v1.1.0 roles
export type { Queue } from './roles/queue.js';
export type { WorkflowRunner } from './roles/workflow-runner.js';
export type { DurableStore } from './roles/durable-store.js';
export type { MemoryStore } from './roles/memory-store.js';
export type { Notifier } from './roles/notifier.js';

// --- deprecated source-compat aliases (provider was never wired before, so no
// published plugin depends on the old shape; kept so old type imports compile) ---

/** @deprecated The provider contract now uses generated `AgentRunRequest`. */
export interface ProviderRunParams {
  prompt: string;
  model?: string;
  session_id?: string;
  cwd: string;
  [key: string]: unknown;
}

/** @deprecated The provider contract now uses generated `AgentRunResponse`. */
export interface ProviderRunResult {
  session_id: string;
  output: string;
  exit_code: number;
  duration_ms: number;
  [key: string]: unknown;
}
