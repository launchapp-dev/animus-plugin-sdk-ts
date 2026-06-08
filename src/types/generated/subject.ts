// AUTO-GENERATED FROM schemas/animus-subject-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const ChangeKindSchema = z.enum(["created", "updated", "status-changed", "deleted", "dispatch-label-changed", "attachment-added", "attachment-removed"]);
export type ChangeKind = z.infer<typeof ChangeKindSchema>;

export const CustomFieldKindSchema = z.enum(["string", "number", "bool", "enum", "date"]);
export type CustomFieldKind = z.infer<typeof CustomFieldKindSchema>;

export const CustomFieldSpecSchema = z.object({
  "key": z.string(),
  "type": CustomFieldKindSchema,
  "values": z.array(z.string()).nullable().optional(),
}).passthrough();
export type CustomFieldSpec = z.infer<typeof CustomFieldSpecSchema>;

export const SubjectIdSchema = z.string();
export type SubjectId = z.infer<typeof SubjectIdSchema>;

export const DeleteSubjectRequestSchema = z.object({
  "id": SubjectIdSchema,
}).passthrough();
export type DeleteSubjectRequest = z.infer<typeof DeleteSubjectRequestSchema>;

export const DeleteSubjectResponseSchema = z.object({
  "ok": z.boolean(),
}).passthrough();
export type DeleteSubjectResponse = z.infer<typeof DeleteSubjectResponseSchema>;

export const SubjectStatusSchema = z.enum(["ready", "in-progress", "blocked", "done", "cancelled"]);
export type SubjectStatus = z.infer<typeof SubjectStatusSchema>;

export const StatusDispatchHintSchema = z.object({
  "description": z.string().nullable().optional(),
  "dispatch_label": z.string().nullable().optional(),
  "maps_to": SubjectStatusSchema,
  "native_status": z.string(),
}).passthrough();
export type StatusDispatchHint = z.infer<typeof StatusDispatchHintSchema>;

export const SubjectAttachmentSchema = z.object({
  "id": z.string(),
  "kind": z.string(),
  "metadata": z.unknown().optional(),
  "mime_type": z.string().nullable().optional(),
  "title": z.string().nullable().optional(),
  "uri": z.string(),
}).passthrough();
export type SubjectAttachment = z.infer<typeof SubjectAttachmentSchema>;

export const SubjectSchema = z.object({
  "assignee": z.string().nullable().optional(),
  "attachments": z.array(SubjectAttachmentSchema).optional(),
  "children": z.array(SubjectIdSchema).optional(),
  "created_at": z.string().datetime({ offset: true }),
  "custom": z.record(z.string(), z.unknown()).optional(),
  "description": z.string().nullable().optional(),
  "id": SubjectIdSchema,
  "kind": z.string(),
  "labels": z.array(z.string()).optional(),
  "native_status": z.string().nullable().optional(),
  "parent": z.union([SubjectIdSchema, z.null()]).optional(),
  "priority": z.number().int().min(0).max(255).nullable().optional(),
  "status": SubjectStatusSchema,
  "status_metadata": z.unknown().optional(),
  "title": z.string(),
  "updated_at": z.string().datetime({ offset: true }),
  "url": z.string().nullable().optional(),
}).passthrough();
export type Subject = z.infer<typeof SubjectSchema>;

export const SubjectChangedEventSchema = z.object({
  "change_kind": ChangeKindSchema,
  "id": SubjectIdSchema,
  "previous_dispatch_label": z.string().nullable().optional(),
  "previous_native_status": z.string().nullable().optional(),
  "subject": SubjectSchema,
}).passthrough();
export type SubjectChangedEvent = z.infer<typeof SubjectChangedEventSchema>;

export const SubjectFilterSchema = z.object({
  "assignee": z.array(z.string()).optional(),
  "cursor": z.string().nullable().optional(),
  "dispatch_label": z.string().nullable().optional(),
  "has_attachment_kind": z.string().nullable().optional(),
  "kind": z.array(z.string()).optional(),
  "labels_all": z.array(z.string()).optional(),
  "labels_any": z.array(z.string()).optional(),
  "limit": z.number().int().min(0).nullable().optional(),
  "native_status": z.string().nullable().optional(),
  "status": z.array(SubjectStatusSchema).optional(),
  "updated_since": z.string().datetime({ offset: true }).nullable().optional(),
}).passthrough();
export type SubjectFilter = z.infer<typeof SubjectFilterSchema>;

export const SubjectListSchema = z.object({
  "fetched_at": z.string().datetime({ offset: true }),
  "next_cursor": z.string().nullable().optional(),
  "subjects": z.array(SubjectSchema),
}).passthrough();
export type SubjectList = z.infer<typeof SubjectListSchema>;

export const SubjectPatchSchema = z.object({
  "assignee": z.string().nullable().optional(),
  "comment": z.string().nullable().optional(),
  "custom": z.record(z.string(), z.unknown()).optional(),
  "labels_add": z.array(z.string()).optional(),
  "labels_remove": z.array(z.string()).optional(),
  "status": z.union([SubjectStatusSchema, z.null()]).optional(),
}).passthrough();
export type SubjectPatch = z.infer<typeof SubjectPatchSchema>;

export const SubjectSchemaSchema = z.object({
  "custom_fields": z.array(CustomFieldSpecSchema).optional(),
  "kinds": z.array(z.string()),
  "native_status_values": z.array(z.string()).optional(),
  "status_dispatch_hints": z.array(StatusDispatchHintSchema).optional(),
  "status_values": z.array(SubjectStatusSchema),
  "supports_create": z.boolean(),
  "supports_delete": z.boolean().optional(),
  "supports_pagination": z.boolean(),
  "supports_watch": z.boolean(),
}).passthrough();
export type SubjectSchema = z.infer<typeof SubjectSchemaSchema>;
