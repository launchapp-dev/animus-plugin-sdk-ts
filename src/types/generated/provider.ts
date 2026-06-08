// AUTO-GENERATED FROM schemas/animus-provider-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const AgentCancelRequestSchema = z.object({
  "session_id": z.string(),
}).passthrough();
export type AgentCancelRequest = z.infer<typeof AgentCancelRequestSchema>;

export const AgentNotificationSchema = z.union([z.object({
  "is_final": z.boolean().optional(),
  "kind": z.literal("output"),
  "session_id": z.string(),
  "text": z.string(),
}).passthrough(), z.object({
  "kind": z.literal("thinking"),
  "session_id": z.string(),
  "text": z.string(),
}).passthrough(), z.object({
  "arguments": z.unknown(),
  "kind": z.literal("toolCall"),
  "name": z.string(),
  "server": z.string().nullable().optional(),
  "session_id": z.string(),
}).passthrough(), z.object({
  "kind": z.literal("toolResult"),
  "name": z.string(),
  "output": z.unknown(),
  "session_id": z.string(),
  "success": z.boolean(),
}).passthrough(), z.object({
  "kind": z.literal("error"),
  "message": z.string(),
  "recoverable": z.boolean(),
  "session_id": z.string(),
}).passthrough()]);
export type AgentNotification = z.infer<typeof AgentNotificationSchema>;

export const AgentRunRequestSchema = z.object({
  "cwd": z.string(),
  "env": z.record(z.string(), z.string()).optional(),
  "mcp_servers": z.unknown().optional(),
  "model": z.string().nullable().optional(),
  "permission_mode": z.string().nullable().optional(),
  "project_root": z.string().nullable().optional(),
  "prompt": z.string(),
  "response_schema": z.unknown().optional(),
  "runtime_contract": z.unknown().optional(),
  "session_id": z.string().nullable().optional(),
  "system_prompt": z.string().nullable().optional(),
  "timeout_secs": z.number().int().min(0).nullable().optional(),
  "tools": z.unknown().optional(),
}).passthrough();
export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;

export const TokenUsageSchema = z.object({
  "cache_writes": z.number().int().min(0).nullable().optional(),
  "cached": z.number().int().min(0).nullable().optional(),
  "input": z.number().int().min(0),
  "output": z.number().int().min(0),
}).passthrough();
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const AgentRunResponseSchema = z.object({
  "backend": z.string(),
  "decision_verdict": z.unknown().optional(),
  "duration_ms": z.number().int().min(0),
  "errors": z.array(z.string()).optional(),
  "exit_code": z.number().int(),
  "metadata": z.array(z.unknown()).optional(),
  "output": z.string(),
  "session_id": z.string(),
  "thinking": z.array(z.string()).optional(),
  "tokens_used": z.union([TokenUsageSchema, z.null()]).optional(),
  "tool_calls": z.array(z.unknown()).optional(),
  "tool_results": z.array(z.unknown()).optional(),
}).passthrough();
export type AgentRunResponse = z.infer<typeof AgentRunResponseSchema>;

export const ProviderCapabilitiesSchema = z.object({
  "cancellation": z.boolean().optional(),
  "mcp": z.boolean().optional(),
  "resume": z.boolean().optional(),
  "streaming": z.boolean().optional(),
  "write_capable": z.boolean().optional(),
}).passthrough();
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

export const ProviderManifestSchema = z.object({
  "capabilities": ProviderCapabilitiesSchema,
  "description": z.string(),
  "name": z.string(),
  "supported_models": z.array(z.string()),
  "tool": z.string(),
  "version": z.string(),
}).passthrough();
export type ProviderManifest = z.infer<typeof ProviderManifestSchema>;
