// FILE: app/api/cielo/verified-rate/submit/route.ts
// Submit pilot verified-rate booking request (approved eligibility only).

import { NextRequest, NextResponse } from "next/server";
import { submitVerifiedRateRequest } from "@/lib/cielo/verifiedRateService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    sui_address?: string;
    verification_decision_id?: string;
    consent_receipt_id?: string;
    check_in?: string;
    check_out?: string;
    guests?: number;
    guest_name?: string;
    contact_email?: string;
    notes?: string;
  };

  if (!body.sui_address || !body.verification_decision_id || !body.consent_receipt_id) {
    return NextResponse.json({
      error: "sui_address, verification_decision_id, and consent_receipt_id required",
    }, { status: 400 });
  }

  if (!body.guest_name?.trim() || !body.contact_email?.trim()) {
    return NextResponse.json({ error: "guest_name and contact_email required" }, { status: 400 });
  }

  try {
    const result = await submitVerifiedRateRequest({
      suiAddress: body.sui_address,
      decisionId: body.verification_decision_id,
      consentReceiptId: body.consent_receipt_id,
      checkIn: body.check_in,
      checkOut: body.check_out,
      guests: body.guests,
      guestName: body.guest_name.trim(),
      contactEmail: body.contact_email.trim(),
      notes: body.notes?.trim(),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
