// FILE: app/api/developers/integration-studio/independent-enforcement/route.ts
// Sandbox builder — reference independent enforcement (separate-process semantics).

import { NextRequest, NextResponse } from "next/server";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { summarizeIndependentEnforcement } from "@/lib/developers/independentEnforcementSummary";
import { buildPortableVerificationBundle } from "@/lib/partner/portableIndependentVerification";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { verifyTrustExecutionMaterial } from "@/lib/partner/trustExecution/verifyTrustExecutionMaterial";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolvePartnerConsoleSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, status: "unauthorized" }, { status: 401 });
  }

  const receiptId = (req.nextUrl.searchParams.get("receipt_id") ?? "").trim();
  const policyId = (req.nextUrl.searchParams.get("policy_id") ?? "").trim();
  if (!receiptId || !policyId) {
    return NextResponse.json({ ok: false, status: "invalid" }, { status: 400 });
  }

  const record = await getReceiptById(receiptId);
  if (!record) {
    return NextResponse.json({ ok: false, status: "receipt_not_found" }, { status: 404 });
  }

  if (record.partner_id && record.partner_id !== session.partnerId) {
    return NextResponse.json({ ok: false, status: "tenant_mismatch" }, { status: 403 });
  }

  const built = await buildPortableVerificationBundle({ record });
  if (!built.ok) {
    return NextResponse.json(
      { ok: false, status: "bundle_unavailable", reason: built.reason, gaps: built.gaps ?? [] },
      { status: 503 },
    );
  }

  const bundle = built.bundle;
  const verified = verifyTrustExecutionMaterial({
    material: {
      portable_receipt: toIndependentVerifierRecord(bundle.decision_receipt),
      signed_issuer_authority: bundle.signed_issuer_authority,
      signed_status_statement: bundle.signed_status_statement,
    },
    pinnedTrustAnchor: bundle.bundled_trust_anchor,
    partnerId: session.partnerId,
    policyId,
    environment: record.decision_context === "production" ? "production" : "demo",
  });

  const summary = summarizeIndependentEnforcement(verified);

  return NextResponse.json({
    ok: true,
    receipt_id: receiptId,
    reference_only: true,
    verification: {
      cryptographically_authentic: verified.cryptographically_authentic,
      currently_acceptable: verified.currently_acceptable,
      failure_codes: verified.failure_codes,
    },
    enforcement: summary,
  });
}
