// AUTO-GENERATED FROM schemas/animus-durable-store-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const AbandonStepRequestSchema = z.object({
  "reason": z.string().nullable().optional(),
  "step_id": z.string(),
}).passthrough();
export type AbandonStepRequest = z.infer<typeof AbandonStepRequestSchema>;

export const AbandonStepResponseSchema = z.object({
  "ack": z.boolean(),
}).passthrough();
export type AbandonStepResponse = z.infer<typeof AbandonStepResponseSchema>;

export const BeginStepRequestSchema = z.object({
  "idempotency_key": z.string(),
  "payload": z.unknown().optional(),
  "phase_id": z.string(),
  "reservation_ttl_secs": z.number().int().min(0).nullable().optional(),
  "run_id": z.string(),
  "step_name": z.string(),
}).passthrough();
export type BeginStepRequest = z.infer<typeof BeginStepRequestSchema>;

export const StepErrorSchema = z.object({
  "code": z.string(),
  "details": z.unknown().optional(),
  "message": z.string(),
}).passthrough();
export type StepError = z.infer<typeof StepErrorSchema>;

export const BeginStepResponseSchema = z.object({
  "prior_error": z.union([StepErrorSchema, z.null()]).optional(),
  "prior_output": z.unknown().optional(),
  "reservation_expires_at": z.string().nullable().optional(),
  "status": z.string(),
  "step_id": z.string(),
}).passthrough();
export type BeginStepResponse = z.infer<typeof BeginStepResponseSchema>;

export const BeginWorkflowRunRequestSchema = z.object({
  "inputs": z.unknown().optional(),
  "phase_id": z.string(),
  "run_id": z.string(),
}).passthrough();
export type BeginWorkflowRunRequest = z.infer<typeof BeginWorkflowRunRequestSchema>;

export const BeginWorkflowRunResponseSchema = z.object({
  "epoch": z.number().int().min(0),
}).passthrough();
export type BeginWorkflowRunResponse = z.infer<typeof BeginWorkflowRunResponseSchema>;

export const CommitStepRequestSchema = z.object({
  "error": z.union([StepErrorSchema, z.null()]).optional(),
  "outcome": z.string(),
  "output": z.unknown().optional(),
  "step_id": z.string(),
}).passthrough();
export type CommitStepRequest = z.infer<typeof CommitStepRequestSchema>;

export const CommitStepResponseSchema = z.object({
  "ack": z.boolean(),
}).passthrough();
export type CommitStepResponse = z.infer<typeof CommitStepResponseSchema>;

export const DurableStoreCapabilitiesSchema = z.object({
  "default_reservation_ttl_secs": z.number().int().min(0).optional(),
  "max_payload_bytes": z.number().int().min(0).optional(),
  "supports_recovery": z.boolean().optional(),
}).passthrough();
export type DurableStoreCapabilities = z.infer<typeof DurableStoreCapabilitiesSchema>;

export const InFlightRunSchema = z.object({
  "last_committed_step": z.string().nullable().optional(),
  "phase_id": z.string(),
  "replay_state": z.unknown().optional(),
  "run_id": z.string(),
}).passthrough();
export type InFlightRun = z.infer<typeof InFlightRunSchema>;

export const QueryRunRequestSchema = z.object({
  "phase_id": z.string(),
  "run_id": z.string(),
}).passthrough();
export type QueryRunRequest = z.infer<typeof QueryRunRequestSchema>;

export const StepRecordSchema = z.object({
  "committed_at": z.string(),
  "error": z.union([StepErrorSchema, z.null()]).optional(),
  "idempotency_key": z.string(),
  "outcome": z.string(),
  "output": z.unknown().optional(),
  "step_id": z.string(),
  "step_name": z.string(),
}).passthrough();
export type StepRecord = z.infer<typeof StepRecordSchema>;

export const QueryRunResponseSchema = z.object({
  "phase_id": z.string(),
  "run_id": z.string(),
  "status": z.string(),
  "steps": z.array(StepRecordSchema),
}).passthrough();
export type QueryRunResponse = z.infer<typeof QueryRunResponseSchema>;

export const RecoverInFlightRequestSchema = z.object({
  "since_epoch": z.number().int().min(0),
}).passthrough();
export type RecoverInFlightRequest = z.infer<typeof RecoverInFlightRequestSchema>;

export const RecoverInFlightResponseSchema = z.object({
  "in_flight": z.array(InFlightRunSchema),
}).passthrough();
export type RecoverInFlightResponse = z.infer<typeof RecoverInFlightResponseSchema>;
