// provider role contract (spec §7.2 / §10).
//
// A provider runs an agent session. `agent/run` and `agent/resume` stream
// `agent/output|thinking|toolCall|toolResult|error` notifications and then
// reply with a final `AgentRunResponse`. The SDK gives the impl an `emit`
// callback to push those streaming notifications; the impl's return value is
// the final response.

import type { CallContext, HealthReport } from './context.js';
import type {
  AgentRunRequest,
  AgentRunResponse,
  AgentCancelRequest,
} from '../types/generated/provider.js';

export type {
  AgentRunRequest,
  AgentRunResponse,
  AgentCancelRequest,
  AgentNotification,
  TokenUsage,
  ProviderCapabilities,
} from '../types/generated/provider.js';
export {
  AgentRunRequestSchema,
  AgentRunResponseSchema,
  AgentCancelRequestSchema,
  AgentNotificationSchema,
} from '../types/generated/provider.js';

/** Streaming sink handed to provider `run`/`resume` impls. Each method maps to
 *  the matching `agent/*` JSON-RPC notification (spec §10.3). Every variant
 *  carries `session_id`; the SDK defaults it from the originating request's
 *  resolved session id when the author omits it. */
export interface AgentStream {
  output(p: { session_id?: string; text: string; final?: boolean }): Promise<void>;
  thinking(p: { session_id?: string; text: string }): Promise<void>;
  toolCall(p: { session_id?: string; name: string; arguments?: unknown; server?: string | null }): Promise<void>;
  toolResult(p: { session_id?: string; name: string; output?: string; success?: boolean }): Promise<void>;
  error(p: { session_id?: string; message: string; recoverable?: boolean }): Promise<void>;
}

/** Provider call context adds the streaming sink. */
export interface ProviderCallContext extends CallContext {
  /** Emit streaming `agent/*` notifications for the current run. */
  stream: AgentStream;
}

export interface Provider {
  /** Start a new agent session. Stream via `ctx.stream`; return the final response. */
  run(params: AgentRunRequest, ctx: ProviderCallContext): Promise<AgentRunResponse> | AgentRunResponse;
  /** Resume a prior session (same shape, `session_id` set). */
  resume?(params: AgentRunRequest, ctx: ProviderCallContext): Promise<AgentRunResponse> | AgentRunResponse;
  /** Best-effort cancel of an in-flight session. */
  cancel?(
    params: AgentCancelRequest,
    ctx: CallContext,
  ): Promise<{ session_id: string; cancelled: boolean }> | { session_id: string; cancelled: boolean };
  health?(ctx: CallContext): Promise<HealthReport> | HealthReport;
}
