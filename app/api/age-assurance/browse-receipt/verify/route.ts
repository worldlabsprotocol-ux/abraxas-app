// FILE: app/api/age-assurance/browse-receipt/verify/route.ts
// POST verify L0 browse receipt — not valid for purchase authorization.

import { NextRequest, NextResponse } from "next/server";
import { ageAssuranceErrorResponse } from "@/lib/assurance/ageProviders/routeHelpers";
import { verifyBrowseAccessReceipt } from "@/lib/assurance/selfAttestation/browseReceipt";
import { getSelfAttestationByReceiptId } from "@/lib/assurance/selfAttestation/selfAttestationLedger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: { browse_receipt?: string; partner_id?: string; policy_id?: string };
  try {
    body = await request.json();
  } catch {
    return ageAssuranceErrorResponse("invalid_json", "Invalid JSON", 400);
  }

  const token = body.browse_receipt?.trim() ?? "";
  const partnerId = body.partner_id?.trim() ?? "";
  const policyId = body.policy_id?.trim() ?? "";

  if (!token || !partnerId || !policyId) {
    return ageAssuranceErrorResponse(
      "missing_params",
      "browse_receipt, partner_id, and policy_id are required",
      400,
    );
  }

  const verified = await verifyBrowseAccessReceipt(token);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, verified: false, code: verified.code }, { status: 400 });
  }

  const payload = verified.payload;
  if (payload.partner_id !== partnerId || payload.policy_id !== policyId) {
    return NextResponse.json({ ok: false, verified: false, code: "context_mismatch" }, { status: 400 });
  }

  const ledgerRow = await getSelfAttestationByReceiptId(payload.receipt_id);
  if (!ledgerRow || ledgerRow.revoked_at || new Date(ledgerRow.expires_at) < new Date()) {
    return NextResponse.json({ ok: false, verified: false, code: "attestation_inactive" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    verified: true,
    purpose: payload.purpose,
    assurance_level: payload.assurance_level,
    valid_for_purchase: false,
    age_band: payload.age_band,
    expires_at: payload.expires_at,
  });
}
