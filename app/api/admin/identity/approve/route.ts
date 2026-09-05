// FILE: app/api/admin/identity/approve/route.ts
// Approve, reject, or request resubmission for manual identity review.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/adminAuth";
import { executeAdminReviewAction, type AdminReviewAction } from "@/lib/idv/adminReviewService";
import { parseAuthoritativeDateOfBirth } from "@/lib/idv/ageEligibility";

const VALID_ACTIONS = new Set<AdminReviewAction>(["approve", "reject", "request_resubmission"]);

export async function POST(req: NextRequest) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    document_id?: string;
    action?: AdminReviewAction;
    jurisdiction?: string;
    document_type?: string;
    reviewer?: string;
    note?: string;
    rejection_reasons?: string[];
    document_date_of_birth?: string;
    minimum_age_gate?: number;
  };

  if (!body.document_id || !body.action) {
    return NextResponse.json({ error: "document_id and action required" }, { status: 400 });
  }

  if (!VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({
      error: "action must be approve, reject, or request_resubmission",
    }, { status: 400 });
  }

  const minimumAgeGate = body.minimum_age_gate != null
    ? Number(body.minimum_age_gate)
    : undefined;

  if (minimumAgeGate != null && (!Number.isInteger(minimumAgeGate) || minimumAgeGate < 1)) {
    return NextResponse.json({ error: "minimum_age_gate must be a positive integer" }, { status: 400 });
  }

  if (body.action === "approve" && minimumAgeGate != null && minimumAgeGate >= 21) {
    if (!body.note?.trim()) {
      return NextResponse.json({ error: "Reviewer reason (note) is required for age eligibility approval" }, { status: 400 });
    }
    if (!body.document_date_of_birth?.trim()) {
      return NextResponse.json({ error: "document_date_of_birth is required for age eligibility approval" }, { status: 400 });
    }
    if (!parseAuthoritativeDateOfBirth(body.document_date_of_birth)) {
      return NextResponse.json({ error: "document_date_of_birth must be YYYY-MM-DD" }, { status: 400 });
    }
  }

  const result = await executeAdminReviewAction({
    documentId: body.document_id,
    action: body.action,
    reviewerId: body.reviewer ?? "admin",
    note: body.note,
    rejectionReasons: body.rejection_reasons,
    jurisdiction: body.jurisdiction,
    documentType: body.document_type,
    documentDateOfBirth: body.document_date_of_birth?.trim(),
    minimumAgeGate,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  return NextResponse.json({
    ok: true,
    action: result.action,
    document_id: result.documentId,
    capture_session_id: result.captureSessionId,
    engine_decision: result.engineDecision,
    reviewer_decision: result.reviewerDecision,
    sui_address: result.suiAddress,
    jti: result.jti,
    already_issued: result.alreadyIssued ?? false,
    age_evidence_id: result.ageEvidenceId ?? null,
  });
}
