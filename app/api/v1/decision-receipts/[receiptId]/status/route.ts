// FILE: app/api/v1/decision-receipts/[receiptId]/status/route.ts
// Partner-authenticated live receipt validity — original artifact preserved.

import { NextRequest, NextResponse } from "next/server";
import { authenticateV1Partner } from "@/lib/verification/v1PartnerAuth";
import { getReceiptById } from "@/lib/decisionReceipts/service";
import { resolveReceiptValidity } from "@/lib/decisionReceipts/validityResolver";
import { toPublicView } from "@/lib/decisionReceipts/views";
import { getReceiptDependencies } from "@/lib/decisionReceipts/dependencies";
import { appendAuditEvent } from "@/lib/verification/audit";
import { logPartnerUsage } from "@/lib/partner/logPartnerUsage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> },
) {
  const started = Date.now();
  const auth = await authenticateV1Partner(req, "verify:requests");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { receiptId } = await params;
  const record = await getReceiptById(receiptId);

  if (!record) {
    void logPartnerUsage({
      endpoint: "/api/v1/decision-receipts/{receiptId}/status",
      method: "GET",
      success: false,
      partner: auth.ctx,
      httpStatus: 404,
      responseTimeMs: Date.now() - started,
      recordId: receiptId,
    });
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  if (record.partner_id !== auth.partnerId) {
    return NextResponse.json({ error: "Receipt not accessible for this partner" }, { status: 403 });
  }

  const validity = await resolveReceiptValidity(record, {
    partnerId: auth.partnerId,
    policyId: record.policy_id,
  });
  const dependencies = await getReceiptDependencies(receiptId);
  const publicView = toPublicView(record);

  void appendAuditEvent({
    actor_type: "partner",
    actor_id: auth.partnerId,
    action: "decision_receipt.status_lookup",
    object_type: "decision_receipt",
    object_id: receiptId,
    metadata: { validity: validity.validity, currently_valid: validity.currently_valid },
  });

  void logPartnerUsage({
    endpoint: "/api/v1/decision-receipts/{receiptId}/status",
    method: "GET",
    success: true,
    partner: auth.ctx,
    httpStatus: 200,
    responseTimeMs: Date.now() - started,
    recordId: receiptId,
    policyId: record.policy_id,
    decision: record.decision_result,
  });

  return NextResponse.json({
    artifact_type: "policy_evaluation_receipt_status",
    receipt: {
      receipt_id: publicView.receipt_id,
      policy_id: publicView.policy_id,
      policy_version: publicView.policy_version,
      decision_result: publicView.decision_result,
      evaluated_at: publicView.evaluated_at,
      expires_at: publicView.expires_at,
      signature_valid: publicView.signature_valid,
    },
    validity: validity.validity,
    currently_valid: validity.currently_valid,
    invalidation_reasons: validity.invalidation_reasons,
    dependencies: dependencies.map(d => ({
      claim_id: d.claim_id,
      claim_type: d.claim_type,
      issuer_id: d.issuer_id,
    })),
  });
}
