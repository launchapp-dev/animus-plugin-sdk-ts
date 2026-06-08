// notifier role contract.
//
// Methods (from animus-notifier-protocol): `notifier/notify` (required),
// `notifier/flush` (optional), `notifier/schema`.

import type { CallContext, HealthReport } from './context.js';
import type {
  NotifierNotifyParams,
  NotifierNotifyResult,
  NotifierFlushParams,
  NotifierFlushResult,
  NotifierSchema,
} from '../types/generated/notifier.js';

export type * from '../types/generated/notifier.js';
export {
  NotifierNotifyParamsSchema,
  NotifierFlushParamsSchema,
} from '../types/generated/notifier.js';

export interface Notifier {
  /** Hand one event to the connector. */
  notify(params: NotifierNotifyParams, ctx: CallContext): Promise<NotifierNotifyResult> | NotifierNotifyResult;
  /** Optional: drain pending notifications. Omit → `-32001`. */
  flush?(params: NotifierFlushParams, ctx: CallContext): Promise<NotifierFlushResult> | NotifierFlushResult;
  /** Capability declaration. */
  schema?(ctx: CallContext): Promise<NotifierSchema> | NotifierSchema;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
