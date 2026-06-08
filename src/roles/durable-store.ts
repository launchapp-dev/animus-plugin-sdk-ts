// durable_store role contract (spec §7.7, v1.1.0+).

import type { CallContext, HealthReport } from './context.js';
import type {
  BeginWorkflowRunRequest,
  BeginWorkflowRunResponse,
  BeginStepRequest,
  BeginStepResponse,
  CommitStepRequest,
  CommitStepResponse,
  AbandonStepRequest,
  AbandonStepResponse,
  RecoverInFlightRequest,
  RecoverInFlightResponse,
  QueryRunRequest,
  QueryRunResponse,
} from '../types/generated/durable-store.js';

export type * from '../types/generated/durable-store.js';
export {
  BeginWorkflowRunRequestSchema,
  BeginStepRequestSchema,
  CommitStepRequestSchema,
  AbandonStepRequestSchema,
  RecoverInFlightRequestSchema,
  QueryRunRequestSchema,
} from '../types/generated/durable-store.js';

export interface DurableStore {
  begin_workflow_run(
    params: BeginWorkflowRunRequest,
    ctx: CallContext,
  ): Promise<BeginWorkflowRunResponse> | BeginWorkflowRunResponse;
  begin_step(params: BeginStepRequest, ctx: CallContext): Promise<BeginStepResponse> | BeginStepResponse;
  commit_step(params: CommitStepRequest, ctx: CallContext): Promise<CommitStepResponse> | CommitStepResponse;
  abandon_step(params: AbandonStepRequest, ctx: CallContext): Promise<AbandonStepResponse> | AbandonStepResponse;
  recover_in_flight(
    params: RecoverInFlightRequest,
    ctx: CallContext,
  ): Promise<RecoverInFlightResponse> | RecoverInFlightResponse;
  query_run(params: QueryRunRequest, ctx: CallContext): Promise<QueryRunResponse> | QueryRunResponse;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
