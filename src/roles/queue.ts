// queue role contract (spec §7.6, v1.1.0+).

import type { CallContext, HealthReport } from './context.js';
import type {
  QueueEnqueueRequest,
  QueueEnqueueResponse,
  QueueListRequest,
  QueueListResponse,
  QueueLeaseRequest,
  QueueLeaseResponse,
  QueueStats,
  QueueHoldRequest,
  QueueReleaseRequest,
  QueueDropRequest,
  QueueMarkAssignedRequest,
  QueueCompletionRequest,
  QueueMutationResponse,
  QueueReorderRequest,
  QueueReorderResponse,
  QueueReleasePendingParams,
  QueueReleasePendingResponse,
} from '../types/generated/queue.js';

export type * from '../types/generated/queue.js';
export {
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
} from '../types/generated/queue.js';

export interface Queue {
  enqueue(params: QueueEnqueueRequest, ctx: CallContext): Promise<QueueEnqueueResponse> | QueueEnqueueResponse;
  list(params: QueueListRequest, ctx: CallContext): Promise<QueueListResponse> | QueueListResponse;
  lease(params: QueueLeaseRequest, ctx: CallContext): Promise<QueueLeaseResponse> | QueueLeaseResponse;
  stats(params: Record<string, never>, ctx: CallContext): Promise<QueueStats> | QueueStats;
  hold(params: QueueHoldRequest, ctx: CallContext): Promise<QueueMutationResponse> | QueueMutationResponse;
  release(params: QueueReleaseRequest, ctx: CallContext): Promise<QueueMutationResponse> | QueueMutationResponse;
  drop(params: QueueDropRequest, ctx: CallContext): Promise<QueueMutationResponse> | QueueMutationResponse;
  mark_assigned(
    params: QueueMarkAssignedRequest,
    ctx: CallContext,
  ): Promise<QueueMutationResponse> | QueueMutationResponse;
  completion(params: QueueCompletionRequest, ctx: CallContext): Promise<QueueMutationResponse> | QueueMutationResponse;
  reorder(params: QueueReorderRequest, ctx: CallContext): Promise<QueueReorderResponse> | QueueReorderResponse;
  /** Optional `queue/release_pending` (queue-protocol v0.3.0+). Returns a single
   *  Assigned entry to Pending. Omit → `-32001` (`method_not_supported`). */
  release_pending?(
    params: QueueReleasePendingParams,
    ctx: CallContext,
  ): Promise<QueueReleasePendingResponse> | QueueReleasePendingResponse;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
