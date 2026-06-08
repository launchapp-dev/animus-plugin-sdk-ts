// log_storage_backend dispatcher (spec §7.4). `log_storage/store` persists a
// batch; optional `log_storage/query` and streaming `log_storage/tail`
// (→ `log_storage/event` notifications echoing the request id) return
// `-32001` when not implemented; `log_storage/schema` declares capabilities.

import { z } from 'zod';

import type { LogStorageBackend, LogStorageSchema } from '../roles/log-storage.js';
import { LogQuerySchema, LogEntrySchema } from '../roles/log-storage.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, methodNotSupported, okResponse, validateParams, type Wire } from './shared.js';

const StoreParamsSchema = z.object({ entries: z.array(LogEntrySchema) });

export const LOG_STORAGE_METHODS = {
  store: 'log_storage/store',
  query: 'log_storage/query',
  tail: 'log_storage/tail',
  schema: 'log_storage/schema',
} as const;

function defaultSchema(impl: LogStorageBackend): LogStorageSchema {
  return {
    supports_query: typeof impl.query === 'function',
    supports_tail: typeof impl.tail === 'function',
    supports_dedup: false,
    supports_filtering: {
      by_level: false,
      by_source: false,
      by_target: false,
      by_time_range: false,
      by_glob: false,
    },
  } as LogStorageSchema;
}

export async function dispatchLogStorage(
  id: RpcId,
  frame: RpcRequest,
  wire: Wire,
  impl: LogStorageBackend,
): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  const raw = (frame.params ?? {}) as Record<string, unknown>;
  try {
    switch (method) {
      case LOG_STORAGE_METHODS.store: {
        const v = validateParams(id, StoreParamsSchema, raw);
        if (!v.ok) return v.response;
        const out = await impl.store(v.value, ctx);
        return okResponse(id, out);
      }
      case LOG_STORAGE_METHODS.query: {
        if (!impl.query) return methodNotSupported(id, method);
        const v = validateParams(id, LogQuerySchema, raw);
        if (!v.ok) return v.response;
        const out = await impl.query(v.value, ctx);
        return okResponse(id, out);
      }
      case LOG_STORAGE_METHODS.tail: {
        if (!impl.tail) return methodNotSupported(id, method);
        const v = validateParams(id, LogQuerySchema, raw);
        if (!v.ok) return v.response;
        const stream = await impl.tail(v.value, ctx);
        void (async () => {
          try {
            for await (const entry of stream) {
              await wire.notify('log_storage/event', { id, entry });
            }
          } catch (err) {
            await wire.notify('log_storage/event', {
              id,
              error: { code: ErrorCode.InternalError, message: `log tail error: ${String(err)}` },
            });
          }
        })();
        return okResponse(id, { tailing: true });
      }
      case LOG_STORAGE_METHODS.schema: {
        const schema = impl.schema ? await impl.schema(ctx) : defaultSchema(impl);
        return okResponse(id, schema);
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `log_storage backend error: ${String(err)}`);
  }
}
