// transport_backend dispatcher (spec §13). `transport/start` binds the listener
// (validated against generated `TransportConfig`), `transport/shutdown` drains,
// `transport/schema` declares capabilities.

import type { TransportBackend, TransportSchema } from '../roles/transport.js';
import { TransportConfigSchema } from '../roles/transport.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, okResponse, validateParams } from './shared.js';

export const TRANSPORT_METHODS = {
  start: 'transport/start',
  shutdown: 'transport/shutdown',
  schema: 'transport/schema',
} as const;

function defaultSchema(): TransportSchema {
  return { kinds: [], supports_streaming: false, supports_websocket: false } as TransportSchema;
}

export async function dispatchTransport(
  id: RpcId,
  frame: RpcRequest,
  impl: TransportBackend,
): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  try {
    switch (method) {
      case TRANSPORT_METHODS.start: {
        const v = validateParams(id, TransportConfigSchema, frame.params);
        if (!v.ok) return v.response;
        const out = await impl.start(v.value, ctx);
        return okResponse(id, out);
      }
      case TRANSPORT_METHODS.shutdown: {
        if (impl.shutdown) await impl.shutdown(ctx);
        return okResponse(id, {});
      }
      case TRANSPORT_METHODS.schema: {
        const schema = impl.schema ? await impl.schema(ctx) : defaultSchema();
        return okResponse(id, schema);
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    // Transport errors carry an `error.data.category` per spec §13.4.
    return errorResponse(id, ErrorCode.InternalError, `transport backend error: ${String(err)}`, {
      category: 'other',
    });
  }
}
