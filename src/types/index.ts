// Base/runtime protocol layer. The wire-shape types are re-exported from the
// generated Zod modules (Rust is the source of truth — regenerate via
// `pnpm run codegen`). This module adds the hand-maintained constants
// (PROTOCOL_VERSION, PluginKind, ErrorCode) and the JSON-RPC id alias that the
// transport relies on, none of which live in the schema bundles.

import {
  type EnvRequirement,
  type HealthCheckResult,
  type HealthStatus,
  type HostCapabilities,
  type HostInfo,
  type InitializeParams,
  type InitializeResult,
  type KindCapability,
  type McpTool,
  type PluginCapabilities,
  type PluginInfo,
  type PluginManifest,
  type RpcError,
} from './generated/plugin.js';

export type {
  EnvRequirement,
  HealthCheckResult,
  HealthStatus,
  HostCapabilities,
  HostInfo,
  InitializeParams,
  InitializeResult,
  KindCapability,
  McpTool,
  PluginCapabilities,
  PluginInfo,
  PluginManifest,
  RpcError,
};

/** Protocol version this SDK was built against. Mirrors the Rust
 *  `PROTOCOL_VERSION` constant in `animus-plugin-protocol`. */
export const PROTOCOL_VERSION = '1.1.0' as const;

/** Plugin kind discriminator strings (mirror the `PLUGIN_KIND_*` constants). */
export const PluginKind = {
  Provider: 'provider',
  SubjectBackend: 'subject_backend',
  TaskBackend: 'task_backend',
  TriggerBackend: 'trigger_backend',
  LogStorageBackend: 'log_storage_backend',
  TransportBackend: 'transport_backend',
  // v1.1.0 additive kinds.
  WorkflowRunner: 'workflow_runner',
  Queue: 'queue',
  DurableStore: 'durable_store',
  MemoryStore: 'memory_store',
  Notifier: 'notifier',
  Custom: 'custom',
} as const;
export type PluginKindString = (typeof PluginKind)[keyof typeof PluginKind];

/** JSON-RPC 2.0 request id; per spec a string, number, or null. */
export type RpcId = string | number | null;

// The JSON-RPC envelopes are transport contracts, not domain payloads, so we
// define them explicitly here (the generated `RpcRequest`/`RpcResponse` schemas
// from the bundle are intentionally permissive via `.passthrough()`, which
// erases the field types behind an index signature). The structural shape
// matches the generated schema exactly; only `id` is narrowed to `RpcId`.
export interface RpcRequest {
  jsonrpc: '2.0';
  method: string;
  id?: RpcId;
  params?: unknown;
}
export interface RpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}
export interface RpcResponse {
  jsonrpc: '2.0';
  id: RpcId;
  result?: unknown;
  error?: RpcError | null;
}

/** JSON-RPC 2.0 standard + Animus-specific error codes (spec §4). */
export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  /** Domain method received before `initialize` completed. */
  PluginNotInitialized: -32000,
  /** Method is recognized but not implemented (host should fall back). */
  MethodNotSupported: -32001,
  /** Host cancelled the request via `$/cancelRequest`. */
  RequestCancelled: -32002,
  /** Request did not complete within the host-imposed timeout. */
  Timeout: -32003,
  /** Animus-specific: plugin shutting down. */
  ServerShutdown: -32099,
} as const;
