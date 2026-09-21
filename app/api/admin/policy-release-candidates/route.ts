// FILE: app/api/admin/policy-release-candidates/route.ts
// Operator release-candidate queue. Safe fields only.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { listReleaseCandidates, POLICY_RC_NOTICE, policyRcPublicChoices } from "@/lib/partner/policyReleaseCandidate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const result = await listReleaseCandidates();
  if (!result.ok) return NextResponse.json({ error: result.code }, { status: 503 });
  return NextResponse.json({
    ok: true,
    notice: POLICY_RC_NOTICE,
    choices: policyRcPublicChoices(),
    items: result.items,
    creates_policy: false,
    publishes_catalog: false,
    activates_mainnet: false,
  }, { headers: { "Cache-Control": "no-store" } });
}
