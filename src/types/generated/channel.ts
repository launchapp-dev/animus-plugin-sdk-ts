// AUTO-GENERATED FROM schemas/animus-channel-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const ChannelDeliveryStateSchema = z.enum(["queued", "sending", "accepted", "delivered", "read", "failed", "unknown"]);
export type ChannelDeliveryState = z.infer<typeof ChannelDeliveryStateSchema>;

export const ChannelScopeSchema = z.object({
  "connection_id": z.string(),
  "tenant_id": z.string(),
}).strict();
export type ChannelScope = z.infer<typeof ChannelScopeSchema>;

export const ChannelVersionSchema = z.enum(["animus.channel.v1"]);
export type ChannelVersion = z.infer<typeof ChannelVersionSchema>;

export const ChannelDeliverySchema = z.object({
  "delivery_id": z.string(),
  "error_code": z.string().nullable().optional(),
  "provider_message_id": z.string().nullable().optional(),
  "schema": ChannelVersionSchema,
  "scope": ChannelScopeSchema,
  "state": ChannelDeliveryStateSchema,
}).strict();
export type ChannelDelivery = z.infer<typeof ChannelDeliverySchema>;

export const ChannelMessageSchema = z.object({
  "message_id": z.string(),
  "occurred_at": z.string(),
  "peer_id": z.string(),
  "schema": ChannelVersionSchema,
  "scope": ChannelScopeSchema,
  "text": z.string(),
}).strict();
export type ChannelMessage = z.infer<typeof ChannelMessageSchema>;

export const ChannelReceiveResultSchema = z.object({
  "duplicate": z.boolean(),
  "schema": ChannelVersionSchema,
}).strict();
export type ChannelReceiveResult = z.infer<typeof ChannelReceiveResultSchema>;

export const ChannelSchemaSchema = z.object({
  "providers": z.array(z.string()),
  "schema": ChannelVersionSchema,
  "supports_delivery_status": z.boolean(),
  "supports_durable_receive": z.boolean(),
  "supports_media": z.boolean(),
  "supports_templates": z.boolean(),
  "supports_text": z.boolean(),
}).strict();
export type ChannelSchema = z.infer<typeof ChannelSchemaSchema>;

export const ChannelSendParamsSchema = z.object({
  "delivery_id": z.string(),
  "peer_id": z.string(),
  "reply_to": z.string().nullable().optional(),
  "schema": ChannelVersionSchema,
  "scope": ChannelScopeSchema,
  "text": z.string(),
}).strict();
export type ChannelSendParams = z.infer<typeof ChannelSendParamsSchema>;

export const ChannelStatusParamsSchema = z.object({
  "delivery_id": z.string(),
  "schema": ChannelVersionSchema,
  "scope": ChannelScopeSchema,
}).strict();
export type ChannelStatusParams = z.infer<typeof ChannelStatusParamsSchema>;
