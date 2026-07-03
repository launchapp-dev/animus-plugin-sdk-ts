// Public, reusable JSON-RPC serve loop.
//
// This is the lifecycle engine multi-role plugins run on. It owns the
// `--manifest` CLI shortcut, the stdio wire, the lifecycle methods
// (`initialize` / `$/ping` / `health/check` / `shutdown` / `exit` +
// notifications), the best-effort `$/cancelRequest` handling, and per-call
// Actor extraction — then routes every domain method through a flat
// name → handler table. Single-kind typed plugins keep their own richer loop in
// `plugin.ts` (provider streaming, subject route backfill); this loop covers the
// request/response BaaS roles that a consolidated multi-kind plugin composes.

import process from 'node:process';
import { stdout as nodeStdout } from 'node:process';

import { buildInitializeResult, validateInitializeParams, type PluginIdentity } from './handshake.js';
import type { Actor, CallContext, HealthReport } from './roles/context.js';
import { ActorSchema } from './types/generated/config.js';
import { createWire, errorResponse, okResponse, type Wire } from './wire.js';
import {
  ErrorCode,
  type KindCapability,
  type InitializeParams,
  type PluginCapabilities,
  type PluginManifest,
  type RpcId,
  type RpcRequest,
  type RpcResponse,
} from './types/index.js';

/** A single domain-method handler. Params arrive untyped from the wire; the
 *  handler narrows/validates them internally. */
export type RpcHandler = (params: unknown, ctx: CallContext) => Promise<unknown> | unknown;

export interface ServeLoopOptions {
  /** Static manifest emitted for `--manifest` (already carries plugin_kinds). */
  manifest: PluginManifest;
  /** Identity used to build the `initialize` reply. */
  identity: PluginIdentity;
  /** Advertised capabilities returned on `initialize`. */
  capabilities: PluginCapabilities;
  /** Per-kind protocol crate versions (v1.1.0 kind_capabilities). */
  kindCapabilities?: Record<string, KindCapability>;
  /** All kinds this process serves (primary + additional). */
  pluginKinds?: string[];
  /** Flat domain-method routing table (`"subject/list"` → handler, ...). */
  methods: Map<string, RpcHandler>;
  /** Optional health probe (else reports `healthy`). */
  health?: (ctx: CallContext) => Promise<HealthReport> | HealthReport;
  /** Override inbound stream (tests). */
  input?: NodeJS.ReadableStream;
  /** Override outbound stream (tests). */
  output?: NodeJS.WritableStream;
  /** Skip the `--manifest` CLI shortcut (tests). */
  skipCliArgs?: boolean;
}

/** Extract a typed Actor from a call's params, if the transport relayed one on
 *  the well-known `actor` key. Lenient: a malformed actor is dropped, never
 *  fatal. */
export function extractActor(params: unknown): Actor | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const raw = (params as { actor?: unknown }).actor;
  if (!raw || typeof raw !== 'object') return undefined;
  const parsed = ActorSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function buildHealthOk(): HealthReport {
  return { status: 'healthy', uptime_ms: null, memory_usage_bytes: null, last_error: null };
}

/** Drive the JSON-RPC loop until the input stream closes. */
export async function runServeLoop(opts: ServeLoopOptions): Promise<void> {
  if (!opts.skipCliArgs) {
    const args = process.argv.slice(2);
    if (args.includes('--manifest') || args.includes('-m')) {
      await new Promise<void>((resolve, reject) => {
        nodeStdout.write(`${JSON.stringify(opts.manifest)}\n`, (err) => (err ? reject(err) : resolve()));
      });
      process.exit(0);
    }
    if (args.includes('--help') || args.includes('-h')) {
      await new Promise<void>((resolve) => {
        process.stderr.write(
          `${opts.identity.name} ${opts.identity.version} - Animus STDIO plugin\n` +
            'Usage:\n' +
            `  ${opts.identity.name} --manifest    Print plugin manifest as JSON and exit\n` +
            `  ${opts.identity.name}               Run JSON-RPC loop on stdin/stdout\n`,
          () => resolve(),
        );
      });
      process.exit(0);
    }
  }

  const wire: Wire = createWire({
    input: opts.input as NodeJS.ReadableStream | undefined as never,
    output: opts.output as NodeJS.WritableStream | undefined as never,
  });

  await wire.run((frame) => dispatch(frame, wire, opts));
}

async function dispatch(frame: RpcRequest, wire: Wire, opts: ServeLoopOptions): Promise<RpcResponse | undefined> {
  const { id, method } = frame;

  // Notifications (no id): never respond. `exit`, `$/cancelRequest`,
  // `initialized`, `$/progress`, and unknown notifications are handled/dropped
  // to match the Rust runtime. (Multi-role BaaS handlers are request/response,
  // so cancellation is a no-op here.)
  if (id === undefined) {
    if (method === 'exit') setImmediate(() => process.exit(0));
    return undefined;
  }

  switch (method) {
    case 'initialize': {
      const params = (frame.params ?? {}) as InitializeParams;
      const incompat = validateInitializeParams(params);
      if (incompat) return errorResponse(id, ErrorCode.InvalidRequest, incompat);
      return okResponse(
        id,
        buildInitializeResult(opts.identity, opts.capabilities, opts.kindCapabilities, opts.pluginKinds),
      );
    }
    case '$/ping':
      return okResponse(id, {});
    case 'health/check':
      return handleHealth(id, opts);
    case 'shutdown':
      return okResponse(id, {});
    case 'exit':
      // Flush the reply before terminating; a timer races the stdout queue.
      void wire.sendResponse(okResponse(id, {})).finally(() => process.exit(0));
      return undefined;
    default:
      return dispatchDomain(id, frame, opts);
  }
}

async function handleHealth(id: RpcId, opts: ServeLoopOptions): Promise<RpcResponse> {
  if (!opts.health) return okResponse(id, buildHealthOk());
  try {
    const report = await opts.health({ request_id: id });
    return okResponse(id, {
      status: report.status,
      uptime_ms: report.uptime_ms ?? null,
      memory_usage_bytes: report.memory_usage_bytes ?? null,
      last_error: report.last_error ?? null,
    });
  } catch (err) {
    return okResponse(id, {
      status: 'unhealthy',
      uptime_ms: null,
      memory_usage_bytes: null,
      last_error: `health probe threw: ${String(err)}`,
    });
  }
}

/** Extract a JSON-RPC error code from a thrown value, if present.
 *  Only honours a finite integer — undefined, NaN, floats, and strings are
 *  rejected so stray numeric properties never leak a nonsense code. */
function extractRpcCode(err: unknown): number | null {
  if (err === null || typeof err !== 'object') return null;
  const code = (err as Record<string, unknown>).code;
  if (typeof code === 'number' && Number.isInteger(code) && Number.isFinite(code)) return code;
  return null;
}

async function dispatchDomain(id: RpcId, frame: RpcRequest, opts: ServeLoopOptions): Promise<RpcResponse> {
  const handler = opts.methods.get(frame.method);
  if (!handler) return errorResponse(id, ErrorCode.MethodNotFound, `unknown method '${frame.method}'`);
  const ctx: CallContext = { request_id: id, actor: extractActor(frame.params) };
  try {
    const result = await handler(frame.params, ctx);
    return okResponse(id, result ?? null);
  } catch (err) {
    const code = extractRpcCode(err);
    if (code !== null) {
      const message = typeof (err as Record<string, unknown>).message === 'string'
        ? (err as Record<string, unknown>).message as string
        : String(err);
      const data = (err as Record<string, unknown>).data;
      return errorResponse(id, code, message, data);
    }
    return errorResponse(id, ErrorCode.InternalError, `${frame.method} failed: ${String(err)}`);
  }
}
