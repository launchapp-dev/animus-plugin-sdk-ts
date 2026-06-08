// workflow_runner dispatcher (spec §7.5).

import type { WorkflowRunner } from '../roles/workflow-runner.js';
import { WorkflowExecuteRequestSchema, WorkflowPhaseRunRequestSchema } from '../roles/workflow-runner.js';
import { ErrorCode, type RpcId, type RpcRequest, type RpcResponse } from '../types/index.js';
import { errorResponse, methodNotFound, okResponse, validateParams } from './shared.js';

export const WORKFLOW_RUNNER_METHODS = {
  execute: 'workflow/execute',
  run_phase: 'workflow/run_phase',
} as const;

export async function dispatchWorkflowRunner(
  id: RpcId,
  frame: RpcRequest,
  impl: WorkflowRunner,
): Promise<RpcResponse> {
  const method = frame.method;
  const ctx = { request_id: id };
  try {
    switch (method) {
      case WORKFLOW_RUNNER_METHODS.execute: {
        const v = validateParams(id, WorkflowExecuteRequestSchema, frame.params);
        return v.ok ? okResponse(id, await impl.execute(v.value, ctx)) : v.response;
      }
      case WORKFLOW_RUNNER_METHODS.run_phase: {
        const v = validateParams(id, WorkflowPhaseRunRequestSchema, frame.params);
        return v.ok ? okResponse(id, await impl.run_phase(v.value, ctx)) : v.response;
      }
      default:
        return methodNotFound(id, method);
    }
  } catch (err) {
    return errorResponse(id, ErrorCode.InternalError, `workflow_runner error: ${String(err)}`);
  }
}
