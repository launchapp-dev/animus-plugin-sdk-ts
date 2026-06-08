// Shared helpers for role dispatchers: Zod param validation + uniform error
// mapping to JSON-RPC responses.

import type { ZodType } from 'zod';

import { ErrorCode, type RpcId, type RpcResponse } from '../types/index.js';
import { errorResponse, okResponse, type Wire } from '../wire.js';

export type { Wire };
export { okResponse, errorResponse };

export interface ValidationOk<T> {
  ok: true;
  value: T;
}
export interface ValidationErr {
  ok: false;
  response: RpcResponse;
}

/**
 * Validate raw JSON-RPC params against a generated Zod schema. On failure,
 * returns a ready-to-send `-32602` (`invalid_params`) error response carrying
 * the formatted issue list in `error.data`.
 */
export function validateParams<T>(id: RpcId, schema: ZodType<T>, raw: unknown): ValidationOk<T> | ValidationErr {
  const parsed = schema.safeParse(raw ?? {});
  if (parsed.success) return { ok: true, value: parsed.data };
  const issues = parsed.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
    code: i.code,
  }));
  return {
    ok: false,
    response: errorResponse(id, ErrorCode.InvalidParams, `invalid params: ${parsed.error.issues[0]?.message ?? 'validation failed'}`, {
      category: 'invalid_request',
      issues,
    }),
  };
}

/** `-32001` method_not_supported (optional method not implemented). */
export function methodNotSupported(id: RpcId, method: string): RpcResponse {
  return errorResponse(id, ErrorCode.MethodNotSupported, `method '${method}' not supported`, {
    category: 'not_supported',
  });
}

/** `-32601` method_not_found (method not recognized for this role). */
export function methodNotFound(id: RpcId, method: string): RpcResponse {
  return errorResponse(id, ErrorCode.MethodNotFound, `unknown method '${method}'`);
}

/** Wrap an impl call so thrown errors become a uniform internal-error reply. */
export async function guard(
  id: RpcId,
  role: string,
  fn: () => Promise<RpcResponse> | RpcResponse,
): Promise<RpcResponse> {
  try {
    return await fn();
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `${role} error: ${String(err)}`);
  }
}
