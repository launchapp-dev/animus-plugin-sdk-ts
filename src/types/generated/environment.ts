// AUTO-GENERATED FROM schemas/animus-environment-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const EnvironmentHandleSchema = z.object({
  "id": z.string(),
  "metadata": z.unknown().optional(),
  "workspace_root": z.string(),
}).passthrough();
export type EnvironmentHandle = z.infer<typeof EnvironmentHandleSchema>;

export const EnvironmentNodeSchema = z.object({
  "created_at": z.string().nullable().optional(),
  "id": z.string(),
  "image": z.string().nullable().optional(),
  "name": z.string(),
  "orphan": z.boolean(),
  "run_id": z.string().nullable().optional(),
  "state": z.string(),
}).passthrough();
export type EnvironmentNode = z.infer<typeof EnvironmentNodeSchema>;

export const RepoRefSchema = z.object({
  "git_ref": z.string().nullable().optional(),
  "name": z.string().nullable().optional(),
  "primary": z.boolean().optional(),
  "url": z.string(),
}).passthrough();
export type RepoRef = z.infer<typeof RepoRefSchema>;

export const EnvironmentSpecSchema = z.object({
  "env": z.record(z.string(), z.string()).optional(),
  "image": z.string().nullable().optional(),
  "kind": z.string(),
  "metadata": z.unknown().optional(),
  "repos": z.array(RepoRefSchema).optional(),
  "resources": z.unknown().optional(),
}).passthrough();
export type EnvironmentSpec = z.infer<typeof EnvironmentSpecSchema>;

export const ExecStreamSchema = z.enum(["stdout", "stderr"]);
export type ExecStream = z.infer<typeof ExecStreamSchema>;

export const ExecNotificationSchema = z.union([z.object({
  "handle_id": z.string(),
  "kind": z.literal("output"),
  "stream": ExecStreamSchema,
  "text": z.string(),
}).passthrough(), z.object({
  "event_kind": z.string(),
  "handle_id": z.string(),
  "kind": z.literal("journal"),
  "payload": z.unknown(),
  "phase_id": z.string().nullable().optional(),
  "status": z.string().nullable().optional(),
  "terminal": z.boolean().optional(),
  "ts": z.string(),
  "workflow_id": z.string().nullable().optional(),
}).passthrough()]);
export type ExecNotification = z.infer<typeof ExecNotificationSchema>;

export const HarnessCommandSchema = z.object({
  "args": z.array(z.string()).optional(),
  "cwd": z.string().nullable().optional(),
  "env": z.record(z.string(), z.string()).optional(),
  "program": z.string(),
}).passthrough();
export type HarnessCommand = z.infer<typeof HarnessCommandSchema>;

export const ExecRequestSchema = z.object({
  "command": HarnessCommandSchema,
  "handle": EnvironmentHandleSchema,
  "stdin": z.string().nullable().optional(),
  "timeout_secs": z.number().int().min(0).nullable().optional(),
}).passthrough();
export type ExecRequest = z.infer<typeof ExecRequestSchema>;

export const ExecResponseSchema = z.object({
  "exit_code": z.number().int().nullable().optional(),
  "stderr": z.string().optional(),
  "stdout": z.string().optional(),
  "timed_out": z.boolean().optional(),
}).passthrough();
export type ExecResponse = z.infer<typeof ExecResponseSchema>;

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

export const ExecSessionRequestSchema = z.object({
  "dispatch_input": z.string().nullable().optional(),
  "execution_fence": z.union([ExecutionFenceSchema, z.null()]).optional(),
  "handle": EnvironmentHandleSchema,
  "subject_id": z.string(),
  "workflow_id": z.string().nullable().optional(),
  "workflow_ref": z.string().nullable().optional(),
}).passthrough();
export type ExecSessionRequest = z.infer<typeof ExecSessionRequestSchema>;

export const ExecSessionResponseSchema = z.object({
  "execution_fence": z.union([ExecutionFenceSchema, z.null()]).optional(),
  "status": z.string(),
  "workflow_id": z.string().nullable().optional(),
}).passthrough();
export type ExecSessionResponse = z.infer<typeof ExecSessionResponseSchema>;

export const GetNodeRequestSchema = z.object({
  "id": z.string(),
}).passthrough();
export type GetNodeRequest = z.infer<typeof GetNodeRequestSchema>;

export const GetNodeResponseSchema = z.object({
  "node": z.union([EnvironmentNodeSchema, z.null()]).optional(),
}).passthrough();
export type GetNodeResponse = z.infer<typeof GetNodeResponseSchema>;

export const ListNodesRequestSchema = z.record(z.string(), z.unknown());
export type ListNodesRequest = z.infer<typeof ListNodesRequestSchema>;

export const ListNodesResponseSchema = z.object({
  "nodes": z.array(EnvironmentNodeSchema).optional(),
}).passthrough();
export type ListNodesResponse = z.infer<typeof ListNodesResponseSchema>;

export const PrepareRequestSchema = z.object({
  "spec": EnvironmentSpecSchema,
}).passthrough();
export type PrepareRequest = z.infer<typeof PrepareRequestSchema>;

export const PrepareResponseSchema = z.object({
  "handle": EnvironmentHandleSchema,
}).passthrough();
export type PrepareResponse = z.infer<typeof PrepareResponseSchema>;

export const ReapRequestSchema = z.object({
  "all": z.boolean().optional(),
  "dry_run": z.boolean().optional(),
  "force": z.boolean().optional(),
  "live_run_ids": z.array(z.string()).nullable().optional(),
  "older_than_secs": z.number().int().min(0).nullable().optional(),
}).passthrough();
export type ReapRequest = z.infer<typeof ReapRequestSchema>;

export const ReapResponseSchema = z.object({
  "deleted": z.array(z.string()).optional(),
  "dry_run": z.boolean().optional(),
  "kept": z.array(EnvironmentNodeSchema).optional(),
}).passthrough();
export type ReapResponse = z.infer<typeof ReapResponseSchema>;

export const TeardownNodeRequestSchema = z.object({
  "id": z.string(),
}).passthrough();
export type TeardownNodeRequest = z.infer<typeof TeardownNodeRequestSchema>;

export const TeardownNodeResponseSchema = z.object({
  "deleted": z.array(z.string()).optional(),
}).passthrough();
export type TeardownNodeResponse = z.infer<typeof TeardownNodeResponseSchema>;

export const TeardownRequestSchema = z.object({
  "handle": EnvironmentHandleSchema,
}).passthrough();
export type TeardownRequest = z.infer<typeof TeardownRequestSchema>;

export const TeardownResponseSchema = z.record(z.string(), z.unknown());
export type TeardownResponse = z.infer<typeof TeardownResponseSchema>;
