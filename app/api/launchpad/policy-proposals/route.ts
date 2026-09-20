// FILE: app/api/launchpad/policy-proposals/route.ts
// Signed-in Launchpad partner policy proposals. Session partner only.

import { NextRequest, NextResponse } from "next/server";
import { requireLaunchpadSession, launchpadError, enforceLaunchpadTenantRateLimit } from "@/lib/partner/launchpad/apiHelpers";
import {
  listPartnerProposals,
  policyProposalCsrfRejected,
  partnerProposalOverride,
  policyProposalPublicChoices,
  submitPolicyProposal,
  POLICY_PROPOSAL_NOTICE,
} from "@/lib/partner/policyProposal";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const result = await listPartnerProposals(auth.session.partnerId);
  if (!result.ok) return launchpadError(result.code, result.code === "policy_proposal_store_unavailable" ? 503 : 400);
  return NextResponse.json({
    ok: true,
    notice: POLICY_PROPOSAL_NOTICE,
    choices: policyProposalPublicChoices(),
    items: result.items,
    creates_policy: false,
    publishes_catalog: false,
    activates_mainnet: false,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  if (policyProposalCsrfRejected(req)) return launchpadError("policy_proposal_csrf_required", 403);
  const limited = enforceLaunchpadTenantRateLimit(req, "launchpad:policy-proposal", auth.session.partnerId, 8);
  if (limited) return limited;
  const body = await req.json().catch(() => null);
  if (partnerProposalOverride(body)) return launchpadError("policy_proposal_client_override_rejected", 400);
  const record = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const result = await submitPolicyProposal({
    partnerId: auth.session.partnerId,
    body,
    confirm: record.confirm === true,
  });
  if (!result.ok) {
    const status = result.code === "policy_proposal_store_unavailable" ? 503 : 400;
    return launchpadError(result.code, status);
  }
  return NextResponse.json({ ok: true, ...result.item }, { headers: { "Cache-Control": "no-store" } });
}
