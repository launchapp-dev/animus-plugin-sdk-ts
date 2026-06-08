// queue dispatcher (spec §7.6). All methods validate against generated request
// schemas and route to the impl.

import type { Queue } from '../roles/queue.js';
import {
  QueueEnqueueRequestSchema,
  QueueListRequestSchema,
  QueueLeaseRequestSchema,
  QueueHoldRequestSchema,
  QueueReleaseRequestSchema,
  QueueDropRequestSchema,
  QueueMarkAssignedRequestSchema,
  QueueCompletionRequestSchema,
  QueueReorderRequestSchema,
  QueueReleasePendingParamsSchema,
} from '../roles/queue.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, methodNotSupported, okResponse, validateParams } from './shared.js';

// Required queue methods (advertised unconditionally; validateSpec enforces the
// impl provides them). `release_pending` is optional and advertised separately.
export const QUEUE_METHODS = {
  enqueue: 'queue/enqueue',
  list: 'queue/list',
  lease: 'queue/lease',
  stats: 'queue/stats',
  hold: 'queue/hold',
  release: 'queue/release',
  drop: 'queue/drop',
  mark_assigned: 'queue/mark_assigned',
  completion: 'queue/completion',
  reorder: 'queue/reorder',
} as const;

export const QUEUE_RELEASE_PENDING = 'queue/release_pending';

export async function dispatchQueue(id: RpcId, frame: RpcRequest, impl: Queue): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  const p = frame.params;
  try {
    switch (method) {
      case QUEUE_METHODS.enqueue: {
        const v = validateParams(id, QueueEnqueueRequestSchema, p);
        return v.ok ? okResponse(id, await impl.enqueue(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.list: {
        const v = validateParams(id, QueueListRequestSchema, p);
        return v.ok ? okResponse(id, await impl.list(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.lease: {
        const v = validateParams(id, QueueLeaseRequestSchema, p);
        return v.ok ? okResponse(id, await impl.lease(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.stats:
        return okResponse(id, await impl.stats({}, ctx));
      case QUEUE_METHODS.hold: {
        const v = validateParams(id, QueueHoldRequestSchema, p);
        return v.ok ? okResponse(id, await impl.hold(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.release: {
        const v = validateParams(id, QueueReleaseRequestSchema, p);
        return v.ok ? okResponse(id, await impl.release(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.drop: {
        const v = validateParams(id, QueueDropRequestSchema, p);
        return v.ok ? okResponse(id, await impl.drop(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.mark_assigned: {
        const v = validateParams(id, QueueMarkAssignedRequestSchema, p);
        return v.ok ? okResponse(id, await impl.mark_assigned(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.completion: {
        const v = validateParams(id, QueueCompletionRequestSchema, p);
        return v.ok ? okResponse(id, await impl.completion(v.value, ctx)) : v.response;
      }
      case QUEUE_METHODS.reorder: {
        const v = validateParams(id, QueueReorderRequestSchema, p);
        return v.ok ? okResponse(id, await impl.reorder(v.value, ctx)) : v.response;
      }
      case QUEUE_RELEASE_PENDING: {
        if (!impl.release_pending) return methodNotSupported(id, method);
        const v = validateParams(id, QueueReleasePendingParamsSchema, p);
        return v.ok ? okResponse(id, await impl.release_pending(v.value, ctx)) : v.response;
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `queue error: ${String(err)}`);
  }
}
