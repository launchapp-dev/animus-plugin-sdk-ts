// AUTO-GENERATED FROM schemas/animus-queue-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const ActorSchema = z.object({
  "claims": z.array(z.string()).optional(),
  "tenant_id": z.string().nullable().optional(),
  "user_id": z.string(),
}).passthrough();
export type Actor = z.infer<typeof ActorSchema>;

export const QueueLeaseFenceSchema = z.object({
  "entry_id": z.string(),
  "expires_at": z.string().datetime({ offset: true }),
  "generation": z.number().int().min(0),
  "owner_id": z.string(),
}).strict();
export type QueueLeaseFence = z.infer<typeof QueueLeaseFenceSchema>;

export const RepositoryReservationSchema = z.object({
  "base_ref": z.string(),
  "head_ref": z.string(),
  "repository": z.string(),
}).strict();
export type RepositoryReservation = z.infer<typeof RepositoryReservationSchema>;

export const SubjectGenerationSchema = z.object({
  "generation": z.number().int().min(0),
  "qualified_id": z.string(),
}).strict();
export type SubjectGeneration = z.infer<typeof SubjectGenerationSchema>;

export const ExecutionFenceSchema = z.object({
  "queue_lease": z.union([QueueLeaseFenceSchema, z.null()]).optional(),
  "repository": z.union([RepositoryReservationSchema, z.null()]).optional(),
  "schema": z.string(),
  "subject": z.union([SubjectGenerationSchema, z.null()]).optional(),
  "version": z.number().int().min(0),
  "workflow_generation": z.number().int().min(0),
  "workflow_id": z.string(),
}).strict();
export type ExecutionFence = z.infer<typeof ExecutionFenceSchema>;

export const SubjectRefSchema = z.object({
  "description": z.string().nullable().optional(),
  "id": z.string(),
  "kind": z.string(),
  "labels": z.array(z.string()).optional(),
  "metadata": z.unknown().optional(),
  "title": z.string().nullable().optional(),
}).passthrough();
export type SubjectRef = z.infer<typeof SubjectRefSchema>;

export const SubjectDispatchSchema = z.object({
  "actor": z.union([ActorSchema, z.null()]).optional(),
  "input": z.unknown().optional(),
  "priority": z.string().nullable().optional(),
  "requested_at": z.string().datetime({ offset: true }),
  "subject": z.union([SubjectRefSchema, z.null()]).optional(),
  "trigger_source": z.string(),
  "vars": z.record(z.string(), z.string()).optional(),
  "workflow_ref": z.string(),
}).passthrough();
export type SubjectDispatch = z.infer<typeof SubjectDispatchSchema>;

export const QueueEntrySchema = z.object({
  "assigned_at": z.string().nullable().optional(),
  "enqueued_at": z.string(),
  "entry_id": z.string(),
  "expire_after_secs": z.number().int().min(0).nullable().optional(),
  "held_at": z.string().nullable().optional(),
  "run_at": z.string().nullable().optional(),
  "status": z.string(),
  "subject_dispatch": SubjectDispatchSchema,
  "subject_id": z.string(),
  "task_id": z.string().nullable().optional(),
  "workflow_id": z.string().nullable().optional(),
}).passthrough();
export type QueueEntry = z.infer<typeof QueueEntrySchema>;

export const FencedQueueEntrySchema = z.object({
  "entry": QueueEntrySchema,
  "execution": ExecutionFenceSchema,
}).strict();
export type FencedQueueEntry = z.infer<typeof FencedQueueEntrySchema>;

export const QueueCapabilitiesSchema = z.object({
  "generation_fenced_leases_v1": z.boolean().optional(),
  "max_lease_batch": z.number().int().min(0).optional(),
  "priority_weighted": z.boolean().optional(),
}).passthrough();
export type QueueCapabilities = z.infer<typeof QueueCapabilitiesSchema>;

export const QueueCompletionRequestSchema = z.object({
  "entry_id": z.string(),
  "status": z.string(),
  "workflow_id": z.string().nullable().optional(),
  "workflow_ref": z.string().nullable().optional(),
}).passthrough();
export type QueueCompletionRequest = z.infer<typeof QueueCompletionRequestSchema>;

export const QueueCompletionV2RequestSchema = z.object({
  "execution": ExecutionFenceSchema,
  "status": z.string(),
  "workflow_ref": z.string().nullable().optional(),
}).strict();
export type QueueCompletionV2Request = z.infer<typeof QueueCompletionV2RequestSchema>;

export const QueueDropRequestSchema = z.object({
  "entry_id": z.string(),
}).passthrough();
export type QueueDropRequest = z.infer<typeof QueueDropRequestSchema>;

export const QueueEnqueueRequestSchema = z.object({
  "expire_after_secs": z.number().int().min(0).nullable().optional(),
  "run_at": z.string().nullable().optional(),
  "subject_dispatch": SubjectDispatchSchema,
}).passthrough();
export type QueueEnqueueRequest = z.infer<typeof QueueEnqueueRequestSchema>;

export const QueueEnqueueResponseSchema = z.object({
  "enqueued": z.boolean(),
  "entry_id": z.string(),
  "subject_id": z.string(),
  "warning": z.string().nullable().optional(),
}).passthrough();
export type QueueEnqueueResponse = z.infer<typeof QueueEnqueueResponseSchema>;

export const QueueEnqueueV2RequestSchema = z.object({
  "expire_after_secs": z.number().int().min(0).nullable().optional(),
  "idempotency_key": z.string().nullable().optional(),
  "repository": z.union([RepositoryReservationSchema, z.null()]).optional(),
  "run_at": z.string().nullable().optional(),
  "subject_dispatch": SubjectDispatchSchema,
}).strict();
export type QueueEnqueueV2Request = z.infer<typeof QueueEnqueueV2RequestSchema>;

export const QueueEnqueueV2ResponseSchema = z.object({
  "enqueued": z.boolean(),
  "entry_id": z.string(),
  "subject": SubjectGenerationSchema,
  "warning": z.string().nullable().optional(),
}).strict();
export type QueueEnqueueV2Response = z.infer<typeof QueueEnqueueV2ResponseSchema>;

export const QueueHoldRequestSchema = z.object({
  "entry_id": z.string(),
  "reason": z.string().nullable().optional(),
}).passthrough();
export type QueueHoldRequest = z.infer<typeof QueueHoldRequestSchema>;

export const QueueLeaseBlockReasonSchema = z.enum(["subject_generation_active", "repository_ref_collision", "expired_lease_recovery_required", "missing_execution_identity"]);
export type QueueLeaseBlockReason = z.infer<typeof QueueLeaseBlockReasonSchema>;

export const QueueLeaseBlockSchema = z.object({
  "conflicts_with": z.union([ExecutionFenceSchema, z.null()]).optional(),
  "entry_id": z.string(),
  "reason": QueueLeaseBlockReasonSchema,
}).strict();
export type QueueLeaseBlock = z.infer<typeof QueueLeaseBlockSchema>;

export const QueueLeaseMutationOutcomeSchema = z.enum(["applied", "already_applied", "not_found", "stale_fence", "lease_still_live", "not_assigned"]);
export type QueueLeaseMutationOutcome = z.infer<typeof QueueLeaseMutationOutcomeSchema>;

export const QueueLeaseMutationResponseSchema = z.object({
  "execution": z.union([ExecutionFenceSchema, z.null()]).optional(),
  "outcome": QueueLeaseMutationOutcomeSchema,
  "reason": z.string().nullable().optional(),
}).strict();
export type QueueLeaseMutationResponse = z.infer<typeof QueueLeaseMutationResponseSchema>;

export const QueueLeaseRecoverRequestSchema = z.object({
  "execution": ExecutionFenceSchema,
  "new_owner_id": z.string(),
  "ttl_secs": z.number().int().min(0).nullable().optional(),
}).strict();
export type QueueLeaseRecoverRequest = z.infer<typeof QueueLeaseRecoverRequestSchema>;

export const QueueLeaseRenewRequestSchema = z.object({
  "execution": ExecutionFenceSchema,
  "ttl_secs": z.number().int().min(0).nullable().optional(),
}).strict();
export type QueueLeaseRenewRequest = z.infer<typeof QueueLeaseRenewRequestSchema>;

export const SubjectIdSchema = z.string();
export type SubjectId = z.infer<typeof SubjectIdSchema>;

export const QueueLeaseRequestSchema = z.object({
  "exclude_subjects": z.array(SubjectIdSchema).nullable().optional(),
  "max": z.number().int().min(0),
  "workflow_ids": z.array(z.string()).nullable().optional(),
}).passthrough();
export type QueueLeaseRequest = z.infer<typeof QueueLeaseRequestSchema>;

export const QueueLeaseResponseSchema = z.object({
  "leased": z.array(QueueEntrySchema),
}).passthrough();
export type QueueLeaseResponse = z.infer<typeof QueueLeaseResponseSchema>;

export const QueueLeaseV2RequestSchema = z.object({
  "exclude": z.array(ExecutionFenceSchema).optional(),
  "max": z.number().int().min(0),
  "owner_id": z.string(),
  "workflow_ids": z.array(z.string()),
}).strict();
export type QueueLeaseV2Request = z.infer<typeof QueueLeaseV2RequestSchema>;

export const QueueLeaseV2ResponseSchema = z.object({
  "blocked": z.array(QueueLeaseBlockSchema).optional(),
  "leased": z.array(FencedQueueEntrySchema),
}).strict();
export type QueueLeaseV2Response = z.infer<typeof QueueLeaseV2ResponseSchema>;

export const QueueListRequestSchema = z.object({
  "limit": z.number().int().min(0).nullable().optional(),
  "offset": z.number().int().min(0).nullable().optional(),
  "status": z.array(z.string()).optional(),
}).passthrough();
export type QueueListRequest = z.infer<typeof QueueListRequestSchema>;

export const QueueStatsSchema = z.object({
  "assigned": z.number().int().min(0),
  "deferred": z.number().int().min(0).optional(),
  "held": z.number().int().min(0),
  "pending": z.number().int().min(0),
  "total": z.number().int().min(0),
}).passthrough();
export type QueueStats = z.infer<typeof QueueStatsSchema>;

export const QueueListResponseSchema = z.object({
  "entries": z.array(QueueEntrySchema),
  "stats": QueueStatsSchema,
  "total": z.number().int().min(0),
}).passthrough();
export type QueueListResponse = z.infer<typeof QueueListResponseSchema>;

export const QueueMarkAssignedRequestSchema = z.object({
  "entry_id": z.string(),
  "workflow_id": z.string().nullable().optional(),
}).passthrough();
export type QueueMarkAssignedRequest = z.infer<typeof QueueMarkAssignedRequestSchema>;

export const QueueMutationResponseSchema = z.object({
  "changed": z.boolean(),
  "not_found": z.boolean().optional(),
}).passthrough();
export type QueueMutationResponse = z.infer<typeof QueueMutationResponseSchema>;

export const QueueNextDeadlineResponseSchema = z.object({
  "next_run_at": z.string().nullable().optional(),
}).passthrough();
export type QueueNextDeadlineResponse = z.infer<typeof QueueNextDeadlineResponseSchema>;

export const QueueReleasePendingParamsSchema = z.object({
  "entry_id": z.string(),
  "reason": z.string(),
}).passthrough();
export type QueueReleasePendingParams = z.infer<typeof QueueReleasePendingParamsSchema>;

export const QueueReleasePendingResponseSchema = z.object({
  "entry_id": z.string(),
  "status": z.string(),
}).passthrough();
export type QueueReleasePendingResponse = z.infer<typeof QueueReleasePendingResponseSchema>;

export const QueueReleasePendingV2RequestSchema = z.object({
  "execution": ExecutionFenceSchema,
  "reason": z.string(),
}).strict();
export type QueueReleasePendingV2Request = z.infer<typeof QueueReleasePendingV2RequestSchema>;

export const QueueReleaseRequestSchema = z.object({
  "entry_id": z.string(),
}).passthrough();
export type QueueReleaseRequest = z.infer<typeof QueueReleaseRequestSchema>;

export const QueueReorderRequestSchema = z.object({
  "entry_ids": z.array(z.string()),
}).passthrough();
export type QueueReorderRequest = z.infer<typeof QueueReorderRequestSchema>;

export const QueueReorderResponseSchema = z.object({
  "reordered_count": z.number().int().min(0),
}).passthrough();
export type QueueReorderResponse = z.infer<typeof QueueReorderResponseSchema>;
