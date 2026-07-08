// FILE: app/api/passport/transaction-eligibility/route.ts
// Tier 3 + partner policy status for signed-in holder.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getTrustStatus } from "@/lib/trust/getTrustStatus";
import { buildPassportTierInput, resolvePassportTier, TIER_LABELS } from "@/lib/passport/passportTiers";
import { activeTier3Claims, TIER3_CLAIM_LABELS } from "@/lib/passport/tier3Claims";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";
import { getRelyingPartner } from "@/lib/relyingPartners";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const sui = session.session.suiAddress;
  const trust = await getTrustStatus(sui);
  if (!trust) {
    return NextResponse.json({ error: "Trust status unavailable" }, { status: 503 });
  }

  const claimTypes = trust.claims.types;
  const walletBindingClaim = claimTypes.includes("wallet_binding_confirmed");
  const tierInput = buildPassportTierInput({
    walletRegistered: trust.wallet_registered,
    walletBindingClaim,
    identityCredentialActive: trust.enhanced_trust,
    activeClaimTypes: claimTypes,
  });
  const tier = resolvePassportTier(tierInput);
  const tier3 = activeTier3Claims(claimTypes);

  const meridian = getRelyingPartner("meridian-private-credit");
  let meridianEval: Awaited<ReturnType<typeof evaluateSubjectPolicy>> | null = null;
  if (meridian) {
    try {
      meridianEval = await evaluateSubjectPolicy(sui, meridian.policy_id);
    } catch {
      meridianEval = null;
    }
  }

  return NextResponse.json({
    sui_address: sui,
    passport_tier: tier,
    tier_label: TIER_LABELS[tier],
    transaction_eligibility: tier >= 3,
    tier3_claims: tier3.map(ct => ({
      claim_type: ct,
      label: TIER3_CLAIM_LABELS[ct],
    })),
    meridian: meridian && meridianEval ? {
      partner_id: meridian.partner_id,
      company: meridian.company,
      policy_id: meridian.policy_id,
      decision: meridianEval.decision,
      missing_claims: meridianEval.missing_claims,
      reason_codes: meridianEval.reason_codes,
      valid_until: meridianEval.valid_until,
    } : null,
  });
}
