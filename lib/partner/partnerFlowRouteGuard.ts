// FILE: lib/partner/partnerFlowRouteGuard.ts
// Shared Partner Flow route guard — rate limit enforcement + telemetry recording.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";
import {
  checkPartnerFlowRateLimit,
  partnerFlowRateLimitDistributedUnavailableResponse,
  partnerFlowRateLimitIdentityUnavailableResponse,
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

export async function enforcePartnerFlowRateLimit(
  ctx: PartnerFlowGuardContext,
): Promise<NextResponse | null> {
  const result = await checkPartnerFlowRateLimit(ctx.request, ctx.endpoint, {
    sessionSubject: ctx.sessionSubject,
  });

  if (result.backend === "identity_unavailable" || result.backend === "distributed_unavailable") {
    const latencyMs = Date.now() - ctx.started;
    recordPartnerFlowTelemetry({
      endpoint: ctx.endpoint,
      method: ctx.method,
      httpStatus: 503,
      latencyMs,
      partnerId: ctx.partnerId,
      policyId: ctx.policyId,
    });
    return result.backend === "distributed_unavailable"
      ? partnerFlowRateLimitDistributedUnavailableResponse()
      : partnerFlowRateLimitIdentityUnavailableResponse();
  }

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
