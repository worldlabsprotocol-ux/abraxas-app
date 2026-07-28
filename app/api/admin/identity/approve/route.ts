// FILE: app/api/admin/identity/approve/route.ts
// Approve, reject, or request resubmission for manual identity review.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/adminAuth";
import { executeAdminReviewAction, type AdminReviewAction } from "@/lib/idv/adminReviewService";

const VALID_ACTIONS = new Set<AdminReviewAction>(["approve", "reject", "request_resubmission"]);

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
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
  };

  if (!body.document_id || !body.action) {
    return NextResponse.json({ error: "document_id and action required" }, { status: 400 });
  }

  if (!VALID_ACTIONS.has(body.action)) {
    return NextResponse.json({
      error: "action must be approve, reject, or request_resubmission",
    }, { status: 400 });
  }

  const result = await executeAdminReviewAction({
    documentId: body.document_id,
    action: body.action,
    reviewerId: body.reviewer ?? "admin",
    note: body.note,
    rejectionReasons: body.rejection_reasons,
    jurisdiction: body.jurisdiction,
    documentType: body.document_type,
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
  });
}
