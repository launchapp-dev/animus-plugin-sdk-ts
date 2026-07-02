import { describe, expect, it } from 'vitest';

import { definePlugin, extractActor, type Role } from './index.js';

function roles(): Role[] {
  return [
    {
      kind: 'subject_backend',
      methods: {
        'subject/list': async () => ({ subjects: [] }),
        'subject/get': async () => null,
      },
      subject_kinds: ['task', 'blog'],
    },
    {
      kind: 'config_source',
      methods: {
        'config/load': async () => ({ config: {} }),
        'config/write': async (params, ctx) => ({ ok: true, user: ctx.actor?.user_id ?? null, params }),
      },
      capabilities: ['config_write'],
      kind_capability: { crate_version: '0.1.0', extra: {} },
    },
    {
      kind: 'queue',
      methods: { 'queue/enqueue': async () => ({ id: 'q1' }) },
    },
  ];
}

describe('definePlugin({ roles })', () => {
  it('emits plugin_kind (primary) + plugin_kinds (all) in the manifest', () => {
    const handle = definePlugin({ name: 'p', version: '0.0.1', description: 'd', roles: roles() });
    const m = handle.manifest();
    expect(m.plugin_kind).toBe('subject_backend');
    expect(m.plugin_kinds).toEqual(['config_source', 'queue']);
  });

  it('merges every role method + capability marker into one advertised set', () => {
    const handle = definePlugin({ name: 'p', version: '0.0.1', description: 'd', roles: roles() });
    const caps = handle.manifest().capabilities ?? [];
    for (const m of ['subject/list', 'subject/get', 'config/load', 'config/write', 'queue/enqueue', 'health/check']) {
      expect(caps).toContain(m);
    }
    expect(caps).toContain('config_write');
    expect(caps).toContain('subject_kind:task');
    expect(caps).toContain('subject_kind:blog');
  });

  it('carries plugin_kinds + kind_capabilities into the initialize reply', () => {
    const handle = definePlugin({ name: 'p', version: '0.0.1', description: 'd', roles: roles() });
    const res = handle.initialize({
      protocol_version: '1.0.0',
      host_info: { name: 'animus', version: 'x' },
      capabilities: {},
    });
    const result = res.result as {
      plugin_info: { plugin_kind: string; plugin_kinds?: string[] };
      kind_capabilities?: Record<string, unknown>;
    };
    expect(result.plugin_info.plugin_kind).toBe('subject_backend');
    expect(result.plugin_info.plugin_kinds).toEqual(['config_source', 'queue']);
    expect(result.kind_capabilities).toHaveProperty('config_source');
    // Built-in v1.1 role `queue` gets a default kind_capability even though the
    // test role omitted it — parity with single-kind definePlugin.
    expect(result.kind_capabilities).toHaveProperty('queue');
  });

  it('honors an explicit primary_kind', () => {
    const handle = definePlugin({ name: 'p', version: '0.0.1', description: 'd', primary_kind: 'queue', roles: roles() });
    const m = handle.manifest();
    expect(m.plugin_kind).toBe('queue');
    expect(m.plugin_kinds).toEqual(['subject_backend', 'config_source']);
  });

  it('rejects a primary_kind that is not a declared role', () => {
    expect(() =>
      definePlugin({ name: 'p', version: '0.0.1', description: 'd', primary_kind: 'nope', roles: roles() }),
    ).toThrow(/primary_kind/);
  });

  it('extractActor reads a well-known actor param', () => {
    expect(extractActor({ actor: { user_id: 'u1', claims: ['admin'] } })).toEqual({ user_id: 'u1', claims: ['admin'] });
    expect(extractActor({ actor: { nope: true } })).toBeUndefined();
    expect(extractActor({})).toBeUndefined();
  });
});
