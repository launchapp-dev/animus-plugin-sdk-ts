import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { definePlugin, ErrorCode, PluginKind, PROTOCOL_VERSION, type RpcResponse } from './index.js';

// Generated Zod schemas (codegen output must compile + validate).
// `WireSubjectSchema` is the Zod schema for the `Subject` type (renamed to
// avoid colliding with the Rust `SubjectSchema` capability type).
import { WireSubjectSchema, SubjectFilterSchema } from './subject.js';
import { AgentRunRequestSchema } from './provider.js';
import { LogEntrySchema } from './log-storage.js';
import { TransportConfigSchema } from './transport.js';
import { QueueEnqueueRequestSchema, QueueLeaseRequestSchema } from './queue.js';

const NOW = '2026-06-07T00:00:00.000Z';

// Drive a plugin over an in-memory wire: write the given frames, end the
// stream, and return the parsed response/notification frames.
async function drive(
  handleSpec: Parameters<typeof definePlugin>[0],
  frames: object[],
): Promise<Array<RpcResponse & { method?: string; params?: Record<string, unknown> }>> {
  const input = new PassThrough();
  const output = new PassThrough();
  const captured: string[] = [];
  output.on('data', (c: Buffer) => captured.push(c.toString('utf8')));
  const handle = definePlugin({
    ...handleSpec,
    input: input as unknown as NodeJS.ReadableStream,
    output: output as unknown as NodeJS.WritableStream,
    skipCliArgs: true,
  } as Parameters<typeof definePlugin>[0]);
  const done = handle.run();
  for (const f of frames) input.write(`${JSON.stringify(f)}\n`);
  input.end();
  await done;
  return captured
    .join('')
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

// ---- codegen output validates real frames ---------------------------------

describe('generated Zod schemas', () => {
  it('WireSubjectSchema accepts a full wire subject and infers a usable type', () => {
    const parsed = WireSubjectSchema.parse({
      id: 'task:1',
      kind: 'task',
      title: 'hi',
      status: 'ready',
      created_at: NOW,
      updated_at: NOW,
    });
    expect(parsed.id).toBe('task:1');
  });

  it('SubjectFilterSchema is permissive about optional/empty filters', () => {
    expect(SubjectFilterSchema.parse({}).limit).toBeUndefined();
    expect(SubjectFilterSchema.parse({ status: ['ready'], kind: ['task'] }).status).toEqual(['ready']);
  });

  it('AgentRunRequestSchema rejects a malformed request (missing required prompt/cwd)', () => {
    expect(AgentRunRequestSchema.safeParse({}).success).toBe(false);
    expect(AgentRunRequestSchema.safeParse({ prompt: 'hi', cwd: '/x' }).success).toBe(true);
  });

  it('LogEntrySchema validates a sample entry', () => {
    expect(
      LogEntrySchema.safeParse({
        id: 'e1',
        ts: NOW,
        level: 'info',
        source: 'plugin',
        target: 'plugin.test',
        message: 'hi',
      }).success,
    ).toBe(true);
  });

  it('TransportConfigSchema requires control_socket_path + project_root', () => {
    expect(TransportConfigSchema.safeParse({}).success).toBe(false);
    expect(
      TransportConfigSchema.safeParse({ control_socket_path: '/s.sock', project_root: '/p' }).success,
    ).toBe(true);
  });

  it('QueueEnqueueRequestSchema rejects missing dispatch', () => {
    expect(QueueEnqueueRequestSchema.safeParse({}).success).toBe(false);
  });

  it('emits numeric bounds from the schema (QueueLeaseRequest.max >= 0)', () => {
    expect(QueueLeaseRequestSchema.safeParse({ max: -1 }).success).toBe(false);
    expect(QueueLeaseRequestSchema.safeParse({ max: 5 }).success).toBe(true);
  });
});

// ---- provider role ---------------------------------------------------------

describe('provider dispatcher', () => {
  it('streams agent/* notifications then a final AgentRunResponse', async () => {
    const frames = await drive(
      {
        kind: PluginKind.Provider,
        name: 'p',
        version: '0.1.0',
        description: 'd',
        impl: {
          run: async (params, ctx) => {
            await ctx.stream.thinking({ text: 'pondering' });
            await ctx.stream.output({ text: 'hello' });
            await ctx.stream.toolCall({ name: 'read', arguments: { path: 'x' } });
            return {
              session_id: 's1',
              exit_code: 0,
              output: 'done',
              metadata: [],
              tool_calls: [],
              tool_results: [],
              thinking: [],
              errors: [],
              duration_ms: 5,
              backend: 'fake:1',
              tokens_used: { input: 1, output: 1, cached: 0, cache_writes: 0 },
            } as never;
          },
        },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'agent/run', params: { prompt: 'hi', cwd: '/repo' } }],
    );
    const notifs = frames.filter((f) => f.method?.startsWith('agent/'));
    expect(notifs.map((n) => n.method)).toEqual(['agent/thinking', 'agent/output', 'agent/toolCall']);
    const final = frames.find((f) => f.id === 1);
    expect((final?.result as { session_id: string }).session_id).toBe('s1');
  });

  it('rejects a malformed agent/run with invalid_params (Zod)', async () => {
    const frames = await drive(
      {
        kind: PluginKind.Provider,
        name: 'p',
        version: '0.1.0',
        description: 'd',
        impl: { run: async () => ({}) as never },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'agent/run', params: { model: 'x' } }],
    );
    expect(frames[0]?.error?.code).toBe(ErrorCode.InvalidParams);
  });

  it('returns method_not_supported for agent/resume when not implemented', async () => {
    const frames = await drive(
      {
        kind: PluginKind.Provider,
        name: 'p',
        version: '0.1.0',
        description: 'd',
        impl: { run: async () => ({}) as never },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'agent/resume', params: { prompt: 'hi', cwd: '/r' } }],
    );
    expect(frames[0]?.error?.code).toBe(ErrorCode.MethodNotSupported);
  });

  it('advertises agent/run but not unimplemented resume/cancel', () => {
    const m = definePlugin({
      kind: PluginKind.Provider,
      name: 'p',
      version: '0.1.0',
      description: 'd',
      impl: { run: async () => ({}) as never },
    }).manifest();
    expect(m.capabilities).toContain('agent/run');
    expect(m.capabilities).not.toContain('agent/resume');
    expect(m.capabilities).not.toContain('agent/cancel');
  });

  it('streaming notifications always carry session_id (spec §10.3)', async () => {
    const frames = await drive(
      {
        kind: PluginKind.Provider,
        name: 'p',
        version: '0.1.0',
        description: 'd',
        impl: {
          run: async (_p, ctx) => {
            await ctx.stream.output({ text: 'hi' }); // no session_id supplied
            return { session_id: 'from-req' } as never;
          },
        },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'agent/run', params: { prompt: 'hi', cwd: '/r', session_id: 'from-req' } }],
    );
    const out = frames.find((f) => f.method === 'agent/output');
    expect((out?.params as { session_id: string }).session_id).toBe('from-req');
  });
});

// ---- transport role --------------------------------------------------------

describe('transport dispatcher', () => {
  it('starts and returns TransportInfo; schema falls back to a default', async () => {
    const frames = await drive(
      {
        kind: PluginKind.TransportBackend,
        name: 't',
        version: '0.1.0',
        description: 'd',
        impl: {
          start: () => ({ bound_addr: '127.0.0.1:8080', started_at: NOW }),
        },
      },
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'transport/start',
          params: { control_socket_path: '/s.sock', project_root: '/p', bind_addr: '127.0.0.1:0' },
        },
        { jsonrpc: '2.0', id: 2, method: 'transport/schema' },
        { jsonrpc: '2.0', id: 3, method: 'transport/shutdown' },
      ],
    );
    expect((frames.find((f) => f.id === 1)?.result as { bound_addr: string }).bound_addr).toBe('127.0.0.1:8080');
    expect((frames.find((f) => f.id === 2)?.result as { kinds: string[] }).kinds).toEqual([]);
    expect(frames.find((f) => f.id === 3)?.result).toEqual({});
  });

  it('rejects transport/start with missing required config (Zod)', async () => {
    const frames = await drive(
      {
        kind: PluginKind.TransportBackend,
        name: 't',
        version: '0.1.0',
        description: 'd',
        impl: { start: () => ({ bound_addr: 'x', started_at: NOW }) },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'transport/start', params: { bind_addr: 'x' } }],
    );
    expect(frames[0]?.error?.code).toBe(ErrorCode.InvalidParams);
  });
});

// ---- log storage role ------------------------------------------------------

describe('log_storage dispatcher', () => {
  it('stores entries and returns method_not_supported for unimplemented query/tail', async () => {
    let stored = 0;
    const frames = await drive(
      {
        kind: PluginKind.LogStorageBackend,
        name: 'l',
        version: '0.1.0',
        description: 'd',
        impl: {
          store: ({ entries }) => {
            stored += entries.length;
            return { stored: entries.length };
          },
        },
      },
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'log_storage/store',
          params: {
            entries: [{ id: 'e1', ts: NOW, level: 'info', source: 'plugin', target: 'plugin.t', message: 'hi' }],
          },
        },
        { jsonrpc: '2.0', id: 2, method: 'log_storage/query', params: {} },
        { jsonrpc: '2.0', id: 3, method: 'log_storage/schema' },
      ],
    );
    expect(stored).toBe(1);
    expect((frames.find((f) => f.id === 1)?.result as { stored: number }).stored).toBe(1);
    expect(frames.find((f) => f.id === 2)?.error?.code).toBe(ErrorCode.MethodNotSupported);
    expect((frames.find((f) => f.id === 3)?.result as { supports_query: boolean }).supports_query).toBe(false);
  });

  it('rejects log_storage/store with a non-array or malformed entries (Zod)', async () => {
    const spec = {
      kind: PluginKind.LogStorageBackend,
      name: 'l',
      version: '0.1.0',
      description: 'd',
      impl: { store: () => ({ stored: 0 }) },
    } as Parameters<typeof definePlugin>[0];
    const noArray = await drive(spec, [{ jsonrpc: '2.0', id: 1, method: 'log_storage/store', params: {} }]);
    expect(noArray[0]?.error?.code).toBe(ErrorCode.InvalidParams);
    // Entry missing the required `target` field is rejected before reaching the impl.
    const badEntry = await drive(spec, [
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'log_storage/store',
        params: { entries: [{ id: 'e', ts: NOW, level: 'info', source: 'plugin', message: 'x' }] },
      },
    ]);
    expect(badEntry[0]?.error?.code).toBe(ErrorCode.InvalidParams);
  });

  it('streams log_storage/event notifications from tail', async () => {
    async function* entries() {
      yield { id: 'e1', ts: NOW, level: 'info', source: 'plugin', message: 'a' };
    }
    const frames = await drive(
      {
        kind: PluginKind.LogStorageBackend,
        name: 'l',
        version: '0.1.0',
        description: 'd',
        impl: { store: () => ({ stored: 0 }), tail: () => entries() },
      },
      [{ jsonrpc: '2.0', id: 7, method: 'log_storage/tail', params: {} }],
    );
    expect((frames.find((f) => f.id === 7)?.result as { tailing: boolean }).tailing).toBe(true);
    const ev = frames.find((f) => f.method === 'log_storage/event');
    expect((ev?.params as { id: number }).id).toBe(7);
    expect((ev?.params as { entry: { id: string } }).entry.id).toBe('e1');
  });
});

// ---- queue / workflow / durable / memory / notifier happy + bad params -----

describe('v1.1.0 role dispatchers', () => {
  it('queue/enqueue validates params and routes to impl', async () => {
    const frames = await drive(
      {
        kind: PluginKind.Queue,
        name: 'q',
        version: '0.1.0',
        description: 'd',
        impl: {
          enqueue: () => ({ enqueued: true, entry_id: 'q1', subject_id: 'task:1' }),
          list: () => ({ entries: [], stats: { assigned: 0, held: 0, pending: 0, total: 0 }, total: 0 }),
          lease: () => ({ leased: [] }),
          stats: () => ({ assigned: 0, held: 0, pending: 0, total: 0 }),
          hold: () => ({ changed: [], not_found: [] }),
          release: () => ({ changed: [], not_found: [] }),
          drop: () => ({ changed: [], not_found: [] }),
          mark_assigned: () => ({ changed: [], not_found: [] }),
          completion: () => ({ changed: [], not_found: [] }),
          reorder: () => ({ reordered_count: 0 }),
        },
      },
      [
        { jsonrpc: '2.0', id: 1, method: 'queue/stats' },
        { jsonrpc: '2.0', id: 2, method: 'queue/enqueue', params: {} },
        { jsonrpc: '2.0', id: 3, method: 'queue/release_pending', params: { entry_id: 'q1', reason: 'x' } },
      ],
    );
    expect((frames.find((f) => f.id === 1)?.result as { total: number }).total).toBe(0);
    // empty enqueue params fail Zod (dispatch required)
    expect(frames.find((f) => f.id === 2)?.error?.code).toBe(ErrorCode.InvalidParams);
    // release_pending is optional → method_not_supported when not implemented
    expect(frames.find((f) => f.id === 3)?.error?.code).toBe(ErrorCode.MethodNotSupported);
  });

  it('notifier/notify routes; notifier/flush is method_not_supported when absent', async () => {
    const frames = await drive(
      {
        kind: PluginKind.Notifier,
        name: 'n',
        version: '0.1.0',
        description: 'd',
        impl: {
          notify: () => ({ accepted: true, delivered: true, lifecycle_events: [] }),
        },
      },
      [
        { jsonrpc: '2.0', id: 1, method: 'notifier/schema' },
        { jsonrpc: '2.0', id: 2, method: 'notifier/flush', params: {} },
      ],
    );
    expect((frames.find((f) => f.id === 1)?.result as { supports_flush: boolean }).supports_flush).toBe(false);
    expect(frames.find((f) => f.id === 2)?.error?.code).toBe(ErrorCode.MethodNotSupported);
  });

  it('memory_store rejects malformed memory/put (Zod) and routes a valid one', async () => {
    const frames = await drive(
      {
        kind: PluginKind.MemoryStore,
        name: 'm',
        version: '0.1.0',
        description: 'd',
        impl: {
          put: () => ({ ack: true, indexed_immediately: true, record_id: 'r1' }),
          get: () => ({ found: false, value: null }),
          query: () => ({ results: [] }),
          list_scopes: () => ({ scopes: [], next_cursor: null }),
          delete_scope: () => ({ ack: true }),
        },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'memory/put', params: {} }],
    );
    expect(frames.find((f) => f.id === 1)?.error?.code).toBe(ErrorCode.InvalidParams);
  });

  it('workflow_runner advertises both methods', () => {
    const m = definePlugin({
      kind: PluginKind.WorkflowRunner,
      name: 'w',
      version: '0.1.0',
      description: 'd',
      impl: { execute: () => ({}) as never, run_phase: () => ({}) as never },
    }).manifest();
    expect(m.capabilities).toContain('workflow/execute');
    expect(m.capabilities).toContain('workflow/run_phase');
  });
});

// ---- v1.1.0 protocol additions --------------------------------------------

describe('protocol v1.1.0', () => {
  it('PROTOCOL_VERSION is 1.1.0', () => {
    expect(PROTOCOL_VERSION).toBe('1.1.0');
  });

  it('emits kind_capabilities for v1.1.0 kinds, omits for v1.0.0 kinds', () => {
    const queueInit = definePlugin({
      kind: PluginKind.Queue,
      name: 'q',
      version: '0.1.0',
      description: 'd',
      impl: {
        enqueue: () => ({}) as never,
        list: () => ({}) as never,
        lease: () => ({}) as never,
        stats: () => ({}) as never,
        hold: () => ({}) as never,
        release: () => ({}) as never,
        drop: () => ({}) as never,
        mark_assigned: () => ({}) as never,
        completion: () => ({}) as never,
        reorder: () => ({}) as never,
      },
    }).initialize({ protocol_version: '1.1.0', host_info: { name: 'animus', version: 'x' }, capabilities: {} });
    expect((queueInit.result as { kind_capabilities?: Record<string, unknown> }).kind_capabilities).toHaveProperty(
      'queue',
    );

    const subjInit = definePlugin({
      kind: PluginKind.SubjectBackend,
      name: 's',
      version: '0.1.0',
      description: 'd',
      subject_kinds: ['task'],
      impl: { list: () => ({ subjects: [] }), get: () => null },
    }).initialize({ protocol_version: '1.1.0', host_info: { name: 'animus', version: 'x' }, capabilities: {} });
    expect((subjInit.result as { kind_capabilities?: unknown }).kind_capabilities).toBeUndefined();
  });

  it('tolerates absent init_extensions and accepts a 1.0.0 host', () => {
    const reply = definePlugin({
      kind: PluginKind.SubjectBackend,
      name: 's',
      version: '0.1.0',
      description: 'd',
      subject_kinds: ['task'],
      impl: { list: () => ({ subjects: [] }), get: () => null },
    }).initialize({ protocol_version: '1.0.0', host_info: { name: 'animus', version: 'x' }, capabilities: {} });
    expect(reply.error).toBeUndefined();
    expect((reply.result as { protocol_version: string }).protocol_version).toBe(PROTOCOL_VERSION);
  });
});

// ---- subject/delete (spec §7.1) -------------------------------------------

describe('subject/delete', () => {
  it('routes to impl.delete and returns { ok: true }; advertises the method', async () => {
    let deleted: string | null = null;
    const spec = {
      kind: PluginKind.SubjectBackend,
      name: 's',
      version: '0.1.0',
      description: 'd',
      subject_kinds: ['task'],
      impl: {
        list: () => ({ subjects: [] }),
        get: () => null,
        delete: ({ id }: { id: string }) => {
          deleted = id;
          return { ok: true };
        },
      },
    } as Parameters<typeof definePlugin>[0];
    expect(definePlugin(spec).manifest().capabilities).toContain('subject/delete');
    const frames = await drive(spec, [
      { jsonrpc: '2.0', id: 1, method: 'subject/delete', params: { id: 'task:1' } },
    ]);
    expect(deleted).toBe('task:1');
    expect((frames[0]?.result as { ok: boolean }).ok).toBe(true);

    // The default subject/schema reflects delete support.
    const schemaFrames = await drive(spec, [{ jsonrpc: '2.0', id: 2, method: 'subject/schema' }]);
    expect((schemaFrames[0]?.result as { supports_delete: boolean }).supports_delete).toBe(true);
  });

  it('returns method_not_supported when delete is not implemented', async () => {
    const frames = await drive(
      {
        kind: PluginKind.SubjectBackend,
        name: 's',
        version: '0.1.0',
        description: 'd',
        subject_kinds: ['task'],
        impl: { list: () => ({ subjects: [] }), get: () => null },
      },
      [{ jsonrpc: '2.0', id: 1, method: 'subject/delete', params: { id: 'task:1' } }],
    );
    expect(frames[0]?.error?.code).toBe(ErrorCode.MethodNotSupported);
  });
});
