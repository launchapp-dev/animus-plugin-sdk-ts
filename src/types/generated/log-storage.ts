// AUTO-GENERATED FROM schemas/animus-log-storage-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const LogLevelSchema = z.enum(["trace", "debug", "info", "warn", "error"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

export const LogSourceSchema = z.enum(["daemon", "plugin", "cli", "workflow"]);
export type LogSource = z.infer<typeof LogSourceSchema>;

export const LogEntrySchema = z.object({
  "fields": z.unknown().optional(),
  "id": z.string(),
  "level": LogLevelSchema,
  "message": z.string(),
  "source": LogSourceSchema,
  "source_name": z.string().nullable().optional(),
  "target": z.string(),
  "ts": z.string().datetime({ offset: true }),
}).passthrough();
export type LogEntry = z.infer<typeof LogEntrySchema>;

export const LogQuerySchema = z.object({
  "cursor": z.string().nullable().optional(),
  "follow": z.boolean().optional(),
  "limit": z.number().int().min(0).nullable().optional(),
  "min_level": z.union([LogLevelSchema, z.null()]).optional(),
  "since": z.string().datetime({ offset: true }).nullable().optional(),
  "source": z.union([LogSourceSchema, z.null()]).optional(),
  "source_name": z.string().nullable().optional(),
  "target_glob": z.string().nullable().optional(),
  "until": z.string().datetime({ offset: true }).nullable().optional(),
}).passthrough();
export type LogQuery = z.infer<typeof LogQuerySchema>;

export const LogQueryResultSchema = z.object({
  "entries": z.array(LogEntrySchema),
  "next_cursor": z.string().nullable().optional(),
}).passthrough();
export type LogQueryResult = z.infer<typeof LogQueryResultSchema>;

export const SupportsFilteringSchema = z.object({
  "by_glob": z.boolean().optional(),
  "by_level": z.boolean().optional(),
  "by_source": z.boolean().optional(),
  "by_target": z.boolean().optional(),
  "by_time_range": z.boolean().optional(),
}).passthrough();
export type SupportsFiltering = z.infer<typeof SupportsFilteringSchema>;

export const LogStorageSchemaSchema = z.object({
  "max_query_window": z.number().int().nullable().optional(),
  "retention_hint": z.number().int().nullable().optional(),
  "supports_dedup": z.boolean(),
  "supports_filtering": SupportsFilteringSchema,
  "supports_query": z.boolean(),
  "supports_tail": z.boolean(),
}).passthrough();
export type LogStorageSchema = z.infer<typeof LogStorageSchemaSchema>;
