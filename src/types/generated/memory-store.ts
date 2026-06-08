// AUTO-GENERATED FROM schemas/animus-memory-store-protocol/_all.json — DO NOT EDIT BY HAND.
// Regenerate via: pnpm run codegen
import { z } from "zod";

export const MemoryScopeSchema = z.object({
  "agent_id": z.string().nullable().optional(),
  "project_id": z.string(),
  "task_id": z.string().nullable().optional(),
}).passthrough();
export type MemoryScope = z.infer<typeof MemoryScopeSchema>;

export const DeleteScopeRequestSchema = z.object({
  "scope": MemoryScopeSchema,
}).passthrough();
export type DeleteScopeRequest = z.infer<typeof DeleteScopeRequestSchema>;

export const DeleteScopeResponseSchema = z.object({
  "ack": z.boolean(),
}).passthrough();
export type DeleteScopeResponse = z.infer<typeof DeleteScopeResponseSchema>;

export const GetMemoryRequestSchema = z.object({
  "key": z.string(),
  "scope": MemoryScopeSchema,
}).passthrough();
export type GetMemoryRequest = z.infer<typeof GetMemoryRequestSchema>;

export const GetMemoryResponseSchema = z.object({
  "found": z.boolean(),
  "value": z.unknown().optional(),
}).passthrough();
export type GetMemoryResponse = z.infer<typeof GetMemoryResponseSchema>;

export const ListScopesRequestSchema = z.object({
  "cursor": z.string().nullable().optional(),
  "page_size": z.number().int().min(0).nullable().optional(),
  "project_id": z.string().nullable().optional(),
}).passthrough();
export type ListScopesRequest = z.infer<typeof ListScopesRequestSchema>;

export const ListScopesResponseSchema = z.object({
  "next_cursor": z.string().nullable().optional(),
  "scopes": z.array(MemoryScopeSchema),
}).passthrough();
export type ListScopesResponse = z.infer<typeof ListScopesResponseSchema>;

export const MemoryQueryResultSchema = z.object({
  "key": z.string(),
  "score": z.number(),
  "value": z.unknown(),
}).passthrough();
export type MemoryQueryResult = z.infer<typeof MemoryQueryResultSchema>;

export const MemoryStoreCapabilitiesSchema = z.object({
  "max_query_top_k": z.number().int().min(0).optional(),
  "native_key_get": z.boolean().optional(),
  "native_ttl": z.boolean().optional(),
  "strong_consistency": z.boolean().optional(),
}).passthrough();
export type MemoryStoreCapabilities = z.infer<typeof MemoryStoreCapabilitiesSchema>;

export const PutMemoryRequestSchema = z.object({
  "key": z.string(),
  "scope": MemoryScopeSchema,
  "ttl_secs": z.number().int().min(0).nullable().optional(),
  "value": z.unknown(),
}).passthrough();
export type PutMemoryRequest = z.infer<typeof PutMemoryRequestSchema>;

export const PutMemoryResponseSchema = z.object({
  "ack": z.boolean(),
  "indexed_immediately": z.boolean(),
  "record_id": z.string().optional(),
}).passthrough();
export type PutMemoryResponse = z.infer<typeof PutMemoryResponseSchema>;

export const QueryMemoryRequestSchema = z.object({
  "query": z.string(),
  "scope": MemoryScopeSchema,
  "top_k": z.number().int().min(0),
}).passthrough();
export type QueryMemoryRequest = z.infer<typeof QueryMemoryRequestSchema>;

export const QueryMemoryResponseSchema = z.object({
  "results": z.array(MemoryQueryResultSchema),
}).passthrough();
export type QueryMemoryResponse = z.infer<typeof QueryMemoryResponseSchema>;
