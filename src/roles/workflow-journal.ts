// workflow_journal role contract (v0.7).
//
// A workflow_journal plugin is the durable store for workflow run state,
// checkpoints, and lifecycle events (the pluginized SQLite run journal).
// Reference impl: `animus-journal-postgres`. `workflow_journal` is a first-class
// `PluginKind` in `animus-plugin-protocol` (v0.6.15 foundation).
//
// NOTE: `animus-journal-protocol` does not vendor a JSON Schema bundle, so these
// types are HAND-MAINTAINED against the Rust crate (v0.7.0-rc.2). Regenerate the
// other roles via `pnpm run codegen`; keep this file in sync with the crate by
// hand until a schema bundle is vendored.

import type { CallContext, HealthReport } from './context.js';

/** JSON-RPC method names for the workflow_journal role (Rust `METHOD_JOURNAL_*`). */
export const WORKFLOW_JOURNAL_METHODS = {
  save: 'journal/save',
  load: 'journal/load',
  list: 'journal/list',
  query_ids: 'journal/query_ids',
  delete: 'journal/delete',
  checkpoint_save: 'journal/checkpoint_save',
  checkpoint_load: 'journal/checkpoint_load',
  checkpoint_list: 'journal/checkpoint_list',
  checkpoint_prune: 'journal/checkpoint_prune',
  record: 'journal/record',
  events: 'journal/events',
  schema: 'journal/schema',
} as const;

/** One persisted workflow run. `blob` is the kernel's opaque serialized run
 *  state; the backend stores `status` verbatim for filtering. */
export interface JournalRun {
  workflow_id: string;
  workflow_ref?: string;
  status: string;
  kind?: string;
  blob: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface SaveParams {
  run: JournalRun;
}
export interface WorkflowIdParams {
  workflow_id: string;
}
export interface LoadResult {
  run: JournalRun | null;
}
export interface JournalQuery {
  status?: string[];
  workflow_ref?: string;
  updated_since?: string;
  limit?: number;
}
export interface ListResult {
  runs: JournalRun[];
  truncated?: boolean;
}
export interface QueryIdsResult {
  ids: string[];
  truncated?: boolean;
}
export interface CheckpointSaveParams {
  workflow_id: string;
  checkpoint_num: number;
  blob: unknown;
}
export interface CheckpointLoadParams {
  workflow_id: string;
  checkpoint_num: number;
}
export interface CheckpointLoadResult {
  blob: unknown | null;
}
export interface CheckpointListResult {
  checkpoint_nums: number[];
}
export interface CheckpointPruneParams {
  workflow_id: string;
  keep: number;
}
export type JournalEventKind =
  | 'run_started'
  | 'phase_started'
  | 'phase_completed'
  | 'run_completed'
  | 'run_failed';
export interface JournalEvent {
  run_id: string;
  workflow_ref?: string;
  kind: JournalEventKind;
  phase?: string;
  agent?: string;
  status?: string;
  ts: string;
  detail?: unknown;
}
export interface RecordParams {
  event: JournalEvent;
}
export interface EventQuery {
  run_id?: string;
  since?: string;
  limit?: number;
}
export interface EventsResult {
  events: JournalEvent[];
  truncated?: boolean;
}
/** Capability declaration returned by `journal/schema`. */
export interface JournalSchema {
  supports_checkpoints: boolean;
  supports_events: boolean;
  supports_filtering: boolean;
}

export interface WorkflowJournal {
  save(params: SaveParams, ctx: CallContext): Promise<void> | void;
  load(params: WorkflowIdParams, ctx: CallContext): Promise<LoadResult> | LoadResult;
  list(params: JournalQuery, ctx: CallContext): Promise<ListResult> | ListResult;
  query_ids(params: JournalQuery, ctx: CallContext): Promise<QueryIdsResult> | QueryIdsResult;
  delete(params: WorkflowIdParams, ctx: CallContext): Promise<void> | void;
  checkpoint_save?(params: CheckpointSaveParams, ctx: CallContext): Promise<void> | void;
  checkpoint_load?(params: CheckpointLoadParams, ctx: CallContext): Promise<CheckpointLoadResult> | CheckpointLoadResult;
  checkpoint_list?(params: WorkflowIdParams, ctx: CallContext): Promise<CheckpointListResult> | CheckpointListResult;
  checkpoint_prune?(params: CheckpointPruneParams, ctx: CallContext): Promise<void> | void;
  record?(params: RecordParams, ctx: CallContext): Promise<void> | void;
  events?(params: EventQuery, ctx: CallContext): Promise<EventsResult> | EventsResult;
  schema?(ctx: CallContext): Promise<JournalSchema> | JournalSchema;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
