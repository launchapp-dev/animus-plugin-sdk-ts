// AUTO-GENERATED FROM schemas/animus-execution-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

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
