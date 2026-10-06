// FILE: lib/partner/hostedHandoff/continueContextTrace.ts
// Request-local control-flow trace for hosted-handoff continue-context (#563).
// Checkpoint names only — no secrets, PII, or database contents.

import type { NextRequest } from "next/server";

export const CONTINUE_CONTEXT_TRACE_HEADER = "X-Abraxas-Continue-Trace";

export const CONTINUE_CONTEXT_TRACE_CHECKPOINTS = [
  "route_enter",
  "resolver_enter",
  "ensure_enter",
  "store_created",
  "peek_enter",
  "normalization_failed",
  "identifier_normalized",
  "opaque_branch",
  "table_branch",
  "admin_client_acquired",
  "opaque_rpc_helper_enter",
  "before_rpc",
  "after_rpc",
  "rpc_error",
  "row_candidate",
  "map_success",
  "map_failed",
  "peek_return_found",
  "peek_return_null",
  "reuse_return",
  "save_enter",
  "save_conflict",
  "recovery_peek_enter",
  "recovery_before_rpc",
  "recovery_after_rpc",
  "recovery_rpc_error",
  "atomic_rpc_enter",
  "atomic_rpc_return_existing",
  "atomic_rpc_return_created",
  "atomic_rpc_error",
  "ensure_throw",
  "resolver_return",
] as const;

export type ContinueContextTraceCheckpoint =
  (typeof CONTINUE_CONTEXT_TRACE_CHECKPOINTS)[number];

export type ContinueContextTraceCollector = {
  record(checkpoint: ContinueContextTraceCheckpoint): void;
  serializeHeader(): string;
  checkpoints(): readonly ContinueContextTraceCheckpoint[];
};

export function createContinueContextTraceCollector(): ContinueContextTraceCollector {
  const checkpoints: ContinueContextTraceCheckpoint[] = [];
  return {
    record(checkpoint) {
      checkpoints.push(checkpoint);
    },
    serializeHeader() {
      return checkpoints.join(",");
    },
    checkpoints() {
      return checkpoints;
    },
  };
}

export function isContinueContextTraceAuthorized(request: NextRequest): boolean {
  const secret =
    process.env.CRON_SECRET?.trim()
    || process.env.ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

export function attachContinueContextTraceHeader(
  headers: Headers,
  trace: ContinueContextTraceCollector | undefined,
): void {
  if (!trace) return;
  const value = trace.serializeHeader();
  if (value) headers.set(CONTINUE_CONTEXT_TRACE_HEADER, value);
}
