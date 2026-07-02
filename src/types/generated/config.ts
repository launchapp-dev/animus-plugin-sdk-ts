// AUTO-GENERATED FROM schemas/animus-config-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const ActorSchema = z.object({
  "claims": z.array(z.string()).optional(),
  "tenant_id": z.string().nullable().optional(),
  "user_id": z.string(),
}).passthrough();
export type Actor = z.infer<typeof ActorSchema>;

export const CacheTokenSchema = z.object({
  "external_inputs": z.boolean().optional(),
  "version": z.string(),
}).passthrough();
export type CacheToken = z.infer<typeof CacheTokenSchema>;

export const ConfigChangedEventSchema = z.object({
  "version": z.string().nullable().optional(),
}).passthrough();
export type ConfigChangedEvent = z.infer<typeof ConfigChangedEventSchema>;

export const DiagnosticSeveritySchema = z.enum(["error", "warning"]);
export type DiagnosticSeverity = z.infer<typeof DiagnosticSeveritySchema>;

export const ConfigDiagnosticSchema = z.object({
  "column": z.number().int().min(0).nullable().optional(),
  "file": z.string().nullable().optional(),
  "line": z.number().int().min(0).nullable().optional(),
  "message": z.string(),
  "severity": DiagnosticSeveritySchema,
}).passthrough();
export type ConfigDiagnostic = z.infer<typeof ConfigDiagnosticSchema>;

export const ConfigLoadRequestSchema = z.object({
  "actor": z.union([ActorSchema, z.null()]).optional(),
  "project_root": z.string(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConfigLoadRequest = z.infer<typeof ConfigLoadRequestSchema>;

export const ConfigModelSchema = z.object({
  "config": z.unknown(),
  "schema": z.string(),
  "version": z.number().int().min(0),
}).passthrough();
export type ConfigModel = z.infer<typeof ConfigModelSchema>;

export const ConfigLoadResponseSchema = z.object({
  "cache_token": CacheTokenSchema,
  "config": ConfigModelSchema,
}).passthrough();
export type ConfigLoadResponse = z.infer<typeof ConfigLoadResponseSchema>;

export const ConfigValidateRequestSchema = z.object({
  "actor": z.union([ActorSchema, z.null()]).optional(),
  "project_root": z.string(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConfigValidateRequest = z.infer<typeof ConfigValidateRequestSchema>;

export const ConfigValidateResponseSchema = z.object({
  "diagnostics": z.array(ConfigDiagnosticSchema).optional(),
}).passthrough();
export type ConfigValidateResponse = z.infer<typeof ConfigValidateResponseSchema>;

export const ConfigWriteRequestSchema = z.object({
  "config": ConfigModelSchema,
  "project_root": z.string(),
  "repo_scope": z.string().nullable().optional(),
}).passthrough();
export type ConfigWriteRequest = z.infer<typeof ConfigWriteRequestSchema>;

export const ConfigWriteResponseSchema = z.object({
  "cache_token": z.union([CacheTokenSchema, z.null()]).optional(),
}).passthrough();
export type ConfigWriteResponse = z.infer<typeof ConfigWriteResponseSchema>;
