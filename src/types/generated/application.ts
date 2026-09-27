// AUTO-GENERATED FROM schemas/animus-application-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const AllowedActionSchema = z.enum(["read", "inspect", "launch", "stream", "send", "respond"]);
export type AllowedAction = z.infer<typeof AllowedActionSchema>;

export const ApplicationChatControlsSchemaSchema = z.literal("animus.chat.application_controls.v1");
export type ApplicationChatControlsSchema = z.infer<typeof ApplicationChatControlsSchemaSchema>;

export const ApplicationConfiguredRefSchema = z.string().min(1).max(64).regex(new RegExp("^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._-]*$"));
export type ApplicationConfiguredRef = z.infer<typeof ApplicationConfiguredRefSchema>;

export const ApplicationPermissionIntentSchema = z.enum(["default", "review", "auto_edit", "unrestricted"]);
export type ApplicationPermissionIntent = z.infer<typeof ApplicationPermissionIntentSchema>;

export const ApplicationReasoningEffortSchema = z.enum(["low", "medium", "high"]);
export type ApplicationReasoningEffort = z.infer<typeof ApplicationReasoningEffortSchema>;

export const AllowedApplicationChatControlsSchema = z.object({
  "approvals": z.array(z.boolean()).optional(),
  "permission_intent": z.array(ApplicationPermissionIntentSchema).optional(),
  "profile_ref": z.array(ApplicationConfiguredRefSchema).optional(),
  "reasoning_effort": z.array(ApplicationReasoningEffortSchema).optional(),
  "schema": ApplicationChatControlsSchemaSchema,
  "skill_ref": z.array(ApplicationConfiguredRefSchema).optional(),
}).strict();
export type AllowedApplicationChatControls = z.infer<typeof AllowedApplicationChatControlsSchema>;

export const ApplicationChatControlsSchema = z.object({
  "approvals": z.boolean().optional(),
  "permission_intent": ApplicationPermissionIntentSchema.optional(),
  "profile_ref": ApplicationConfiguredRefSchema.optional(),
  "reasoning_effort": ApplicationReasoningEffortSchema.optional(),
  "schema": ApplicationChatControlsSchemaSchema,
  "skill_ref": ApplicationConfiguredRefSchema.optional(),
}).strict();
export type ApplicationChatControls = z.infer<typeof ApplicationChatControlsSchema>;

export const ApplicationChatErrorMessageSchema = z.string().min(1).max(1024);
export type ApplicationChatErrorMessage = z.infer<typeof ApplicationChatErrorMessageSchema>;

export const ApplicationChatFailureStatusSchema = z.enum(["assistant_failed", "assistant_interrupted"]);
export type ApplicationChatFailureStatus = z.infer<typeof ApplicationChatFailureStatusSchema>;

export const ApplicationChatSequenceSchema = z.number().int().min(0).max(9007199254740991);
export type ApplicationChatSequence = z.infer<typeof ApplicationChatSequenceSchema>;

export const ApplicationProtocolStringSchema = z.string().min(1).max(512).regex(new RegExp("^[^\\u0000-\\u001F\\u007F]+$"));
export type ApplicationProtocolString = z.infer<typeof ApplicationProtocolStringSchema>;

export const CompletedStatusSchema = z.literal("completed");
export type CompletedStatus = z.infer<typeof CompletedStatusSchema>;

export const UserAcceptedStatusSchema = z.literal("user_accepted");
export type UserAcceptedStatus = z.infer<typeof UserAcceptedStatusSchema>;

export const ApplicationChatReceiptFrameSchema = z.union([z.object({
  "conversation_id": ApplicationProtocolStringSchema,
  "message_id": ApplicationProtocolStringSchema,
  "operation_id": ApplicationProtocolStringSchema,
  "seq": ApplicationChatSequenceSchema,
  "status": UserAcceptedStatusSchema,
  "type": z.literal("user_message_accepted"),
}).strict(), z.object({
  "conversation_id": ApplicationProtocolStringSchema,
  "message_id": ApplicationProtocolStringSchema,
  "operation_id": ApplicationProtocolStringSchema,
  "seq": ApplicationChatSequenceSchema,
  "session_id": z.union([ApplicationProtocolStringSchema, z.null()]).optional(),
  "status": CompletedStatusSchema,
  "type": z.literal("turn_completed"),
  "user_message_id": ApplicationProtocolStringSchema,
  "user_seq": ApplicationChatSequenceSchema,
}).strict(), z.object({
  "conversation_id": ApplicationProtocolStringSchema,
  "error_code": ApplicationProtocolStringSchema,
  "error_message": ApplicationChatErrorMessageSchema,
  "operation_id": ApplicationProtocolStringSchema,
  "status": ApplicationChatFailureStatusSchema,
  "type": z.literal("turn_failed"),
  "user_message_id": ApplicationProtocolStringSchema,
  "user_seq": ApplicationChatSequenceSchema,
}).strict()]);
export type ApplicationChatReceiptFrame = z.infer<typeof ApplicationChatReceiptFrameSchema>;

export const ApplicationChatTurnStatusSchema = z.enum(["completed", "assistant_failed", "assistant_interrupted"]);
export type ApplicationChatTurnStatus = z.infer<typeof ApplicationChatTurnStatusSchema>;

export const ApplicationResourceKindSchema = z.enum(["agent", "chat", "workflow", "run", "subject", "queue_entry", "operation", "interaction"]);
export type ApplicationResourceKind = z.infer<typeof ApplicationResourceKindSchema>;

export const ResourceVisibilitySchema = z.enum(["private", "org", "public"]);
export type ResourceVisibility = z.infer<typeof ResourceVisibilitySchema>;
