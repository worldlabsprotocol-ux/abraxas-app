// FILE: app/api/admin/credentials/[credentialId]/route.ts
// Admin credential timeline inspector.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import {
  getCredentialStatusPublic,
  getClaimStatusTimeline,
  getReceiptIdsForClaim,
} from "@/lib/trust/credentialStatusRegistry";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> },
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { credentialId } = await params;
  const status = await getCredentialStatusPublic(credentialId);
  if (!status) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  const timeline = await getClaimStatusTimeline(credentialId);
  const receiptIds = await getReceiptIdsForClaim(credentialId);
  const dependentReceipts = await Promise.all(
    receiptIds.map(async id => {
      const record = await getReceiptById(id);
      if (!record) return null;
      const validity = await resolveReceiptValidity(record);
      return {
        receipt_id: id,
        validity: validity.validity,
        currently_valid: validity.currently_valid,
      };
    }),
  );

  return NextResponse.json({
    credential: status,
    status_timeline: timeline,
    dependent_receipts: dependentReceipts.filter(Boolean),
  });
}
