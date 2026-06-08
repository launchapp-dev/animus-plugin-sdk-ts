// subject_backend dispatcher. Re-platformed onto generated Zod types while
// preserving every back-compat behavior the 299 published subject plugins rely
// on: canonical `subject/*` routes, legacy `<kind>/*` routes, the daemon's
// `{filter}` envelope unwrap, CLI `body`→`description` mapping, route-kind
// backfill, the `ensureWireSubject` safety net, and null-get → not-found.

import type {
  Subject,
  SubjectBackend,
  SubjectCallContext,
} from '../roles/subject.js';
import { SubjectFilterSchema } from '../roles/subject.js';
import { ErrorCode, type PluginCapabilities, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, okResponse, validateParams } from './shared.js';

export const SUBJECT_VERBS = ['list', 'get', 'create', 'update', 'status', 'next', 'delete', 'schema'] as const;

export function deriveSubjectCapabilities(
  impl: SubjectBackend,
  kinds: string[],
  projections: string[],
): PluginCapabilities {
  const methods: string[] = ['subject/list', 'subject/get', 'subject/schema', 'health/check'];
  if (impl.update) methods.push('subject/update');
  if (impl.create) methods.push('subject/create');
  if (impl.status) methods.push('subject/status');
  if (impl.next) methods.push('subject/next');
  if (impl.delete) methods.push('subject/delete');
  // Legacy `<kind>/<verb>` compatibility routes for older daemon builds.
  const legacyVerbs = methods.filter((m) => m.startsWith('subject/')).map((m) => m.slice('subject/'.length));
  for (const kind of kinds) {
    for (const verb of legacyVerbs) methods.push(`${kind}/${verb}`);
  }
  return {
    methods,
    streaming: false,
    progress: false,
    cancellation: false,
    subject_kinds: kinds,
    projections,
  };
}

/**
 * Ensure a subject record carries the wire-mandatory fields the Rust daemon
 * expects (`status`, `created_at`, `updated_at`). Sparse hello-world records
 * get sensible defaults instead of an undecodable response.
 */
export function ensureWireSubject(
  s: Subject | (Partial<Subject> & { id: string; kind: string; title: string }),
): Subject {
  const nowIso = new Date().toISOString();
  return { status: 'ready', created_at: nowIso, updated_at: nowIso, ...s } as Subject;
}

function defaultSubjectSchema(kinds: string[], impl: SubjectBackend): Record<string, unknown> {
  return {
    kinds,
    status_values: ['ready', 'in-progress', 'blocked', 'done', 'cancelled'],
    supports_watch: false,
    // Reflect the impl's actual capabilities so a host consulting the schema
    // routes `subject/create` / `subject/delete` only when they're wired.
    supports_create: typeof impl.create === 'function',
    supports_delete: typeof impl.delete === 'function',
    supports_pagination: true,
    native_status_values: [],
    status_dispatch_hints: [],
    custom_fields: [],
  };
}

export async function dispatchSubject(
  id: RpcId,
  frame: RpcRequest,
  impl: SubjectBackend,
  declaredKinds: string[],
): Promise<RpcResponse> {
  const method = frame.method;
  const slash = method.indexOf('/');
  if (slash < 1) return errorResponse(id, ErrorCode.MethodNotFound, `unknown method '${method}'`);
  const prefix = method.slice(0, slash);
  const verb = method.slice(slash + 1);
  const rawParams = (frame.params ?? {}) as Record<string, unknown>;

  const matchesDeclared = (incoming: string): boolean => {
    for (const decl of declaredKinds) {
      if (decl === incoming) return true;
      if (decl.endsWith('.*')) {
        const stem = decl.slice(0, -1); // keep trailing "."
        if (incoming.startsWith(stem)) return true;
      }
    }
    return false;
  };

  const kindFromId = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const colon = value.indexOf(':');
    return colon > 0 ? value.slice(0, colon) : null;
  };

  const kindFromParams = (): string => {
    const explicitKind = rawParams.kind;
    if (typeof explicitKind === 'string' && explicitKind.length > 0) return explicitKind;
    const nestedKind =
      rawParams.filter && typeof rawParams.filter === 'object'
        ? (rawParams.filter as Record<string, unknown>).kind
        : undefined;
    if (Array.isArray(nestedKind) && typeof nestedKind[0] === 'string') return nestedKind[0];
    if (Array.isArray(explicitKind) && typeof explicitKind[0] === 'string') return explicitKind[0];
    const idKind = kindFromId(rawParams.id);
    if (idKind) return idKind;
    return declaredKinds[0] ?? 'subject';
  };

  const legacyKindRoute = prefix !== 'subject';
  const kind = legacyKindRoute ? prefix : kindFromParams();

  if (legacyKindRoute && declaredKinds.length > 0 && !matchesDeclared(kind)) {
    return errorResponse(id, ErrorCode.MethodNotFound, `plugin does not serve subject kind '${kind}'`);
  }
  const subjectCtx: SubjectCallContext = { request_id: id, kind };

  try {
    switch (verb) {
      case 'schema': {
        const schema = impl.schema
          ? await impl.schema(subjectCtx)
          : defaultSubjectSchema(declaredKinds.length > 0 ? declaredKinds : [kind], impl);
        return okResponse(id, schema);
      }
      case 'list': {
        // Unwrap the daemon's `{ filter }` envelope, else treat params as a
        // flat filter. Always force `kind` to the routed kind on legacy routes
        // / missing-kind so a `task` backend isn't asked to honor `requirement`.
        const flat =
          rawParams.filter && typeof rawParams.filter === 'object'
            ? ({ ...(rawParams.filter as Record<string, unknown>) } as Record<string, unknown>)
            : ({ ...rawParams } as Record<string, unknown>);
        const listParams: Record<string, unknown> = { ...flat };
        if (legacyKindRoute || listParams.kind === undefined) {
          listParams.kind = [kind];
        }
        // Validate the normalized filter against the generated SubjectFilter.
        const v = validateParams(id, SubjectFilterSchema, listParams);
        if (!v.ok) return v.response;
        const out = await impl.list(v.value as never, subjectCtx);
        const filled = {
          subjects: (out.subjects ?? []).map(ensureWireSubject),
          ...(out.next_cursor !== undefined ? { next_cursor: out.next_cursor } : {}),
          fetched_at: out.fetched_at ?? new Date().toISOString(),
        };
        return okResponse(id, filled);
      }
      case 'get': {
        if (typeof rawParams.id !== 'string' || rawParams.id.length === 0) {
          return errorResponse(id, ErrorCode.InvalidParams, 'subject/get requires string id', {
            category: 'invalid_request',
          });
        }
        const out = await impl.get({ id: rawParams.id }, subjectCtx);
        if (out === null || out === undefined) {
          return errorResponse(id, ErrorCode.InvalidParams, `not found: subject '${rawParams.id}'`, {
            category: 'not_found',
          });
        }
        return okResponse(id, ensureWireSubject(out));
      }
      case 'create': {
        if (!impl.create) return notSupported(id, method);
        const createParams: Record<string, unknown> = { ...rawParams, kind };
        if (createParams.body !== undefined && createParams.description === undefined) {
          createParams.description = createParams.body;
          delete createParams.body;
        }
        return okResponse(id, ensureWireSubject(await impl.create(createParams as never, subjectCtx)));
      }
      case 'update':
        if (!impl.update) return notSupported(id, method);
        return okResponse(id, ensureWireSubject(await impl.update(rawParams as never, subjectCtx)));
      case 'status':
        if (!impl.status) return notSupported(id, method);
        return okResponse(id, ensureWireSubject(await impl.status(rawParams as never, subjectCtx)));
      case 'next': {
        if (!impl.next) return notSupported(id, method);
        const out = await impl.next(rawParams as never, subjectCtx);
        return okResponse(id, out ? ensureWireSubject(out) : null);
      }
      case 'delete': {
        if (!impl.delete) return notSupported(id, method);
        if (typeof rawParams.id !== 'string' || rawParams.id.length === 0) {
          return errorResponse(id, ErrorCode.InvalidParams, 'subject/delete requires string id', {
            category: 'invalid_request',
          });
        }
        const res = await impl.delete({ id: rawParams.id }, subjectCtx);
        // Authors may return void, { ok } — normalize to { ok: true }.
        const ok = res && typeof res === 'object' && 'ok' in res ? Boolean((res as { ok: unknown }).ok) : true;
        return okResponse(id, { ok });
      }
      default:
        return errorResponse(id, ErrorCode.MethodNotFound, `unknown method '${method}'`);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `subject backend error: ${String(err)}`);
  }
}

function notSupported(id: RpcId, method: string): RpcResponse {
  // Optional subject verbs use method_not_supported per spec §7.1 so the host
  // can fall back. (Historically this was method_not_found; -32001 is the
  // spec-correct code and the host treats both as "not available".)
  return errorResponse(id, ErrorCode.MethodNotSupported, `method '${method}' not supported`, {
    category: 'not_supported',
  });
}
