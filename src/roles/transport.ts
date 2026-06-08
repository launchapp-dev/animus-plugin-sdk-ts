// transport_backend role contract (spec §13).

import type { CallContext, HealthReport } from './context.js';
import type { TransportConfig, TransportInfo, TransportSchema } from '../types/generated/transport.js';

export type { TransportConfig, TransportInfo, TransportSchema } from '../types/generated/transport.js';
export { TransportConfigSchema, TransportInfoSchema, TransportSchemaSchema } from '../types/generated/transport.js';

export interface TransportBackend {
  /** Bind the external listener. Returns `TransportInfo` once ready. */
  start(params: TransportConfig, ctx: CallContext): Promise<TransportInfo> | TransportInfo;
  /** Graceful shutdown; safe to call more than once. */
  shutdown?(ctx: CallContext): Promise<void> | void;
  /** Capability declaration. */
  schema?(ctx: CallContext): Promise<TransportSchema> | TransportSchema;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
