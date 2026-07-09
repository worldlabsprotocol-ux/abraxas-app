// FILE: app/api/passport/transaction-eligibility/route.ts
// Tier 3 + sandbox partner policy status for signed-in holder.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getActiveClaims } from "@/lib/credentials/claimsService";
import {
  hasSandboxTier3Only,
  productionTier3ClaimTypes,
  SANDBOX_DISCLAIMER,
  isSandboxClaim,
} from "@/lib/credentials/sandboxClaims";
import { getTrustStatus } from "@/lib/trust/getTrustStatus";
import { buildPassportTierInput, resolvePassportTier, TIER_LABELS } from "@/lib/passport/passportTiers";
import { TIER3_CLAIM_LABELS } from "@/lib/passport/tier3Claims";
import { evaluateSubjectPolicy } from "@/lib/verification/requestsService";
import { getSandboxPartner } from "@/lib/relyingPartners";

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

  const activeClaims = await getActiveClaims(sui);
  const claimTypes = trust.claims.types;
  const walletBindingClaim = claimTypes.includes("wallet_binding_confirmed");
  const tierInput = buildPassportTierInput({
    walletRegistered: trust.wallet_registered,
    walletBindingClaim,
    identityCredentialActive: trust.enhanced_trust,
    activeClaimTypes: claimTypes,
  });
  tierInput.activeClaims = activeClaims;

  const tier = resolvePassportTier(tierInput);
  const prodTier3 = productionTier3ClaimTypes(activeClaims);
  const sandboxTier3Only = hasSandboxTier3Only(activeClaims);

  const sandbox = getSandboxPartner();
  let sandboxEval: Awaited<ReturnType<typeof evaluateSubjectPolicy>> | null = null;
  if (sandbox) {
    try {
      sandboxEval = await evaluateSubjectPolicy(sui, sandbox.policy_id);
    } catch {
      sandboxEval = null;
    }
  }

  return NextResponse.json({
    sui_address: sui,
    passport_tier: tier,
    tier_label: sandboxTier3Only && tier < 3
      ? `${TIER_LABELS[2]} · sandbox demo claims active`
      : TIER_LABELS[tier],
    transaction_eligibility: tier >= 3,
    tier3_sandbox_demo: sandboxTier3Only,
    tier3_claims: [
      ...prodTier3.map(ct => ({
        claim_type: ct,
        label: TIER3_CLAIM_LABELS[ct],
        environment: "production" as const,
      })),
      ...activeClaims
        .filter(c => isSandboxClaim(c) && (TIER3_CLAIM_LABELS as Record<string, string>)[c.claim_type])
        .map(c => ({
          claim_type: c.claim_type,
          label: (TIER3_CLAIM_LABELS as Record<string, string>)[c.claim_type],
          environment: "sandbox" as const,
          status: "demo" as const,
          expires_at: c.expires_at,
          issuer: String(c.claim_value.issuer ?? "Abraxas Sandbox"),
        })),
    ],
    sandbox_partner: sandbox && sandboxEval ? {
      partner_id: sandbox.partner_id,
      company: sandbox.company,
      policy_id: sandbox.policy_id,
      disclaimer: SANDBOX_DISCLAIMER,
      sandbox_only: true,
      decision: sandboxEval.decision,
      decision_context: sandboxEval.decision_context ?? "sandbox_only",
      production_usable: sandboxEval.production_usable ?? false,
      missing_claims: sandboxEval.missing_claims,
      reason_codes: sandboxEval.reason_codes,
      valid_until: sandboxEval.valid_until,
    } : null,
  });
}
