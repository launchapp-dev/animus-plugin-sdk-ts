// AUTO-GENERATED FROM schemas/animus-plugin-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const ChatMessageSchema = z.object({
  "blocks": z.array(z.unknown()).optional(),
  "content": z.string(),
  "cost_usd": z.number().nullable().optional(),
  "model": z.string().nullable().optional(),
  "recorded_at": z.string(),
  "role": z.string(),
  "seq": z.number().int().min(0),
  "tool": z.string().nullable().optional(),
  "usage": z.unknown().optional(),
}).passthrough();
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ConversationAppendMessageRequestSchema = z.object({
  "as_user": z.string().nullable().optional(),
  "id": z.string(),
  "message": ChatMessageSchema,
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationAppendMessageRequest = z.infer<typeof ConversationAppendMessageRequestSchema>;

export const ConversationAppendMessageResponseSchema = z.record(z.string(), z.unknown());
export type ConversationAppendMessageResponse = z.infer<typeof ConversationAppendMessageResponseSchema>;

export const VisibilitySchema = z.enum(["private", "shared"]);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const ConversationCreateRequestSchema = z.object({
  "id": z.string().nullable().optional(),
  "owner": z.string().nullable().optional(),
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
  "visibility": VisibilitySchema.optional(),
}).passthrough();
export type ConversationCreateRequest = z.infer<typeof ConversationCreateRequestSchema>;

export const ConversationMetaSchema = z.object({
  "created_at": z.string(),
  "id": z.string(),
  "message_count": z.number().int().min(0).optional(),
  "model": z.string().nullable().optional(),
  "owner": z.string().nullable().optional(),
  "session_id": z.string().nullable().optional(),
  "title": z.string().nullable().optional(),
  "tool": z.string().nullable().optional(),
  "updated_at": z.string(),
  "visibility": VisibilitySchema.optional(),
}).passthrough();
export type ConversationMeta = z.infer<typeof ConversationMetaSchema>;

export const ConversationCreateResponseSchema = z.object({
  "meta": ConversationMetaSchema,
}).passthrough();
export type ConversationCreateResponse = z.infer<typeof ConversationCreateResponseSchema>;

export const ConversationDeleteRequestSchema = z.object({
  "as_user": z.string().nullable().optional(),
  "id": z.string(),
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationDeleteRequest = z.infer<typeof ConversationDeleteRequestSchema>;

export const ConversationDeleteResponseSchema = z.record(z.string(), z.unknown());
export type ConversationDeleteResponse = z.infer<typeof ConversationDeleteResponseSchema>;

export const ConversationListRequestSchema = z.object({
  "as_user": z.string().nullable().optional(),
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationListRequest = z.infer<typeof ConversationListRequestSchema>;

export const ConversationSummarySchema = z.object({
  "id": z.string(),
  "message_count": z.number().int().min(0),
  "model": z.string().nullable().optional(),
  "owner": z.string().nullable().optional(),
  "title": z.string().nullable().optional(),
  "tool": z.string().nullable().optional(),
  "updated_at": z.string(),
  "visibility": VisibilitySchema.optional(),
}).passthrough();
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

export const ConversationListResponseSchema = z.object({
  "conversations": z.array(ConversationSummarySchema).optional(),
}).passthrough();
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>;

export const ConversationLoadMessagesRequestSchema = z.object({
  "as_user": z.string().nullable().optional(),
  "id": z.string(),
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationLoadMessagesRequest = z.infer<typeof ConversationLoadMessagesRequestSchema>;

export const ConversationLoadMessagesResponseSchema = z.object({
  "messages": z.array(ChatMessageSchema).optional(),
}).passthrough();
export type ConversationLoadMessagesResponse = z.infer<typeof ConversationLoadMessagesResponseSchema>;

export const ConversationLoadMetaRequestSchema = z.object({
  "as_user": z.string().nullable().optional(),
  "id": z.string(),
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationLoadMetaRequest = z.infer<typeof ConversationLoadMetaRequestSchema>;

export const ConversationLoadMetaResponseSchema = z.object({
  "meta": z.union([ConversationMetaSchema, z.null()]).optional(),
}).passthrough();
export type ConversationLoadMetaResponse = z.infer<typeof ConversationLoadMetaResponseSchema>;

export const ConversationSaveMetaRequestSchema = z.object({
  "as_user": z.string().nullable().optional(),
  "meta": ConversationMetaSchema,
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationSaveMetaRequest = z.infer<typeof ConversationSaveMetaRequestSchema>;

export const ConversationSaveMetaResponseSchema = z.record(z.string(), z.unknown());
export type ConversationSaveMetaResponse = z.infer<typeof ConversationSaveMetaResponseSchema>;

export const ConversationScopeSchema = z.object({
  "project_root": z.string().nullable().optional(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConversationScope = z.infer<typeof ConversationScopeSchema>;

export const EnvRequirementSchema = z.object({
  "description": z.string().nullable().optional(),
  "name": z.string(),
  "required": z.boolean().optional(),
  "sensitive": z.boolean().optional(),
}).passthrough();
export type EnvRequirement = z.infer<typeof EnvRequirementSchema>;

export const HealthStatusSchema = z.enum(["healthy", "degraded", "unhealthy"]);
export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthCheckResultSchema = z.object({
  "last_error": z.string().nullable().optional(),
  "memory_usage_bytes": z.number().int().min(0).nullable().optional(),
  "status": HealthStatusSchema,
  "uptime_ms": z.number().int().min(0).nullable().optional(),
}).passthrough();
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

export const HostCapabilitiesSchema = z.object({
  "cancellation": z.boolean().optional(),
  "progress": z.boolean().optional(),
  "streaming": z.boolean().optional(),
}).passthrough();
export type HostCapabilities = z.infer<typeof HostCapabilitiesSchema>;

export const HostInfoSchema = z.object({
  "name": z.string(),
  "version": z.string(),
}).passthrough();
export type HostInfo = z.infer<typeof HostInfoSchema>;

export const InitializeParamsSchema = z.object({
  "capabilities": HostCapabilitiesSchema,
  "host_info": HostInfoSchema,
  "init_extensions": z.record(z.string(), z.unknown()).optional(),
  "protocol_version": z.string(),
}).passthrough();
export type InitializeParams = z.infer<typeof InitializeParamsSchema>;

export const KindCapabilitySchema = z.object({
  "crate_version": z.string(),
  "extra": z.unknown().optional(),
}).passthrough();
export type KindCapability = z.infer<typeof KindCapabilitySchema>;

export const McpToolSchema = z.object({
  "description": z.string().nullable().optional(),
  "input_schema": z.unknown().optional(),
  "name": z.string(),
}).passthrough();
export type McpTool = z.infer<typeof McpToolSchema>;

export const PluginCapabilitiesSchema = z.object({
  "cancellation": z.boolean().optional(),
  "mcp_tools": z.array(McpToolSchema).optional(),
  "methods": z.array(z.string()).optional(),
  "progress": z.boolean().optional(),
  "projections": z.array(z.string()).optional(),
  "streaming": z.boolean().optional(),
  "subject_kinds": z.array(z.string()).optional(),
}).passthrough();
export type PluginCapabilities = z.infer<typeof PluginCapabilitiesSchema>;

export const PluginInfoSchema = z.object({
  "description": z.string().nullable().optional(),
  "name": z.string(),
  "plugin_kind": z.string(),
  "plugin_kinds": z.array(z.string()).optional(),
  "version": z.string(),
}).passthrough();
export type PluginInfo = z.infer<typeof PluginInfoSchema>;

export const InitializeResultSchema = z.object({
  "capabilities": PluginCapabilitiesSchema,
  "kind_capabilities": z.record(z.string(), KindCapabilitySchema).optional(),
  "plugin_info": PluginInfoSchema,
  "protocol_version": z.string(),
}).passthrough();
export type InitializeResult = z.infer<typeof InitializeResultSchema>;

export const PluginManifestSchema = z.object({
  "capabilities": z.array(z.string()).optional(),
  "description": z.string(),
  "env_required": z.array(EnvRequirementSchema).optional(),
  "name": z.string(),
  "notification_buffer_size": z.number().int().min(0).nullable().optional(),
  "plugin_kind": z.string(),
  "plugin_kinds": z.array(z.string()).optional(),
  "protocol_version": z.string(),
  "supports_mcp": z.boolean().nullable().optional(),
  "version": z.string(),
}).passthrough();
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

export const RpcErrorSchema = z.object({
  "code": z.number().int(),
  "data": z.unknown().optional(),
  "message": z.string(),
}).passthrough();
export type RpcError = z.infer<typeof RpcErrorSchema>;

export const RpcNotificationSchema = z.object({
  "jsonrpc": z.string(),
  "method": z.string(),
  "params": z.unknown().optional(),
}).passthrough();
export type RpcNotification = z.infer<typeof RpcNotificationSchema>;

export const RpcRequestSchema = z.object({
  "id": z.unknown().optional(),
  "jsonrpc": z.string(),
  "method": z.string(),
  "params": z.unknown().optional(),
}).passthrough();
export type RpcRequest = z.infer<typeof RpcRequestSchema>;

export const RpcResponseSchema = z.object({
  "error": z.union([RpcErrorSchema, z.null()]).optional(),
  "id": z.unknown().optional(),
  "jsonrpc": z.string(),
  "result": z.unknown().optional(),
}).passthrough();
export type RpcResponse = z.infer<typeof RpcResponseSchema>;

export const TriggerAckStatusSchema = z.union([z.literal("dispatched"), z.literal("queued"), z.literal("unmatched"), z.literal("skipped"), z.literal("failed"), z.literal("shutdown"), z.string()]);
export type TriggerAckStatus = z.infer<typeof TriggerAckStatusSchema>;

export const TriggerAckParamsSchema = z.object({
  "event_id": z.string(),
  "status": z.union([TriggerAckStatusSchema, z.null()]).optional(),
}).passthrough();
export type TriggerAckParams = z.infer<typeof TriggerAckParamsSchema>;

export const TriggerActionHintSchema = z.union([z.literal("create_task"), z.literal("run_workflow"), z.string()]);
export type TriggerActionHint = z.infer<typeof TriggerActionHintSchema>;

export const TriggerEventSchema = z.object({
  "action_hint": z.union([TriggerActionHintSchema, z.null()]).optional(),
  "event_id": z.string(),
  "payload": z.unknown().optional(),
  "subject_id": z.string().nullable().optional(),
  "subject_kind": z.string().nullable().optional(),
  "trigger_id": z.string().nullable().optional(),
}).passthrough();
export type TriggerEvent = z.infer<typeof TriggerEventSchema>;

export const TriggerWatchParamsSchema = z.object({
  "config": z.unknown().optional(),
  "cursor": z.unknown().optional(),
}).passthrough();
export type TriggerWatchParams = z.infer<typeof TriggerWatchParamsSchema>;
