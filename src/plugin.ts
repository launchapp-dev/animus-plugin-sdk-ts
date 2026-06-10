// `definePlugin(spec)` — single entrypoint for authoring an Animus plugin.
//
// Authors describe their plugin (identity + role + impl) and the SDK:
//   1. handles `--manifest` CLI shortcut
//   2. runs the stdio JSON-RPC loop
//   3. dispatches lifecycle methods (initialize/$/ping/health/check/shutdown/exit)
//   4. validates inbound domain params with the generated Zod schemas and
//      routes them to the author's `impl`
//   5. forwards unknown methods as MethodNotFound
//
// All plugin roles from spec.md §7 are wired: subject_backend, trigger_backend,
// provider, log_storage_backend, transport_backend, queue, workflow_runner,
// durable_store, memory_store, notifier.

import process from 'node:process';
import { stdout as nodeStdout } from 'node:process';

import {
  buildInitializeResult,
  buildManifest,
  validateInitializeParams,
  type PluginIdentity,
} from './handshake.js';
import type { CallContext } from './roles/context.js';
import type { Subject, SubjectBackend } from './roles/subject.js';
import type { TriggerBackend, TriggerEvent } from './roles/trigger.js';
import type { Provider } from './roles/provider.js';
import type { TransportBackend } from './roles/transport.js';
import type { LogStorageBackend } from './roles/log-storage.js';
import type { Queue } from './roles/queue.js';
import type { WorkflowRunner } from './roles/workflow-runner.js';
import type { DurableStore } from './roles/durable-store.js';
import type { MemoryStore } from './roles/memory-store.js';
import type { Notifier } from './roles/notifier.js';
import { createWire, errorResponse, okResponse, type Wire } from './wire.js';
import {
  ErrorCode,
  PluginKind,
  type EnvRequirement,
  type HealthCheckResult,
  type InitializeParams,
  type KindCapability,
  type PluginCapabilities,
  type PluginManifest,
  type RpcId,
  type RpcRequest,
  type RpcResponse,
} from './types/index.js';

import { dispatchSubject, deriveSubjectCapabilities, ensureWireSubject } from './dispatch/subject.js';
import { dispatchTrigger, deriveTriggerCapabilities } from './dispatch/trigger.js';
import { dispatchProvider, PROVIDER_METHODS, ProviderSessionRegistry } from './dispatch/provider.js';
import { dispatchLogStorage, LOG_STORAGE_METHODS } from './dispatch/log-storage.js';
import { dispatchTransport, TRANSPORT_METHODS } from './dispatch/transport.js';
import { dispatchQueue, QUEUE_METHODS, QUEUE_RELEASE_PENDING } from './dispatch/queue.js';
import { dispatchWorkflowRunner, WORKFLOW_RUNNER_METHODS } from './dispatch/workflow-runner.js';
import { dispatchDurableStore, DURABLE_STORE_METHODS } from './dispatch/durable-store.js';
import { dispatchMemoryStore, MEMORY_STORE_METHODS } from './dispatch/memory-store.js';
import { dispatchNotifier, deriveNotifierCapabilities } from './dispatch/notifier.js';

type RoleSpec =
  | { kind: typeof PluginKind.SubjectBackend; impl: SubjectBackend; subject_kinds?: string[]; projections?: string[] }
  | { kind: typeof PluginKind.Provider; impl: Provider }
  | { kind: typeof PluginKind.TriggerBackend; impl: TriggerBackend; capabilities?: string[] }
  | { kind: typeof PluginKind.TransportBackend; impl: TransportBackend; capabilities?: string[] }
  | { kind: typeof PluginKind.LogStorageBackend; impl: LogStorageBackend }
  | { kind: typeof PluginKind.Queue; impl: Queue }
  | { kind: typeof PluginKind.WorkflowRunner; impl: WorkflowRunner }
  | { kind: typeof PluginKind.DurableStore; impl: DurableStore }
  | { kind: typeof PluginKind.MemoryStore; impl: MemoryStore }
  | { kind: typeof PluginKind.Notifier; impl: Notifier };

export type PluginSpec = RoleSpec & {
  name: string;
  version: string;
  description: string;
  env_required?: EnvRequirement[];
  /** Author hint for the host's notification broadcast channel capacity. */
  notification_buffer_size?: number | null;
  /** Extra opt-in capability strings (e.g. `$harness/...`) advertised verbatim. */
  extra_capabilities?: string[];
  /** Optional override of the inbound stream (for testing). */
  input?: NodeJS.ReadableStream;
  /** Optional override of the outbound stream (for testing). */
  output?: NodeJS.WritableStream;
  /** Skip the `--manifest` CLI shortcut (useful in tests). */
  skipCliArgs?: boolean;
};

export interface PluginHandle {
  /** Drive the JSON-RPC loop until the input stream closes. */
  run(): Promise<void>;
  /** Static manifest for this plugin (also what `--manifest` prints). */
  manifest(): PluginManifest;
  /** Build the `initialize` reply (exposed for tests). */
  initialize(params: InitializeParams): RpcResponse;
}

function deriveCapabilities(spec: PluginSpec): PluginCapabilities {
  switch (spec.kind) {
    case PluginKind.SubjectBackend:
      return deriveSubjectCapabilities(spec.impl, spec.subject_kinds ?? [], spec.projections ?? []);
    case PluginKind.TriggerBackend:
      return deriveTriggerCapabilities(spec.impl, spec.capabilities ?? []);
    case PluginKind.Provider: {
      // Advertise only what we can serve — `agent/run` is required; resume/
      // cancel are optional and gated on the impl so the host's preflight
      // doesn't route them here when absent.
      const methods = [PROVIDER_METHODS.run, 'health/check'];
      if (spec.impl.resume) methods.push(PROVIDER_METHODS.resume);
      if (spec.impl.cancel) methods.push(PROVIDER_METHODS.cancel);
      // `cancellation` advertises `$/cancelRequest` support, which the SDK now
      // wires: a `$/cancelRequest` for an in-flight run aborts it via the
      // session's AbortSignal and resolves the run with `-32002`. `agent/cancel`
      // (in `methods` when the impl provides it) is the session-scoped surface.
      return { methods, streaming: true, progress: false, cancellation: true };
    }
    case PluginKind.LogStorageBackend: {
      const methods = [LOG_STORAGE_METHODS.store, LOG_STORAGE_METHODS.schema, 'health/check'];
      if (spec.impl.query) methods.push(LOG_STORAGE_METHODS.query);
      if (spec.impl.tail) methods.push(LOG_STORAGE_METHODS.tail);
      return { methods, streaming: !!spec.impl.tail, progress: false, cancellation: false };
    }
    case PluginKind.TransportBackend: {
      const methods = [TRANSPORT_METHODS.start, TRANSPORT_METHODS.shutdown, TRANSPORT_METHODS.schema, 'health/check'];
      return { methods, streaming: false, progress: false, cancellation: false };
    }
    case PluginKind.Queue: {
      const methods = [...Object.values(QUEUE_METHODS), 'health/check'];
      if (spec.impl.release_pending) methods.push(QUEUE_RELEASE_PENDING);
      return { methods, streaming: false };
    }
    case PluginKind.WorkflowRunner:
      return { methods: [...Object.values(WORKFLOW_RUNNER_METHODS), 'health/check'], streaming: false };
    case PluginKind.DurableStore:
      return { methods: [...Object.values(DURABLE_STORE_METHODS), 'health/check'], streaming: false };
    case PluginKind.MemoryStore:
      return { methods: [...Object.values(MEMORY_STORE_METHODS), 'health/check'], streaming: false };
    case PluginKind.Notifier:
      return deriveNotifierCapabilities(spec.impl);
    default:
      return { methods: [] };
  }
}

function validateSpec(spec: PluginSpec): void {
  if (!spec.name || typeof spec.name !== 'string') throw new TypeError('definePlugin: `name` is required');
  if (!spec.version || typeof spec.version !== 'string') throw new TypeError('definePlugin: `version` is required');
  if (!spec.description || typeof spec.description !== 'string')
    throw new TypeError('definePlugin: `description` is required');
  if (!spec.kind) throw new TypeError('definePlugin: `kind` is required');
  const valid = new Set<string>(Object.values(PluginKind));
  if (!valid.has(spec.kind)) throw new TypeError(`definePlugin: unknown kind '${spec.kind}'`);
  if (!spec.impl || typeof spec.impl !== 'object') throw new TypeError('definePlugin: `impl` is required');

  const requireMethods = (kind: string, impl: Record<string, unknown>, methods: string[]) => {
    for (const m of methods) {
      if (typeof impl[m] !== 'function') throw new TypeError(`${kind} impl must implement ${m}()`);
    }
  };

  switch (spec.kind) {
    case PluginKind.SubjectBackend:
      requireMethods('subject_backend', spec.impl as never, ['list', 'get']);
      return;
    case PluginKind.TriggerBackend:
      requireMethods('trigger_backend', spec.impl as never, ['watch']);
      return;
    case PluginKind.Provider:
      requireMethods('provider', spec.impl as never, ['run']);
      return;
    case PluginKind.TransportBackend:
      requireMethods('transport_backend', spec.impl as never, ['start']);
      return;
    case PluginKind.LogStorageBackend:
      requireMethods('log_storage_backend', spec.impl as never, ['store']);
      return;
    case PluginKind.Queue:
      // All queue methods are advertised and dispatched unconditionally, so
      // require the full set up front rather than failing with a TypeError at
      // call time for a JS-authored / cast impl missing one.
      requireMethods('queue', spec.impl as never, [
        'enqueue',
        'list',
        'lease',
        'stats',
        'hold',
        'release',
        'drop',
        'mark_assigned',
        'completion',
        'reorder',
      ]);
      return;
    case PluginKind.WorkflowRunner:
      requireMethods('workflow_runner', spec.impl as never, ['execute', 'run_phase']);
      return;
    case PluginKind.DurableStore:
      requireMethods('durable_store', spec.impl as never, [
        'begin_workflow_run',
        'begin_step',
        'commit_step',
        'abandon_step',
        'recover_in_flight',
        'query_run',
      ]);
      return;
    case PluginKind.MemoryStore:
      requireMethods('memory_store', spec.impl as never, ['put', 'get', 'query', 'list_scopes', 'delete_scope']);
      return;
    case PluginKind.Notifier:
      requireMethods('notifier', spec.impl as never, ['notify']);
      return;
    default:
      throw new Error(`definePlugin: kind '${(spec as { kind: string }).kind}' is not supported`);
  }
}

function buildHealthOk(): HealthCheckResult {
  return { status: 'healthy', uptime_ms: null, memory_usage_bytes: null, last_error: null };
}

export function definePlugin(spec: PluginSpec): PluginHandle {
  validateSpec(spec);
  const identity: PluginIdentity = {
    name: spec.name,
    version: spec.version,
    description: spec.description,
    plugin_kind: spec.kind,
  };
  const capabilities = deriveCapabilities(spec);

  const methodCaps = capabilities.methods ?? [];
  const advertised: string[] = [];
  if (spec.kind === PluginKind.TransportBackend && spec.capabilities) advertised.push(...spec.capabilities);
  if (spec.extra_capabilities) advertised.push(...spec.extra_capabilities);
  for (const c of advertised) {
    if (!methodCaps.includes(c)) methodCaps.push(c);
  }
  capabilities.methods = methodCaps;

  // Manifest-only capability tokens that aid host preflight without spawning.
  const extraCaps: string[] = [];
  if (spec.kind === PluginKind.SubjectBackend && spec.subject_kinds) {
    for (const k of spec.subject_kinds) extraCaps.push(`subject_kind:${k}`);
  }

  // v1.1.0: advertise the per-kind protocol crate version via kind_capabilities
  // for the new kinds. v1.0.0 kinds leave this empty so the wire output stays
  // byte-identical for the 299 published subject plugins.
  const kindCapabilities = deriveKindCapabilities(spec);

  const manifestPayload: PluginManifest = buildManifest(identity, capabilities, {
    env_required: spec.env_required,
    notification_buffer_size: spec.notification_buffer_size,
    extra_capabilities: extraCaps,
  });

  const handle: PluginHandle = {
    manifest: () => manifestPayload,
    initialize: (params) => {
      const incompat = validateInitializeParams(params);
      if (incompat) return errorResponse(null, ErrorCode.InvalidRequest, incompat);
      return okResponse(null, buildInitializeResult(identity, capabilities, kindCapabilities));
    },
    run: () => runLoop(spec, manifestPayload, identity, capabilities, kindCapabilities),
  };
  return handle;
}

function deriveKindCapabilities(spec: PluginSpec): Record<string, KindCapability> | undefined {
  // Only emit for v1.1.0 kinds; keep empty for v1.0.0 kinds (back-compat).
  const v11: Record<string, string> = {
    [PluginKind.WorkflowRunner]: 'workflow_runner',
    [PluginKind.Queue]: 'queue',
    [PluginKind.DurableStore]: 'durable_store',
    [PluginKind.MemoryStore]: 'memory_store',
    [PluginKind.Notifier]: 'notifier',
  };
  const key = v11[spec.kind];
  if (!key) return undefined;
  return { [key]: { crate_version: '0.1.0', extra: {} } };
}

async function runLoop(
  spec: PluginSpec,
  manifestPayload: PluginManifest,
  identity: PluginIdentity,
  capabilities: PluginCapabilities,
  kindCapabilities: Record<string, KindCapability> | undefined,
): Promise<void> {
  if (!spec.skipCliArgs) {
    const args = process.argv.slice(2);
    if (args.includes('--manifest') || args.includes('-m')) {
      await new Promise<void>((resolve, reject) => {
        nodeStdout.write(`${JSON.stringify(manifestPayload)}\n`, (err) => (err ? reject(err) : resolve()));
      });
      process.exit(0);
    }
    if (args.includes('--help') || args.includes('-h')) {
      await new Promise<void>((resolve) => {
        process.stderr.write(
          `${identity.name} ${identity.version} - Animus STDIO plugin\n` +
            'Usage:\n' +
            `  ${identity.name} --manifest    Print plugin manifest as JSON and exit\n` +
            `  ${identity.name}               Run JSON-RPC loop on stdin/stdout\n`,
          () => resolve(),
        );
      });
      process.exit(0);
    }
  }

  const wire: Wire = createWire({
    input: spec.input as NodeJS.ReadableStream | undefined as never,
    output: spec.output as NodeJS.WritableStream | undefined as never,
  });

  // One session registry per plugin instance. Only provider plugins populate
  // it (run/resume register; agent/cancel + $/cancelRequest interrupt).
  const providerSessions = new ProviderSessionRegistry();

  await wire.run((frame) =>
    dispatch(frame, wire, spec, identity, capabilities, kindCapabilities, providerSessions),
  );
}

async function dispatch(
  frame: RpcRequest,
  wire: Wire,
  spec: PluginSpec,
  identity: PluginIdentity,
  capabilities: PluginCapabilities,
  kindCapabilities: Record<string, KindCapability> | undefined,
  providerSessions: ProviderSessionRegistry,
): Promise<RpcResponse | undefined> {
  const id = frame.id;
  const method = frame.method;

  // Notifications (no id): never respond.
  if (id === undefined) {
    if (method === 'exit') {
      setImmediate(() => process.exit(0));
      return undefined;
    }
    if (method === 'trigger/ack' && spec.kind === PluginKind.TriggerBackend) {
      void dispatchTrigger(null, frame, wire, spec.impl);
      return undefined;
    }
    // `$/cancelRequest` (spec §6.3): for a provider, best-effort cancel the
    // in-flight run started by that request id. The detached run then resolves
    // with `-32002` (request_cancelled). For other roles this is a no-op. We
    // run this on the serial chain (it's cheap + synchronous), so it stays
    // ordered relative to other inbound frames.
    if (method === '$/cancelRequest' && spec.kind === PluginKind.Provider) {
      const cancelId = (frame.params as { id?: RpcId } | undefined)?.id;
      if (cancelId !== undefined) providerSessions.cancelByRequest(cancelId);
      return undefined;
    }
    // `initialized`, `$/progress`, and unknown notifications are dropped
    // silently to match the Rust runtime.
    return undefined;
  }

  switch (method) {
    case 'initialize': {
      const params = (frame.params ?? {}) as InitializeParams;
      const incompat = validateInitializeParams(params);
      if (incompat) return errorResponse(id, ErrorCode.InvalidRequest, incompat);
      return okResponse(id, buildInitializeResult(identity, capabilities, kindCapabilities));
    }
    case '$/ping':
      return okResponse(id, {});
    case 'health/check':
      return handleHealth(id, spec);
    case 'shutdown':
      return okResponse(id, {});
    case 'exit': {
      // Flush the reply before terminating; exiting on a timer races the
      // stdout write queue and can truncate the response frame.
      void wire.sendResponse(okResponse(id, {})).finally(() => process.exit(0));
      return undefined;
    }
    default:
      return dispatchRole(id, frame, wire, spec, providerSessions);
  }
}

async function handleHealth(id: RpcId, spec: PluginSpec): Promise<RpcResponse> {
  const impl = spec.impl as { health?: (ctx: CallContext) => unknown };
  if (typeof impl.health === 'function') {
    try {
      const report = (await impl.health({ request_id: id })) as {
        status: string;
        uptime_ms?: number | null;
        memory_usage_bytes?: number | null;
        last_error?: string | null;
      };
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
  return okResponse(id, buildHealthOk());
}

async function dispatchRole(
  id: RpcId,
  frame: RpcRequest,
  wire: Wire,
  spec: PluginSpec,
  providerSessions: ProviderSessionRegistry,
): Promise<RpcResponse | undefined> {
  switch (spec.kind) {
    case PluginKind.SubjectBackend:
      return dispatchSubject(id, frame, spec.impl, spec.subject_kinds ?? []);
    case PluginKind.TriggerBackend:
      return dispatchTrigger(id, frame, wire, spec.impl);
    case PluginKind.Provider:
      return dispatchProvider(id, frame, wire, spec.impl, providerSessions);
    case PluginKind.LogStorageBackend:
      return dispatchLogStorage(id, frame, wire, spec.impl);
    case PluginKind.TransportBackend:
      return dispatchTransport(id, frame, spec.impl);
    case PluginKind.Queue:
      return dispatchQueue(id, frame, spec.impl);
    case PluginKind.WorkflowRunner:
      return dispatchWorkflowRunner(id, frame, spec.impl);
    case PluginKind.DurableStore:
      return dispatchDurableStore(id, frame, spec.impl);
    case PluginKind.MemoryStore:
      return dispatchMemoryStore(id, frame, spec.impl);
    case PluginKind.Notifier:
      return dispatchNotifier(id, frame, spec.impl);
    default:
      return errorResponse(id, ErrorCode.MethodNotFound, `unknown method '${frame.method}'`);
  }
}

// Re-export the wire-subject backfill helper for tests.
export { ensureWireSubject };
export type { Subject, TriggerEvent };
