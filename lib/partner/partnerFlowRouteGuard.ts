// FILE: lib/partner/partnerFlowRouteGuard.ts
// Shared Partner Flow route guard — rate limit enforcement + telemetry recording.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import {
  checkPartnerFlowRateLimit,
  partnerFlowRateLimitResponse,
  type PartnerFlowRateLimitEndpoint,
} from "@/lib/partner/partnerFlowRateLimit";
import { recordPartnerFlowTelemetry } from "@/lib/partner/partnerFlowTelemetry";

export interface PartnerFlowGuardContext {
  request: NextRequest;
  endpoint: PartnerFlowRateLimitEndpoint;
  method: string;
  started: number;
  sessionSubject?: string | null;
  partnerId?: string | null;
  policyId?: string | null;
}

export function enforcePartnerFlowRateLimit(
  ctx: PartnerFlowGuardContext,
): NextResponse | null {
  const result = checkPartnerFlowRateLimit(ctx.request, ctx.endpoint, {
    sessionSubject: ctx.sessionSubject,
  });

  if (!result.allowed) {
    const latencyMs = Date.now() - ctx.started;
    recordPartnerFlowTelemetry({
      endpoint: ctx.endpoint,
      method: ctx.method,
      httpStatus: 429,
      latencyMs,
      rateLimited: true,
      partnerId: ctx.partnerId,
      policyId: ctx.policyId,
    });

    void logPartnerUsage({
      endpoint: ctx.endpoint,
      method: ctx.method,
      success: false,
      responseState: "rate_limited",
      httpStatus: 429,
      responseTimeMs: latencyMs,
      policyId: ctx.policyId ?? undefined,
    });

    return partnerFlowRateLimitResponse(result);
  }

  return null;
}

export function recordPartnerFlowRequestOutcome(
  ctx: PartnerFlowGuardContext & {
    httpStatus: number;
    auditPersistenceFailed?: boolean;
  },
): void {
  recordPartnerFlowTelemetry({
    endpoint: ctx.endpoint,
    method: ctx.method,
    httpStatus: ctx.httpStatus,
    latencyMs: Date.now() - ctx.started,
    partnerId: ctx.partnerId,
    policyId: ctx.policyId,
    auditPersistenceFailed: ctx.auditPersistenceFailed,
  });
}
