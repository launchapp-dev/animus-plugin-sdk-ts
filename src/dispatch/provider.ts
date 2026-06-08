// provider dispatcher (spec §7.2). `agent/run` / `agent/resume` validate the
// request with the generated `AgentRunRequestSchema`, hand the impl a streaming
// sink that emits `agent/output|thinking|toolCall|toolResult|error`
// notifications, then reply with the final `AgentRunResponse`. `agent/cancel`
// best-effort terminates a session.
//
// Concurrency model (the fix for the deferred P2): `agent/run` / `agent/resume`
// run OFF the wire's serial dispatch chain. The dispatcher kicks the run off
// detached (registered with `wire.track` so EOF waits for it), returns "no
// immediate response", and owns sending its own final response later via
// `wire.sendResponse` — exactly like `trigger/watch` already streams
// notifications out-of-band. Because the run no longer occupies the serial
// chain, a subsequently-received `agent/cancel` or `$/cancelRequest` is
// dispatched while the run is still in-flight and can cancel it. All other
// methods (and all other roles) keep their in-order serial dispatch.

import type { AgentStream, Provider, ProviderCallContext } from '../roles/provider.js';
import { AgentRunRequestSchema, AgentCancelRequestSchema } from '../roles/provider.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, methodNotSupported, okResponse, validateParams, type Wire } from './shared.js';

export const PROVIDER_METHODS = {
  run: 'agent/run',
  resume: 'agent/resume',
  cancel: 'agent/cancel',
} as const;

/** A single in-flight provider session. */
interface ActiveSession {
  /**
   * Backend session id this run is indexed under, or `''` until known. Defaults
   * to the request's `session_id`; rebound via `bindSession` once the impl
   * emits/returns a provider-assigned id (so `agent/cancel` can reach a session
   * whose id the provider allocates itself).
   */
  sessionId: string;
  /** Originating JSON-RPC request id, for `$/cancelRequest` correlation. */
  requestId: RpcId;
  /** Cancellation handle handed to the impl via `ctx.signal`. */
  controller: AbortController;
  /**
   * Set when cancellation came via `$/cancelRequest` (spec §6.3): the run's
   * final reply is then forced to `-32002` regardless of what the cooperating
   * impl returns. A session-scoped `agent/cancel` aborts the signal too but
   * leaves this false — that path lets the impl resolve its own
   * `AgentRunResponse`.
   */
  cancelledByRequest: boolean;
}

/**
 * Per-plugin-instance registry of in-flight provider sessions. Keyed by
 * `session_id`, with a secondary index by originating JSON-RPC request id so
 * `$/cancelRequest` can find the session it started.
 */
export class ProviderSessionRegistry {
  private bySession = new Map<string, ActiveSession>();
  private byRequest = new Map<string, ActiveSession>();

  // JSON-RPC ids may be string OR number; `1` and `'1'` are distinct ids
  // (spec §6.3 / JSON-RPC 2.0). Type-tag the key so they never collide.
  private static requestKey(id: RpcId): string {
    if (typeof id === 'number') return `n:${id}`;
    if (typeof id === 'string') return `s:${id}`;
    return `x:${String(id)}`; // null/undefined
  }

  register(session: ActiveSession): void {
    // Only index a non-empty session id. A run with no request `session_id`
    // stays request-id-addressable (so `$/cancelRequest` still works) and is
    // bound under its real id later via `bindSession` — avoiding a shared `''`
    // entry that concurrent no-id runs would clobber.
    if (session.sessionId) this.bySession.set(session.sessionId, session);
    this.byRequest.set(ProviderSessionRegistry.requestKey(session.requestId), session);
  }

  /**
   * Index a session under a provider-assigned id learned after `register`
   * (e.g. the first streamed/returned `session_id`). Idempotent; ignores empty
   * ids and never overwrites a different session already holding that id.
   */
  bindSession(session: ActiveSession, sessionId: string): void {
    if (!sessionId || sessionId === session.sessionId) return;
    if (this.bySession.has(sessionId)) return;
    // Drop the old index entry if this session owned it, then rebind.
    if (session.sessionId && this.bySession.get(session.sessionId) === session) {
      this.bySession.delete(session.sessionId);
    }
    session.sessionId = sessionId;
    this.bySession.set(sessionId, session);
  }

  deregister(session: ActiveSession): void {
    // Only delete the registry entry if it still points at this session — a
    // resume that reuses the same session_id could have replaced it.
    if (session.sessionId && this.bySession.get(session.sessionId) === session) {
      this.bySession.delete(session.sessionId);
    }
    if (this.byRequest.get(ProviderSessionRegistry.requestKey(session.requestId)) === session) {
      this.byRequest.delete(ProviderSessionRegistry.requestKey(session.requestId));
    }
  }

  /**
   * Best-effort session-scoped cancel (`agent/cancel`). Aborts the run's signal
   * so a cooperating impl can stop and resolve its own `AgentRunResponse`. Does
   * NOT force a `-32002` reply (that is reserved for `$/cancelRequest`).
   * Returns true if a session was found.
   */
  cancelBySession(sessionId: string): boolean {
    const session = this.bySession.get(sessionId);
    if (!session) return false;
    session.controller.abort();
    return true;
  }

  /** Best-effort cancel by originating request id (`$/cancelRequest`). */
  cancelByRequest(id: RpcId): boolean {
    const session = this.byRequest.get(ProviderSessionRegistry.requestKey(id));
    if (!session) return false;
    session.cancelledByRequest = true;
    session.controller.abort();
    return true;
  }
}

// Spec §10.3: every `agent/*` notification carries `session_id`. We default it
// from the originating request's session_id (if any) so authors emitting
// streaming chunks before they have learned the backend session id still
// produce valid frames.
function makeStream(
  wire: Wire,
  sessionId?: string | null,
  onSessionId?: (id: string) => void,
): AgentStream {
  const sid = (p: { session_id?: string }) => {
    const resolved = p.session_id ?? sessionId ?? '';
    // Late-bind a provider-assigned session id so `agent/cancel` can reach this
    // run even when the original request omitted `session_id`.
    if (resolved && onSessionId) onSessionId(resolved);
    return resolved;
  };
  // Each notification carries the `AgentNotification` internally-tagged `kind`
  // discriminator (`output`/`thinking`/`toolCall`/`toolResult`/`error`) plus
  // `session_id`, so a host decoding params as `AgentNotification` accepts them.
  return {
    // Emit BOTH `final` (spec §10.3 table) and `is_final` (the generated
    // `AgentNotification` field) so hosts decoding either name see the
    // finality marker.
    output: (p) => {
      const isFinal = p.final ?? false;
      return wire.notify('agent/output', {
        kind: 'output',
        ...p,
        session_id: sid(p),
        final: isFinal,
        is_final: isFinal,
      });
    },
    thinking: (p) => wire.notify('agent/thinking', { kind: 'thinking', ...p, session_id: sid(p) }),
    // `arguments` / `output` are required by the generated AgentNotification
    // schema; default them so a sparse author call still produces a valid frame.
    toolCall: (p) =>
      wire.notify('agent/toolCall', { kind: 'toolCall', arguments: {}, ...p, session_id: sid(p) }),
    toolResult: (p) =>
      wire.notify('agent/toolResult', { kind: 'toolResult', output: '', success: true, ...p, session_id: sid(p) }),
    error: (p) => wire.notify('agent/error', { kind: 'error', recoverable: false, ...p, session_id: sid(p) }),
  };
}

/**
 * Drive a long-running `agent/run` / `agent/resume` off the serial dispatch
 * chain. Registers the session (so `agent/cancel` / `$/cancelRequest` can reach
 * it), runs the impl, and sends the final response itself via
 * `wire.sendResponse`. If the run was cancelled by request id, the final reply
 * is a `-32002` (request_cancelled) error per spec §6.3 + §4; otherwise it is
 * the author's `AgentRunResponse` (or `-32603` on a thrown error).
 */
function runDetached(
  id: RpcId,
  wire: Wire,
  registry: ProviderSessionRegistry,
  call: (ctx: ProviderCallContext) => Promise<unknown> | unknown,
  resolvedSessionId: string,
): void {
  const controller = new AbortController();
  const session: ActiveSession = {
    sessionId: resolvedSessionId,
    requestId: id,
    controller,
    cancelledByRequest: false,
  };
  registry.register(session);

  const ctx: ProviderCallContext = {
    request_id: id,
    signal: controller.signal,
    stream: makeStream(wire, resolvedSessionId, (sid) => registry.bindSession(session, sid)),
  };

  const work = (async (): Promise<void> => {
    let response: RpcResponse;
    try {
      const result = await call(ctx);
      // Late-bind from the final response's session_id too, in case the impl
      // returned a provider-assigned id without streaming one first.
      const finalSid = (result as { session_id?: unknown } | null)?.session_id;
      if (typeof finalSid === 'string') registry.bindSession(session, finalSid);
      // A run cancelled via `$/cancelRequest` resolves with -32002 regardless of
      // what the (cooperating) impl returned, per spec §6.3.
      response = session.cancelledByRequest
        ? errorResponse(id, ErrorCode.RequestCancelled, 'request cancelled')
        : okResponse(id, result);
    } catch (err) {
      response = session.cancelledByRequest
        ? errorResponse(id, ErrorCode.RequestCancelled, 'request cancelled')
        : errorResponse(id, ErrorCode.InternalError, `provider error: ${String(err)}`);
    } finally {
      registry.deregister(session);
    }
    await wire.sendResponse(response);
  })();

  // Gate EOF on this run so its final response flushes before the loop ends.
  wire.track(work);
}

export function dispatchProvider(
  id: RpcId,
  frame: RpcRequest,
  wire: Wire,
  impl: Provider,
  registry: ProviderSessionRegistry,
): RpcResponse | undefined {
  const method = frame.method;
  switch (method) {
    case PROVIDER_METHODS.run: {
      const v = validateParams(id, AgentRunRequestSchema, frame.params);
      if (!v.ok) return v.response;
      runDetached(id, wire, registry, (ctx) => impl.run(v.value, ctx), v.value.session_id ?? '');
      return undefined; // detached; final response sent later via wire.sendResponse
    }
    case PROVIDER_METHODS.resume: {
      if (!impl.resume) return methodNotSupported(id, method);
      const resume = impl.resume.bind(impl);
      const v = validateParams(id, AgentRunRequestSchema, frame.params);
      if (!v.ok) return v.response;
      // TODO(codex-p2): `agent/resume` shares `AgentRunRequestSchema` with
      // `agent/run`, so a resume that omits `session_id` is accepted and the
      // impl is handed an empty id. Spec §7.2 says resume carries `session_id`
      // "set". Rejecting an unset id here is a pre-existing behavior change
      // orthogonal to the concurrency fix and could regress lenient providers /
      // conformance fixtures, so it is deferred to a focused follow-up rather
      // than bundled into this change.
      runDetached(id, wire, registry, (ctx) => resume(v.value, ctx), v.value.session_id ?? '');
      return undefined; // detached; final response sent later via wire.sendResponse
    }
    case PROVIDER_METHODS.cancel: {
      const v = validateParams(id, AgentCancelRequestSchema, frame.params);
      if (!v.ok) return v.response;
      // Trigger the in-flight session's cancellation handle, if any. We report
      // `cancelled` based on whether a live session was found, then also invoke
      // the optional author `cancel()` hook for backend-side teardown.
      const found = registry.cancelBySession(v.value.session_id);
      if (impl.cancel) {
        try {
          const out = impl.cancel(v.value, { request_id: id });
          if (out instanceof Promise) {
            // Honor the author's reported result, but never let a thrown/async
            // cancel hook block the serial chain — resolve it out-of-band.
            wire.track(
              out
                .then((res) => wire.sendResponse(okResponse(id, res)))
                .catch((err) =>
                  wire.sendResponse(errorResponse(id, ErrorCode.InternalError, `provider error: ${String(err)}`)),
                ),
            );
            return undefined;
          }
          return okResponse(id, out);
        } catch (err) {
          return errorResponse(id, ErrorCode.InternalError, `provider error: ${String(err)}`);
        }
      }
      return okResponse(id, { session_id: v.value.session_id, cancelled: found });
    }
    default:
      return methodNotFound(id, method);
  }
}
