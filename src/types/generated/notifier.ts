// AUTO-GENERATED FROM schemas/animus-notifier-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const DaemonEventRecordSchema = z.object({
  "data": z.unknown(),
  "event_type": z.string(),
  "id": z.string(),
  "project_root": z.string().nullable().optional(),
  "schema": z.string(),
  "seq": z.number().int().min(0).optional(),
  "timestamp": z.string(),
}).passthrough();
export type DaemonEventRecord = z.infer<typeof DaemonEventRecordSchema>;

export const NotifierFlushParamsSchema = z.object({
  "project_root": z.string().nullable().optional(),
}).passthrough();
export type NotifierFlushParams = z.infer<typeof NotifierFlushParamsSchema>;

export const NotifierLifecycleEventSchema = z.object({
  "data": z.unknown(),
  "event_type": z.string(),
  "project_root": z.string().nullable().optional(),
}).passthrough();
export type NotifierLifecycleEvent = z.infer<typeof NotifierLifecycleEventSchema>;

export const NotifierFlushResultSchema = z.object({
  "lifecycle_events": z.array(NotifierLifecycleEventSchema).optional(),
}).passthrough();
export type NotifierFlushResult = z.infer<typeof NotifierFlushResultSchema>;

export const NotifierNotifyParamsSchema = z.object({
  "event": DaemonEventRecordSchema,
}).passthrough();
export type NotifierNotifyParams = z.infer<typeof NotifierNotifyParamsSchema>;

export const NotifierNotifyResultSchema = z.object({
  "accepted": z.boolean(),
  "delivered": z.number().int().min(0).optional(),
  "lifecycle_events": z.array(NotifierLifecycleEventSchema).optional(),
}).passthrough();
export type NotifierNotifyResult = z.infer<typeof NotifierNotifyResultSchema>;

export const NotifierSchemaSchema = z.object({
  "connector_kinds": z.array(z.string()),
  "supports_flush": z.boolean(),
}).passthrough();
export type NotifierSchema = z.infer<typeof NotifierSchemaSchema>;
