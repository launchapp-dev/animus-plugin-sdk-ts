// memory_store role contract (spec §7.8, v1.1.0+).

import type { CallContext, HealthReport } from './context.js';
import type {
  PutMemoryRequest,
  PutMemoryResponse,
  GetMemoryRequest,
  GetMemoryResponse,
  QueryMemoryRequest,
  QueryMemoryResponse,
  ListScopesRequest,
  ListScopesResponse,
  DeleteScopeRequest,
  DeleteScopeResponse,
} from '../types/generated/memory-store.js';

export type * from '../types/generated/memory-store.js';
export {
  PutMemoryRequestSchema,
  GetMemoryRequestSchema,
  QueryMemoryRequestSchema,
  ListScopesRequestSchema,
  DeleteScopeRequestSchema,
} from '../types/generated/memory-store.js';

export interface MemoryStore {
  put(params: PutMemoryRequest, ctx: CallContext): Promise<PutMemoryResponse> | PutMemoryResponse;
  get(params: GetMemoryRequest, ctx: CallContext): Promise<GetMemoryResponse> | GetMemoryResponse;
  query(params: QueryMemoryRequest, ctx: CallContext): Promise<QueryMemoryResponse> | QueryMemoryResponse;
  list_scopes(params: ListScopesRequest, ctx: CallContext): Promise<ListScopesResponse> | ListScopesResponse;
  delete_scope(params: DeleteScopeRequest, ctx: CallContext): Promise<DeleteScopeResponse> | DeleteScopeResponse;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
