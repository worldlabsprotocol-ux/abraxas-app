// FILE: lib/demo/partnerSandboxDemoRouteGuard.ts
// Shared admin + feature-flag guard for partner sandbox demo routes.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { isPartnerSandboxDemoEnabled } from "@/lib/demo/partnerSandboxDemoConfig";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, must-revalidate" } as const;

export function partnerSandboxDemoJson(
  body: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status,
    headers: NO_STORE_HEADERS,
  });
}

export function partnerSandboxDemoUnavailable(): NextResponse {
  return partnerSandboxDemoJson({ error: "Not found" }, { status: 404 });
}

export function guardPartnerSandboxDemoRoute(req: NextRequest): NextResponse | null {
  if (!isPartnerSandboxDemoEnabled()) {
    return partnerSandboxDemoUnavailable();
  }
  if (!checkAdmin(req)) {
    return partnerSandboxDemoJson({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
