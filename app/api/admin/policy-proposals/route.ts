// FILE: app/api/admin/policy-proposals/route.ts
// Operator policy-proposal queue. Safe fields and planning records only.

import { NextRequest, NextResponse } from "next/server";
import { requireAdminRouteAccess } from "@/lib/admin/requireAdminRouteAccess";
import { listOperatorProposals, POLICY_PROPOSAL_NOTICE } from "@/lib/partner/policyProposal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminRouteAccess(req);
  if (denied) return denied;
  const result = await listOperatorProposals();
  if (!result.ok) return NextResponse.json({ error: result.code }, { status: 503 });
  return NextResponse.json({
    ok: true,
    notice: POLICY_PROPOSAL_NOTICE,
    items: result.items,
    creates_policy: false,
    publishes_catalog: false,
    activates_mainnet: false,
  }, { headers: { "Cache-Control": "no-store" } });
}
