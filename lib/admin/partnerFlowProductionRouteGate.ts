// FILE: lib/admin/partnerFlowProductionRouteGate.ts
// Production-only origin gate for Partner Flow readiness admin routes — env-only, never request Host.

import { NextRequest, NextResponse } from "next/server";
import {
  isProductionAppOrigin,
  resolveConfiguredAppOrigin,
} from "@/lib/demo/partnerSandboxDemoEnvironmentGuard";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, must-revalidate" } as const;

export function isPartnerFlowProductionReadinessOrigin(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const configured = resolveConfiguredAppOrigin(env);
  if (!configured) return false;
  return isProductionAppOrigin(configured);
}

export function partnerFlowReadinessJson(
  body: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status,
    headers: NO_STORE_HEADERS,
  });
}

export function partnerFlowReadinessUnavailable(): NextResponse {
  return partnerFlowReadinessJson({ error: "Not found" }, { status: 404 });
}

export function guardPartnerFlowProductionReadinessRoute(_req: NextRequest): NextResponse | null {
  if (!isPartnerFlowProductionReadinessOrigin()) {
    return partnerFlowReadinessUnavailable();
  }
  return null;
}
