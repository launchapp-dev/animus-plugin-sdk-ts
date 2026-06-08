// AUTO-GENERATED FROM schemas/animus-workflow-runner-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const PhaseEventSchema = z.union([z.object({
  "attempt": z.number().int().min(0),
  "kind": z.literal("started"),
  "phase_id": z.string(),
  "ts": z.string(),
}).passthrough(), z.object({
  "confidence": z.number().nullable().optional(),
  "kind": z.literal("decision"),
  "phase_id": z.string(),
  "ts": z.string(),
  "verdict": z.string(),
}).passthrough(), z.object({
  "kind": z.literal("completed"),
  "phase_id": z.string(),
  "status": z.string(),
  "ts": z.string(),
}).passthrough()]);
export type PhaseEvent = z.infer<typeof PhaseEventSchema>;

export const PhaseResultSnapshotSchema = z.object({
  "close_reason": z.string().nullable().optional(),
  "duration_secs": z.number().int().min(0),
  "metadata": z.unknown(),
  "next_phase_id": z.string().nullable().optional(),
  "outcome": z.unknown(),
  "phase_id": z.string(),
  "status": z.string(),
}).passthrough();
export type PhaseResultSnapshot = z.infer<typeof PhaseResultSnapshotSchema>;

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

export const WorkflowExecuteRequestSchema = z.object({
  "description": z.string().nullable().optional(),
  "input": z.unknown().optional(),
  "mcp_config": z.unknown().optional(),
  "model": z.string().nullable().optional(),
  "phase_filter": z.string().nullable().optional(),
  "phase_routing": z.unknown().optional(),
  "phase_timeout_secs": z.number().int().min(0).nullable().optional(),
  "requirement_id": z.string().nullable().optional(),
  "subject_dispatch": z.union([SubjectDispatchSchema, z.null()]).optional(),
  "subject_ref": z.union([SubjectRefSchema, z.null()]).optional(),
  "task_id": z.string().nullable().optional(),
  "title": z.string().nullable().optional(),
  "tool": z.string().nullable().optional(),
  "vars": z.record(z.string(), z.string()).optional(),
  "workflow_id": z.string().nullable().optional(),
  "workflow_ref": z.string().nullable().optional(),
}).passthrough();
export type WorkflowExecuteRequest = z.infer<typeof WorkflowExecuteRequestSchema>;

export const WorkflowExecuteResultSchema = z.object({
  "execution_cwd": z.string(),
  "phase_events": z.array(PhaseEventSchema).optional(),
  "phase_results": z.array(PhaseResultSnapshotSchema),
  "phases_completed": z.number().int().min(0),
  "phases_requested": z.array(z.string()),
  "phases_total": z.number().int().min(0),
  "post_success": z.unknown(),
  "subject_id": z.string(),
  "success": z.boolean(),
  "total_duration_secs": z.number().int().min(0),
  "workflow_id": z.string(),
  "workflow_ref": z.string(),
  "workflow_status": z.string(),
}).passthrough();
export type WorkflowExecuteResult = z.infer<typeof WorkflowExecuteResultSchema>;

export const WorkflowPhaseRunRequestSchema = z.object({
  "dispatch_input": z.string().nullable().optional(),
  "execution_cwd": z.string(),
  "mcp_config": z.unknown().optional(),
  "model_override": z.string().nullable().optional(),
  "phase_attempt": z.number().int().min(0),
  "phase_id": z.string(),
  "phase_routing": z.unknown().optional(),
  "phase_timeout_secs": z.number().int().min(0).nullable().optional(),
  "pipeline_vars": z.record(z.string(), z.string()).optional(),
  "rework_context": z.string().nullable().optional(),
  "schedule_input": z.string().nullable().optional(),
  "subject_description": z.string(),
  "subject_id": z.string(),
  "subject_title": z.string(),
  "task_complexity": z.string().nullable().optional(),
  "tool_override": z.string().nullable().optional(),
  "workflow_id": z.string(),
  "workflow_ref": z.string(),
}).passthrough();
export type WorkflowPhaseRunRequest = z.infer<typeof WorkflowPhaseRunRequestSchema>;

export const WorkflowPhaseRunResultSchema = z.object({
  "duration_secs": z.number().int().min(0),
  "metadata": z.unknown(),
  "model": z.string().nullable().optional(),
  "outcome": z.unknown(),
  "phase_status": z.string(),
  "signals": z.array(z.unknown()).optional(),
  "tool": z.string().nullable().optional(),
}).passthrough();
export type WorkflowPhaseRunResult = z.infer<typeof WorkflowPhaseRunResultSchema>;

export const WorkflowRunnerCapabilitiesSchema = z.object({
  "crash_recovery": z.boolean().optional(),
  "manual_pause_support": z.boolean().optional(),
  "phase_decision_parsing": z.boolean().optional(),
  "post_success_actions": z.boolean().optional(),
  "rework_context_support": z.boolean().optional(),
}).passthrough();
export type WorkflowRunnerCapabilities = z.infer<typeof WorkflowRunnerCapabilitiesSchema>;

export const WorkflowRunnerManifestSchema = z.object({
  "capabilities": WorkflowRunnerCapabilitiesSchema,
  "description": z.string(),
  "name": z.string(),
  "version": z.string(),
}).passthrough();
export type WorkflowRunnerManifest = z.infer<typeof WorkflowRunnerManifestSchema>;
