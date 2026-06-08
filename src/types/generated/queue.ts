// AUTO-GENERATED FROM schemas/animus-queue-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const QueueCapabilitiesSchema = z.object({
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

export const QueueDropRequestSchema = z.object({
  "entry_id": z.string(),
}).passthrough();
export type QueueDropRequest = z.infer<typeof QueueDropRequestSchema>;

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
  "input": z.unknown().optional(),
  "priority": z.string().nullable().optional(),
  "requested_at": z.string().datetime({ offset: true }),
  "subject": SubjectRefSchema,
  "trigger_source": z.string(),
  "vars": z.record(z.string(), z.string()).optional(),
  "workflow_ref": z.string(),
}).passthrough();
export type SubjectDispatch = z.infer<typeof SubjectDispatchSchema>;

export const QueueEnqueueRequestSchema = z.object({
  "subject_dispatch": SubjectDispatchSchema,
}).passthrough();
export type QueueEnqueueRequest = z.infer<typeof QueueEnqueueRequestSchema>;

export const QueueEnqueueResponseSchema = z.object({
  "enqueued": z.boolean(),
  "entry_id": z.string(),
  "subject_id": z.string(),
}).passthrough();
export type QueueEnqueueResponse = z.infer<typeof QueueEnqueueResponseSchema>;

export const QueueEntrySchema = z.object({
  "assigned_at": z.string().nullable().optional(),
  "enqueued_at": z.string(),
  "entry_id": z.string(),
  "held_at": z.string().nullable().optional(),
  "status": z.string(),
  "subject_dispatch": SubjectDispatchSchema,
  "subject_id": z.string(),
  "task_id": z.string().nullable().optional(),
  "workflow_id": z.string().nullable().optional(),
}).passthrough();
export type QueueEntry = z.infer<typeof QueueEntrySchema>;

export const QueueHoldRequestSchema = z.object({
  "entry_id": z.string(),
  "reason": z.string().nullable().optional(),
}).passthrough();
export type QueueHoldRequest = z.infer<typeof QueueHoldRequestSchema>;

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

export const QueueListRequestSchema = z.object({
  "limit": z.number().int().min(0).nullable().optional(),
  "offset": z.number().int().min(0).nullable().optional(),
  "status": z.array(z.string()).optional(),
}).passthrough();
export type QueueListRequest = z.infer<typeof QueueListRequestSchema>;

export const QueueStatsSchema = z.object({
  "assigned": z.number().int().min(0),
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
