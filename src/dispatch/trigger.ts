// trigger_backend dispatcher. Ports the existing `trigger/watch` async-iterator
// → `trigger/event` notification behavior, `trigger/schema`, and optional
// `trigger/ack` verbatim. The flat `trigger/event` params shape (spec §11.1) is
// preserved exactly — no `{ id, event }` wrapper.

import type { TriggerBackend, TriggerEvent, TriggerSchema } from '../roles/trigger.js';
import { ErrorCode, type PluginCapabilities, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, okResponse, type Wire } from './shared.js';

export function deriveTriggerCapabilities(impl: TriggerBackend, extra: string[]): PluginCapabilities {
  const methods = ['trigger/watch', 'trigger/schema', 'health/check'];
  if (impl.ack) methods.push('trigger/ack');
  for (const c of extra) methods.push(c);
  return { methods, streaming: true, progress: false, cancellation: false };
}

function defaultTriggerSchema(impl: TriggerBackend): TriggerSchema {
  return {
    kinds: [],
    supports_resume: false,
    supports_dedup: false,
    supports_ack: typeof impl.ack === 'function',
  };
}

function ensureWireTriggerEvent(event: TriggerEvent): TriggerEvent {
  // Flat params shape; default the optionals the author left unset.
  const defaults = {
    trigger_id: null,
    subject_id: null,
    subject_kind: null,
    action_hint: null,
    payload: null,
  };
  return { ...defaults, ...event };
}

export async function dispatchTrigger(
  id: RpcId,
  frame: RpcRequest,
  wire: Wire,
  impl: TriggerBackend,
): Promise<RpcResponse> {
  const method = frame.method;
  const rawParams = (frame.params ?? {}) as Record<string, unknown>;
  const ctx = { request_id: id };
  try {
    switch (method) {
      case 'trigger/schema': {
        const schema = impl.schema ? await impl.schema(ctx) : defaultTriggerSchema(impl);
        return okResponse(id, schema);
      }
      case 'trigger/watch': {
        const stream = await impl.watch(rawParams, ctx);
        void (async () => {
          try {
            for await (const event of stream) {
              await wire.notify('trigger/event', ensureWireTriggerEvent(event));
            }
          } catch (err) {
            await wire.notify('trigger/event', {
              error: { code: ErrorCode.InternalError, message: `trigger stream error: ${String(err)}` },
            });
          }
        })();
        return okResponse(id, { watching: true });
      }
      case 'trigger/ack': {
        if (!impl.ack) {
          return errorResponse(id, ErrorCode.MethodNotSupported, `method '${method}' not supported`, {
            category: 'not_supported',
          });
        }
        const eventId = rawParams.event_id;
        if (typeof eventId !== 'string' || eventId.length === 0) {
          return errorResponse(id, ErrorCode.InvalidParams, 'trigger/ack requires string event_id');
        }
        await impl.ack({ event_id: eventId }, ctx);
        return okResponse(id, { event_id: eventId, acked: true });
      }
      default:
        return errorResponse(id, ErrorCode.MethodNotFound, `unknown method '${method}'`);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `trigger backend error: ${String(err)}`);
  }
}
