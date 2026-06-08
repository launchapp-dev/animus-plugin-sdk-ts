// notifier dispatcher. `notifier/notify` (required), optional `notifier/flush`
// (→ -32001 when absent), and `notifier/schema`.

import type { Notifier, NotifierSchema } from '../roles/notifier.js';
import { NotifierNotifyParamsSchema, NotifierFlushParamsSchema } from '../roles/notifier.js';
import { ErrorCode, type PluginCapabilities, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, methodNotSupported, okResponse, validateParams } from './shared.js';

export const NOTIFIER_METHODS = {
  notify: 'notifier/notify',
  flush: 'notifier/flush',
  schema: 'notifier/schema',
} as const;

export function deriveNotifierCapabilities(impl: Notifier): PluginCapabilities {
  const methods = [NOTIFIER_METHODS.notify, NOTIFIER_METHODS.schema, 'health/check'];
  if (impl.flush) methods.push(NOTIFIER_METHODS.flush);
  return { methods, streaming: false, progress: false, cancellation: false };
}

function defaultSchema(impl: Notifier): NotifierSchema {
  return { connector_kinds: [], supports_flush: typeof impl.flush === 'function' } as NotifierSchema;
}

export async function dispatchNotifier(id: RpcId, frame: RpcRequest, impl: Notifier): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  try {
    switch (method) {
      case NOTIFIER_METHODS.notify: {
        const v = validateParams(id, NotifierNotifyParamsSchema, frame.params);
        return v.ok ? okResponse(id, await impl.notify(v.value, ctx)) : v.response;
      }
      case NOTIFIER_METHODS.flush: {
        if (!impl.flush) return methodNotSupported(id, method);
        const v = validateParams(id, NotifierFlushParamsSchema, frame.params);
        return v.ok ? okResponse(id, await impl.flush(v.value, ctx)) : v.response;
      }
      case NOTIFIER_METHODS.schema: {
        const schema = impl.schema ? await impl.schema(ctx) : defaultSchema(impl);
        return okResponse(id, schema);
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `notifier error: ${String(err)}`);
  }
}
