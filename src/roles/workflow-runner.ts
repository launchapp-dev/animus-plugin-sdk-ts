// workflow_runner role contract (spec §7.5, v1.1.0+).

import type { CallContext, HealthReport } from './context.js';
import type {
  WorkflowExecuteRequest,
  WorkflowExecuteResult,
  WorkflowPhaseRunRequest,
  WorkflowPhaseRunResult,
} from '../types/generated/workflow-runner.js';

export type * from '../types/generated/workflow-runner.js';
export {
  WorkflowExecuteRequestSchema,
  WorkflowPhaseRunRequestSchema,
} from '../types/generated/workflow-runner.js';

export interface WorkflowRunner {
  /** Drive a full workflow run. */
  execute(
    params: WorkflowExecuteRequest,
    ctx: CallContext,
  ): Promise<WorkflowExecuteResult> | WorkflowExecuteResult;
  /** Execute exactly one phase (per-phase scheduler path). */
  run_phase(
    params: WorkflowPhaseRunRequest,
    ctx: CallContext,
  ): Promise<WorkflowPhaseRunResult> | WorkflowPhaseRunResult;
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
