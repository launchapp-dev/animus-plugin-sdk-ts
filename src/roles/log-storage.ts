// log_storage_backend role contract (spec §7.4 / §12).

import type { CallContext, HealthReport } from './context.js';
import type {
  LogEntry,
  LogQuery,
  LogQueryResult,
  LogStorageSchema,
} from '../types/generated/log-storage.js';

export type {
  LogEntry,
  LogQuery,
  LogQueryResult,
  LogStorageSchema,
  LogLevel,
  LogSource,
  SupportsFiltering,
} from '../types/generated/log-storage.js';
export {
  LogEntrySchema,
  LogQuerySchema,
  LogQueryResultSchema,
} from '../types/generated/log-storage.js';

/** Streaming sink for `log_storage/tail`: each `entry()` emits a
 *  `log_storage/event` notification echoing the originating request id. */
export interface LogTailStream {
  entry(e: LogEntry): Promise<void>;
}

export interface LogStorageBackend {
  /** Persist a batch of entries. Result: `{ stored: <count> }`. */
  store(params: { entries: LogEntry[] }, ctx: CallContext): Promise<{ stored: number }> | { stored: number };
  /** Optional historical query. Omit → `-32001` (`method_not_supported`). */
  query?(params: LogQuery, ctx: CallContext): Promise<LogQueryResult> | LogQueryResult;
  /**
   * Optional streaming tail. The SDK acks immediately with `{ tailing: true }`,
   * then drains the async iterable into `log_storage/event` notifications.
   * Omit → `-32001` (`method_not_supported`).
   */
  tail?(params: LogQuery, ctx: CallContext): AsyncIterable<LogEntry> | Promise<AsyncIterable<LogEntry>>;
  /** Capability declaration. Derived to a sane default when omitted. */
  schema?(ctx: CallContext): Promise<LogStorageSchema> | LogStorageSchema;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
