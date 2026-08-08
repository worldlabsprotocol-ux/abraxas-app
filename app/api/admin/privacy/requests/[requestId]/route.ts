// FILE: app/api/admin/privacy/requests/[requestId]/route.ts
// Admin review actions for a privacy request.

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, resolveAdminAccess } from "@/lib/adminAuth";
import { resolveAdminActorCategory } from "@/lib/admin/adminActorCategory";
import {
  approveDeletionPrivacyRequest,
  approveExportPrivacyRequest,
  completePrivacyRequest,
  denyPrivacyRequest,
  getPrivacyRequestById,
  placePrivacyRequestOnLegalHold,
  startPrivacyRequestReview,
} from "@/lib/privacy/privacyControlPlane";
import { isPrivacyReasonCode } from "@/lib/privacy/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const record = await getPrivacyRequestById(requestId);
  if (!record) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return NextResponse.json({
    request: {
      id: record.id,
      request_ref: record.id.slice(0, 8),
      request_type: record.request_type,
      status: record.status,
      reason_code: record.reason_code,
      subject_pseudonym_id: record.subject_pseudonym_id,
      created_at: record.created_at,
      updated_at: record.updated_at,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  if (!await checkAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    reason_code?: string;
    idempotency_key?: string;
  };

  const { requestId } = await params;
  const access = await resolveAdminAccess(req);
  const actorCategory = resolveAdminActorCategory(access.method);

  const base = {
    requestId,
    adminActorCategory: actorCategory,
    idempotencyKey: body.idempotency_key,
  };

  switch (body.action) {
    case "start_review": {
      const result = await startPrivacyRequestReview(base);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ request: result.request });
    }
    case "approve_export": {
      const result = await approveExportPrivacyRequest(base);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ request: result.request });
    }
    case "approve_deletion": {
      const result = await approveDeletionPrivacyRequest(base);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({
        request: result.request,
        access_revoked: result.accessRevoked,
        purge_pending: true,
      });
    }
    case "deny": {
      const reasonCode = body.reason_code && isPrivacyReasonCode(body.reason_code)
        ? body.reason_code
        : undefined;
      const result = await denyPrivacyRequest({ ...base, reasonCode });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ request: result.request });
    }
    case "legal_hold": {
      const result = await placePrivacyRequestOnLegalHold(base);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ request: result.request });
    }
    case "complete": {
      const result = await completePrivacyRequest(base);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ request: result.request });
    }
    default:
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
}
