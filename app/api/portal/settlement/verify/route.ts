// FILE: app/api/portal/settlement/verify/route.ts
// Verify on-chain USDC payment for owner settlement.

import { NextRequest, NextResponse } from "next/server";
import { verifyCieloPayment } from "@/lib/cielo/paymentVerify";
import { captureOwnerSettlement, fetchOwnerApplication } from "@/lib/portal/ownerApplicationStore";
import { findLocalPortalApplication, updateLocalPortalApplication } from "@/lib/portal/localApplications";
import { buildOwnerJourney } from "@/lib/portal/ownerJourney";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.application_id ?? "").trim();
  const email = String(body.email ?? "").trim();
  const txDigest = String(body.tx_digest ?? "").trim();

  if (!applicationId || !email || !txDigest) {
    return NextResponse.json({ error: "application_id, email, and tx_digest required" }, { status: 400 });
  }

  let row;
  if (applicationId.startsWith("local-")) {
    const local = findLocalPortalApplication(applicationId, email);
    if (!local) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    row = {
      id: local.application_id,
      status: local.status,
      asset_name: local.asset_name,
      asset_class: local.asset_class,
      contact_email: local.contact_email,
      linked_wallet: local.linked_wallet ?? null,
      deal_status: local.deal_status ?? "deal_ready",
      settlement_amount_usdc: local.settlement_amount_usdc ?? 100,
      settlement_tx_digest: local.settlement_tx_digest ?? null,
      created_at: local.created_at,
    };
  } else {
    row = await fetchOwnerApplication(applicationId, email);
    if (!row) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
  }

  if (row.settlement_tx_digest) {
    return NextResponse.json({
      ok: true,
      already_settled: true,
      tx_digest: row.settlement_tx_digest,
    });
  }

  const journey = buildOwnerJourney(row);
  const expected = journey.settlement_amount_usdc ?? 0;
  if (!journey.deal_ready || expected <= 0) {
    return NextResponse.json({ error: "Deal not ready for settlement" }, { status: 403 });
  }

  const verification = await verifyCieloPayment(
    txDigest,
    expected,
    row.linked_wallet,
  );

  if (!verification.ok) {
    return NextResponse.json({
      ok: false,
      error: verification.error ?? "Payment verification failed",
      verification,
    }, { status: 400 });
  }

  if (applicationId.startsWith("local-")) {
    updateLocalPortalApplication(applicationId, {
      settlement_tx_digest: txDigest,
      deal_status: "settled",
    });
  } else {
    const cap = await captureOwnerSettlement(applicationId, txDigest, verification.amount_human);
    if (!cap.ok) {
      return NextResponse.json({ error: cap.error ?? "Capture failed" }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    application_id: applicationId,
    status: "settled",
    verification,
  });
}
