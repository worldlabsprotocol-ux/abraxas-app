// FILE: app/api/good-trouble/batch/route.ts
// Pilot batch provenance lookup for Good Trouble fixture records.

import { NextRequest, NextResponse } from "next/server";
import { getGoodTroubleBatch, batchVerifyPayload } from "@/lib/goodTrouble/batchProvenance";
import { batchToCredentialSubject } from "@/lib/credentials/cannabisBatchCredential";
import { GOOD_TROUBLE_PILOT_DISCLAIMER } from "@/lib/goodTrouble/constants";

export async function GET(req: NextRequest) {
  const recordId = req.nextUrl.searchParams.get("record_id")
    ?? req.nextUrl.searchParams.get("batch_code");

  if (!recordId?.trim()) {
    return NextResponse.json(
      { error: "record_id or batch_code query parameter required" },
      { status: 400 },
    );
  }

  const batch = getGoodTroubleBatch(recordId);
  if (!batch) {
    return NextResponse.json(
      { error: "Batch not found", record_id: recordId, pilot: true },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    pilot: true,
    notice: GOOD_TROUBLE_PILOT_DISCLAIMER,
    batch: batchVerifyPayload(batch),
    credential_subject: batchToCredentialSubject(batch),
    verify_hint: "POST /api/credentials/verify with policy_id good-trouble-batch-v1 when batch attestation is live",
  });
}
