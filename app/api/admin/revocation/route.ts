// FILE: app/api/admin/revocation/route.ts
// Admin-only credential and partner receipt revocation control plane.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, resolveAdminAccess } from "@/lib/adminAuth";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  isRevocationReasonCode,
  listSubjectPartnerAccess,
  revokeCredentialClaimControlled,
  revokeDecisionReceiptControlled,
  revokeSubjectPartnerAccess,
} from "@/lib/decisionReceipts/revocationControlPlane";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    target_type?: "receipt" | "credential_claim" | "subject_access";
    receipt_id?: string;
    claim_id?: string;
    subject_id?: string;
    reason_code?: string;
    idempotency_key?: string;
  };

  if (!body.target_type || !body.reason_code || !isRevocationReasonCode(body.reason_code)) {
    return NextResponse.json({ error: "target_type and valid reason_code required" }, { status: 400 });
  }

  const access = await resolveAdminAccess(req);
  const changedBy = resolveAdminActorCategory(access.method);

  if (body.target_type === "receipt") {
    const receiptId = body.receipt_id?.trim();
    if (!receiptId) {
      return NextResponse.json({ error: "receipt_id required" }, { status: 400 });
    }

    const result = await revokeDecisionReceiptControlled({
      receiptId,
      reasonCode: body.reason_code,
      changedBy,
      idempotencyKey: body.idempotency_key,
    });

    if (!result.ok) {
      const status = result.error === "receipt_not_found" ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      target_type: "receipt",
      receipt_id: result.receiptId,
      decision_id: result.decisionId,
      status: result.status,
      revoked_at: result.revokedAt,
      reason_code: result.reasonCode,
      already_revoked: result.alreadyRevoked,
      claim_ids: result.claimIds,
    });
  }

  if (body.target_type === "credential_claim") {
    const claimId = body.claim_id?.trim();
    if (!claimId) {
      return NextResponse.json({ error: "claim_id required" }, { status: 400 });
    }

    const result = await revokeCredentialClaimControlled({
      claimId,
      reasonCode: body.reason_code,
      changedBy,
      idempotencyKey: body.idempotency_key,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      target_type: "credential_claim",
      claim_id: result.claimId,
      status: result.status,
      already_revoked: result.alreadyRevoked,
      affected_receipt_ids: result.affectedReceiptIds,
      reason_code: body.reason_code,
    });
  }

  const subjectId = body.subject_id?.trim();
  if (!subjectId) {
    return NextResponse.json({ error: "subject_id required" }, { status: 400 });
  }

  const result = await revokeSubjectPartnerAccess({
    subjectId,
    reasonCode: body.reason_code,
    changedBy,
    idempotencyKey: body.idempotency_key,
  });

  const subjectAccess = await listSubjectPartnerAccess(subjectId);

  return NextResponse.json({
    ok: true,
    target_type: "subject_access",
    subject_pseudonym_id: subjectAccess.subject_pseudonym_id,
    reason_code: body.reason_code,
    revoked_claim_ids: result.revokedClaimIds,
    revoked_receipt_ids: result.revokedReceiptIds,
    already_revoked_receipt_ids: result.alreadyRevokedReceiptIds,
  });
}
