// AUTO-GENERATED FROM schemas/animus-environment-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const EnvironmentHandleSchema = z.object({
  "id": z.string(),
  "metadata": z.unknown().optional(),
  "workspace_root": z.string(),
}).passthrough();
export type EnvironmentHandle = z.infer<typeof EnvironmentHandleSchema>;

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

export const ExecSessionRequestSchema = z.object({
  "dispatch_input": z.string().nullable().optional(),
  "handle": EnvironmentHandleSchema,
  "subject_id": z.string(),
  "workflow_ref": z.string().nullable().optional(),
}).passthrough();
export type ExecSessionRequest = z.infer<typeof ExecSessionRequestSchema>;

export const ExecSessionResponseSchema = z.object({
  "status": z.string(),
  "workflow_id": z.string().nullable().optional(),
}).passthrough();
export type ExecSessionResponse = z.infer<typeof ExecSessionResponseSchema>;

export const PrepareRequestSchema = z.object({
  "spec": EnvironmentSpecSchema,
}).passthrough();
export type PrepareRequest = z.infer<typeof PrepareRequestSchema>;

export const PrepareResponseSchema = z.object({
  "handle": EnvironmentHandleSchema,
}).passthrough();
export type PrepareResponse = z.infer<typeof PrepareResponseSchema>;

export const TeardownRequestSchema = z.object({
  "handle": EnvironmentHandleSchema,
}).passthrough();
export type TeardownRequest = z.infer<typeof TeardownRequestSchema>;

export const TeardownResponseSchema = z.record(z.string(), z.unknown());
export type TeardownResponse = z.infer<typeof TeardownResponseSchema>;
