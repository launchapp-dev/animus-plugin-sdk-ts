// Shared call context + health-report types used by every role contract.

import type { RpcId } from '../types/index.js';

/** Generic context passed to every role method (extensible). */
export interface CallContext {
  /** Original JSON-RPC request id (for logging / cancellation). */
  request_id: RpcId;
  /** AbortSignal that fires when the host sends `$/cancelRequest`. */
  signal?: AbortSignal;
}

/** Result of an optional `health()` hook on any role impl. */
export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Optional human-readable note (surfaces in `animus plugin health`). */
  last_error?: string | null;
  uptime_ms?: number | null;
  memory_usage_bytes?: number | null;
}
