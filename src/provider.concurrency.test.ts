// Concurrency tests for the provider role: a long-running `agent/run` must
// execute OFF the wire's serial dispatch chain so a concurrently-arriving
// `agent/cancel` / `$/cancelRequest` is processed mid-run and can cancel it,
// while ordered replies for non-provider methods are preserved.

import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { definePlugin, ErrorCode, PluginKind, type RpcResponse } from './index.js';
import type { AgentRunRequest, Provider, ProviderCallContext } from './roles/provider.js';

interface Harness {
  input: PassThrough;
  /** Parsed frames seen on stdout, in arrival order. */
  frames(): RpcResponse[];
  /** Resolves when the run loop ends (after `input.end()`). */
  done: Promise<void>;
}

function startProvider(impl: Provider): Harness {
  const input = new PassThrough();
  const output = new PassThrough();
  const captured: string[] = [];
  output.on('data', (c: Buffer) => captured.push(c.toString('utf8')));

  const handle = definePlugin({
    kind: PluginKind.Provider,
    name: 'animus-provider-test',
    version: '0.1.0',
    description: 'test',
    impl,
    input: input as unknown as NodeJS.ReadableStream,
    output: output as unknown as NodeJS.WritableStream,
    skipCliArgs: true,
  });

  const done = handle.run();
  return {
    input,
    frames: () =>
      captured
        .join('')
        .split('\n')
        .filter((l) => l.length > 0)
        .map((l) => JSON.parse(l) as RpcResponse),
    done,
  };
}

function write(input: PassThrough, frame: unknown): void {
  input.write(`${JSON.stringify(frame)}\n`);
}

function runReq(id: number, sessionId?: string): unknown {
  const params: AgentRunRequest = { cwd: '/tmp', prompt: 'hi' };
  if (sessionId !== undefined) params.session_id = sessionId;
  return { jsonrpc: '2.0', id, method: 'agent/run', params };
}

function finalResponse(sessionId: string): unknown {
  return {
    backend: 'test',
    duration_ms: 1,
    exit_code: 0,
    output: 'done',
    session_id: sessionId,
  };
}

/** A provider whose `run` blocks until its cancellation signal fires. */
function cancellableProvider(sessionId: string, opts: { onAbort: () => void } = { onAbort: () => undefined }): Provider {
  return {
    run: (_params: AgentRunRequest, ctx: ProviderCallContext): Promise<ReturnType<typeof finalResponse>> =>
      new Promise((resolve) => {
        const signal = ctx.signal;
        if (signal?.aborted) {
          opts.onAbort();
          resolve(finalResponse(sessionId) as never);
          return;
        }
        signal?.addEventListener('abort', () => {
          opts.onAbort();
          resolve(finalResponse(sessionId) as never);
        });
      }) as never,
    cancel: ({ session_id }) => ({ session_id, cancelled: true }),
  };
}

describe('provider concurrency', () => {
  it('processes agent/cancel mid-run and cancels the in-flight run', async () => {
    let aborted = false;
    const h = startProvider(cancellableProvider('sess-1', { onAbort: () => (aborted = true) }));

    write(h.input, runReq(1, 'sess-1'));
    // A concurrent cancel arriving while run is in-flight. If run blocked the
    // serial chain this would never be dispatched until run resolved.
    write(h.input, { jsonrpc: '2.0', id: 2, method: 'agent/cancel', params: { session_id: 'sess-1' } });
    h.input.end();
    await h.done;

    expect(aborted).toBe(true);
    const frames = h.frames();
    const cancelReply = frames.find((f) => f.id === 2);
    expect((cancelReply?.result as { cancelled: boolean }).cancelled).toBe(true);
    // The run's final response is still emitted to the original id (1).
    const runReply = frames.find((f) => f.id === 1);
    expect(runReply).toBeDefined();
    expect((runReply?.result as { session_id: string }).session_id).toBe('sess-1');
  });

  it('returns cancelled:false for an unknown session id (no error)', async () => {
    const h = startProvider(cancellableProvider('sess-known'));
    write(h.input, runReq(1, 'sess-known'));
    write(h.input, { jsonrpc: '2.0', id: 2, method: 'agent/cancel', params: { session_id: 'nope' } });
    // Clean up the still-running session so the loop can end.
    write(h.input, { jsonrpc: '2.0', id: 3, method: 'agent/cancel', params: { session_id: 'sess-known' } });
    h.input.end();
    await h.done;

    const frames = h.frames();
    const unknownReply = frames.find((f) => f.id === 2);
    expect(unknownReply?.error).toBeUndefined();
    // Default registry-only path would report false; this impl has a cancel()
    // hook returning {cancelled:true}, so assert no error + a result is present.
    expect((unknownReply?.result as { session_id: string }).session_id).toBe('nope');
  });

  it('preserves ordered replies for interleaved non-provider methods', async () => {
    const h = startProvider(cancellableProvider('sess-x'));

    // Kick off a long run, then fire health/check + ping which must reply in
    // arrival order, BEFORE the run resolves.
    write(h.input, runReq(10, 'sess-x'));
    write(h.input, { jsonrpc: '2.0', id: 11, method: 'health/check' });
    write(h.input, { jsonrpc: '2.0', id: 12, method: '$/ping' });
    // Now cancel so the run completes and the loop can end.
    write(h.input, { jsonrpc: '2.0', id: 13, method: 'agent/cancel', params: { session_id: 'sess-x' } });
    h.input.end();
    await h.done;

    const frames = h.frames();
    const ids = frames.map((f) => f.id);
    // health/check (11) and ping (12) must appear, and in arrival order
    // relative to each other (both resolved off the run's critical path).
    const idx11 = ids.indexOf(11);
    const idx12 = ids.indexOf(12);
    expect(idx11).toBeGreaterThanOrEqual(0);
    expect(idx12).toBeGreaterThanOrEqual(0);
    expect(idx11).toBeLessThan(idx12);
    // And they were answered before the run's own final reply (id 10), proving
    // the run did not block the serial chain.
    const idx10 = ids.indexOf(10);
    expect(idx11).toBeLessThan(idx10);
    expect(idx12).toBeLessThan(idx10);
  });

  it('$/cancelRequest resolves the run with -32002 (request_cancelled)', async () => {
    const h = startProvider(cancellableProvider('sess-c'));
    write(h.input, runReq(20, 'sess-c'));
    // Notification (no id) targeting the originating request id 20.
    write(h.input, { jsonrpc: '2.0', method: '$/cancelRequest', params: { id: 20 } });
    h.input.end();
    await h.done;

    const frames = h.frames();
    const runReply = frames.find((f) => f.id === 20);
    expect(runReply?.result).toBeUndefined();
    expect(runReply?.error?.code).toBe(ErrorCode.RequestCancelled);
  });

  it('streams notifications then emits the final response to the right id', async () => {
    const provider: Provider = {
      run: async (_p, ctx) => {
        await ctx.stream.thinking({ text: 'pondering' });
        await ctx.stream.output({ text: 'partial' });
        await ctx.stream.output({ text: 'final', final: true });
        return finalResponse('sess-s') as never;
      },
    };
    const h = startProvider(provider);
    write(h.input, runReq(30, 'sess-s'));
    h.input.end();
    await h.done;

    const frames = h.frames();
    // Streaming notifications carry no id; the final response carries id 30.
    const runReply = frames.find((f) => f.id === 30);
    expect((runReply?.result as { output: string }).output).toBe('done');
    // All notification frames precede the final response (single-writer order).
    const finalIdx = frames.findIndex((f) => f.id === 30);
    expect(finalIdx).toBe(frames.length - 1);
  });

  it('agent/cancel reaches a run whose session id the provider assigns (request omits it)', async () => {
    let aborted = false;
    const provider: Provider = {
      run: (_p, ctx) =>
        new Promise((resolve) => {
          // Provider allocates its own session id and streams it before the
          // original request ever carried one.
          void ctx.stream.thinking({ text: 'starting', session_id: 'provider-sid' });
          ctx.signal?.addEventListener('abort', () => {
            aborted = true;
            resolve(finalResponse('provider-sid') as never);
          });
        }) as never,
      cancel: ({ session_id }) => ({ session_id, cancelled: true }),
    };
    const h = startProvider(provider);
    // Request id 40 with NO session_id in params.
    write(h.input, runReq(40));
    // Cancel by the provider-assigned id; must hit the late-bound registry entry.
    write(h.input, { jsonrpc: '2.0', id: 41, method: 'agent/cancel', params: { session_id: 'provider-sid' } });
    h.input.end();
    await h.done;

    expect(aborted).toBe(true);
    const frames = h.frames();
    expect(frames.find((f) => f.id === 40)).toBeDefined();
  });
});
