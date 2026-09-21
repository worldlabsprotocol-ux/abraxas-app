// FILE: app/api/reclaim/availability/route.ts
// Safe holder/admin applicability. No secrets or provider internals.

import { NextRequest, NextResponse } from "next/server";
import { RECLAIM_HOLDER_COPY, reclaimIsIntegrationReady, reclaimPayloadLeaks } from "@/lib/reclaimAttestation";
import { reclaimRouteForPolicy } from "@/lib/reclaimAttestation/policyFit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const policyId = request.nextUrl.searchParams.get("policy_id")?.trim() ?? "";
  const route = policyId ? reclaimRouteForPolicy(policyId) : null;
  const body = {
    ok: true,
    available: Boolean(route?.available),
    configuration_present: reclaimIsIntegrationReady(),
    holder_copy: RECLAIM_HOLDER_COPY,
    method_category: "privacy_preserving",
    issued_receipt: false,
    google_is_eligibility: false,
  };
  if (reclaimPayloadLeaks(body).length > 0) {
    return NextResponse.json({ ok: false, code: "disclosure_rejected" }, { status: 503 });
  }
  return NextResponse.json(body);
}
