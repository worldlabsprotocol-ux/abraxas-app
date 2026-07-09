// FILE: app/api/admin/receipts/[receiptId]/route.ts
// Admin receipt inspector — policy version, claim refs, signature, audit timeline.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import {
  getReceiptAuditTimeline,
  getReceiptById,
} from "@/lib/decisionReceipts/service";
import { toPublicView, verifyRecordSignature, resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { getReceiptDependencies } from "@/lib/decisionReceipts/dependencies";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiptId } = await params;
  const record = await getReceiptById(receiptId);

  if (!record) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const audit = await getReceiptAuditTimeline(receiptId);
  const validity = await resolveReceiptValidity(record);
  const dependencies = await getReceiptDependencies(receiptId);

  return NextResponse.json({
    receipt: {
      ...toPublicView(record),
      decision_id: record.verification_decision_id,
      consent_receipt_id: record.consent_receipt_id,
      wallet_binding_ref: record.wallet_binding_ref,
      revoked_at: record.revoked_at,
      created_at: record.created_at,
      idempotency_key: record.idempotency_key,
    },
    signature_status: verifyRecordSignature(record) ? "valid" : "invalid",
    resolved_status: resolveReceiptStatus(record),
    current_validity: validity,
    dependencies,
    audit_timeline: audit,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { action?: string };
  if (body.action !== "revoke") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const { receiptId } = await params;
  const { revokeDecisionReceipt } = await import("@/lib/decisionReceipts/service");
  const actorId = req.headers.get("x-admin-pin") ?? "admin";
  const revoked = await revokeDecisionReceipt(receiptId, actorId);

  if (!revoked) {
    return NextResponse.json({ error: "Receipt not found or already revoked" }, { status: 404 });
  }

  return NextResponse.json({
    receipt_id: revoked.id,
    status: revoked.status,
    revoked_at: revoked.revoked_at,
  });
}
