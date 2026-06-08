// memory_store dispatcher (spec §7.8).

import type { MemoryStore } from '../roles/memory-store.js';
import {
  PutMemoryRequestSchema,
  GetMemoryRequestSchema,
  QueryMemoryRequestSchema,
  ListScopesRequestSchema,
  DeleteScopeRequestSchema,
} from '../roles/memory-store.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, okResponse, validateParams } from './shared.js';

export const MEMORY_STORE_METHODS = {
  put: 'memory/put',
  get: 'memory/get',
  query: 'memory/query',
  list_scopes: 'memory/list_scopes',
  delete_scope: 'memory/delete_scope',
} as const;

export async function dispatchMemoryStore(
  id: RpcId,
  frame: RpcRequest,
  impl: MemoryStore,
): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  const p = frame.params;
  try {
    switch (method) {
      case MEMORY_STORE_METHODS.put: {
        const v = validateParams(id, PutMemoryRequestSchema, p);
        return v.ok ? okResponse(id, await impl.put(v.value, ctx)) : v.response;
      }
      case MEMORY_STORE_METHODS.get: {
        const v = validateParams(id, GetMemoryRequestSchema, p);
        return v.ok ? okResponse(id, await impl.get(v.value, ctx)) : v.response;
      }
      case MEMORY_STORE_METHODS.query: {
        const v = validateParams(id, QueryMemoryRequestSchema, p);
        return v.ok ? okResponse(id, await impl.query(v.value, ctx)) : v.response;
      }
      case MEMORY_STORE_METHODS.list_scopes: {
        const v = validateParams(id, ListScopesRequestSchema, p);
        return v.ok ? okResponse(id, await impl.list_scopes(v.value, ctx)) : v.response;
      }
      case MEMORY_STORE_METHODS.delete_scope: {
        const v = validateParams(id, DeleteScopeRequestSchema, p);
        return v.ok ? okResponse(id, await impl.delete_scope(v.value, ctx)) : v.response;
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `memory_store error: ${String(err)}`);
  }
}
