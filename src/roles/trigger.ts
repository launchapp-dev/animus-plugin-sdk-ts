// trigger_backend role contract (spec §7.3 / §11).
//
// IMPORTANT: the wire shape of the `trigger/event` notification is the FLAT
// object defined in spec §11.1 — `event_id`, `trigger_id`, `subject_id`,
// `subject_kind`, `action_hint`, `payload` — which is
// `animus-plugin-protocol::TriggerEvent`, NOT the newer
// `animus-trigger-protocol::TriggerEvent` (a different shape the host does not
// decode for this notification). The spec is authoritative ("this document
// wins"), and the 299 published trigger plugins emit the flat shape, so the
// contract uses the plugin-protocol type.

import type { CallContext, HealthReport } from './context.js';
import type { TriggerEvent as WireTriggerEvent } from '../types/generated/plugin.js';
import type { TriggerSchema as WireTriggerSchema } from '../types/generated/trigger.js';

export type { TriggerEvent as WireTriggerEvent } from '../types/generated/plugin.js';
export type { TriggerSchema as WireTriggerSchema } from '../types/generated/trigger.js';
export { TriggerEventSchema as WireTriggerEventSchema } from '../types/generated/plugin.js';
export { TriggerSchemaSchema } from '../types/generated/trigger.js';

/** A trigger event emitted on the wire as flat `params` of `trigger/event`
 *  (spec §11.1). `event_id` is the only required field. */
export interface TriggerEvent extends WireTriggerEvent {
  event_id: string;
}

export type TriggerSchema = WireTriggerSchema;

export interface TriggerBackend {
  /** Long-running event source; emitted as `trigger/event` notifications. */
  watch(
    params: Record<string, unknown>,
    ctx: CallContext,
  ): AsyncIterable<TriggerEvent> | Promise<AsyncIterable<TriggerEvent>>;
  ack?(params: { event_id: string }, ctx: CallContext): Promise<void> | void;
  schema?(ctx: CallContext): Promise<TriggerSchema> | TriggerSchema;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
