// FILE: app/api/admin/receipts/[receiptId]/route.ts
// Admin receipt inspector — policy version, claim refs, signature, audit timeline.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, resolveAdminAccess } from "@/lib/adminAuth";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  getReceiptAuditTimeline,
  getReceiptById,
} from "@/lib/decisionReceipts/service";
import { toPublicView, verifyRecordSignature, resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { evaluateReceiptCurrentValidity } from "@/lib/decisionReceipts/currentValidity";
import { getReceiptDependencies } from "@/lib/decisionReceipts/dependencies";
import {
  isRevocationReasonCode,
  revokeDecisionReceiptControlled,
} from "@/lib/decisionReceipts/revocationControlPlane";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { receiptId } = await params;
  const record = await getReceiptById(receiptId);

  if (!record) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  const audit = await getReceiptAuditTimeline(receiptId);
  const validity = await resolveReceiptValidity(record);
  const currentValidity = await evaluateReceiptCurrentValidity({ record });
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
    canonical_current_validity: currentValidity,
    dependencies,
    audit_timeline: audit,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    reason_code?: string;
    idempotency_key?: string;
  };
  if (body.action !== "revoke") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const reasonCode = body.reason_code ?? "operator_security_review";
  if (!isRevocationReasonCode(reasonCode)) {
    return NextResponse.json({ error: "invalid_reason_code" }, { status: 400 });
  }

  const { receiptId } = await params;
  const access = await resolveAdminAccess(req);
  const changedBy = resolveAdminActorCategory(access.method);

  const result = await revokeDecisionReceiptControlled({
    receiptId,
    reasonCode,
    changedBy,
    idempotencyKey: body.idempotency_key,
  });

  if (!result.ok) {
    const status = result.error === "receipt_not_found" ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  if (!result.alreadyRevoked) {
    try {
      const record = await getReceiptById(receiptId);
      const { recordIntegrationEventBestEffort } = await import("@/lib/partner/integrationObservability/record");
      await recordIntegrationEventBestEffort({
        partnerId: record?.partner_id ?? "unknown",
        environment: record?.decision_context === "production" ? "production" : "sandbox",
        eventType: "receipt_revoked",
        lifecycleStage: "receipt",
        outcome: "revoked",
        partnerSafeReason: "receipt_revoked",
        receiptId: result.receiptId,
        policyId: record?.policy_id ?? null,
        policyVersion: record?.policy_version ?? null,
        metadata: { public_code: result.reasonCode },
      });
    } catch {
      // Revocation telemetry must not block revocation.
    }
  }

  return NextResponse.json({
    receipt_id: result.receiptId,
    decision_id: result.decisionId,
    status: result.status,
    revoked_at: result.revokedAt,
    reason_code: result.reasonCode,
    already_revoked: result.alreadyRevoked,
  });
}
