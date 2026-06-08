// durable_store dispatcher (spec §7.7).

import type { DurableStore } from '../roles/durable-store.js';
import {
  BeginWorkflowRunRequestSchema,
  BeginStepRequestSchema,
  CommitStepRequestSchema,
  AbandonStepRequestSchema,
  RecoverInFlightRequestSchema,
  QueryRunRequestSchema,
} from '../roles/durable-store.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, okResponse, validateParams } from './shared.js';

export const DURABLE_STORE_METHODS = {
  begin_workflow_run: 'durable/begin_workflow_run',
  begin_step: 'durable/begin_step',
  commit_step: 'durable/commit_step',
  abandon_step: 'durable/abandon_step',
  recover_in_flight: 'durable/recover_in_flight',
  query_run: 'durable/query_run',
} as const;

export async function dispatchDurableStore(
  id: RpcId,
  frame: RpcRequest,
  impl: DurableStore,
): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  const p = frame.params;
  try {
    switch (method) {
      case DURABLE_STORE_METHODS.begin_workflow_run: {
        const v = validateParams(id, BeginWorkflowRunRequestSchema, p);
        return v.ok ? okResponse(id, await impl.begin_workflow_run(v.value, ctx)) : v.response;
      }
      case DURABLE_STORE_METHODS.begin_step: {
        const v = validateParams(id, BeginStepRequestSchema, p);
        return v.ok ? okResponse(id, await impl.begin_step(v.value, ctx)) : v.response;
      }
      case DURABLE_STORE_METHODS.commit_step: {
        const v = validateParams(id, CommitStepRequestSchema, p);
        return v.ok ? okResponse(id, await impl.commit_step(v.value, ctx)) : v.response;
      }
      case DURABLE_STORE_METHODS.abandon_step: {
        const v = validateParams(id, AbandonStepRequestSchema, p);
        return v.ok ? okResponse(id, await impl.abandon_step(v.value, ctx)) : v.response;
      }
      case DURABLE_STORE_METHODS.recover_in_flight: {
        const v = validateParams(id, RecoverInFlightRequestSchema, p);
        return v.ok ? okResponse(id, await impl.recover_in_flight(v.value, ctx)) : v.response;
      }
      case DURABLE_STORE_METHODS.query_run: {
        const v = validateParams(id, QueryRunRequestSchema, p);
        return v.ok ? okResponse(id, await impl.query_run(v.value, ctx)) : v.response;
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `durable_store error: ${String(err)}`);
  }
}
