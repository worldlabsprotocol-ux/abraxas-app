// FILE: app/api/v1/verification-requests/[id]/consent/route.ts
// Holder consents via browser session; policy engine returns decision.

import { NextRequest, NextResponse } from "next/server";
import { resolveAuthenticatedHolderSession } from "@/lib/passport/portableTrust/resolveHolderSession";
import { getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import { requireQualifiedPartnerMethod } from "@/lib/partner/requirePartnerMethodQualification";
import { consentAndDecide } from "@/lib/verification/requestsService";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  enforcePartnerFlowRateLimit,
  recordPartnerFlowRequestOutcome,
} from "@/lib/partner/partnerFlowRouteGuard";

const ENDPOINT = "/api/v1/verification-requests/consent" as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const started = Date.now();
  const session = await resolveAuthenticatedHolderSession(req);
  if (!session.ok) {
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      httpStatus: session.error === "forbidden" ? 403 : 401,
    });
    return NextResponse.json({ error: session.message }, { status: session.error === "forbidden" ? 403 : 401 });
  }

  const rateLimited = await enforcePartnerFlowRateLimit({
    request: req,
    endpoint: ENDPOINT,
    method: "POST",
    started,
    sessionSubject: session.subjectId,
  });
  if (rateLimited) return rateLimited;

  const { id } = await params;

  try {
    const sb = requireSupabaseAdmin();
    const { data: requestRow } = await sb
      .from("verification_requests")
      .select("partner_id, policy_id")
      .eq("id", id)
      .maybeSingle();
    if (!requestRow) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const qualified = await requireQualifiedPartnerMethod({
      request: req,
      verifyRequestId: id,
      partnerId: String(requestRow.partner_id ?? ""),
      policyId: String(requestRow.policy_id ?? ""),
      sessionSubject: session.subjectId,
    });
    if (!qualified.ok) {
      recordPartnerFlowRequestOutcome({
        request: req,
        endpoint: ENDPOINT,
        method: "POST",
        started,
        sessionSubject: session.subjectId,
        httpStatus: 403,
      });
      return NextResponse.json({
        error: "A qualifying method must complete before approval.",
        code: qualified.code,
        issuedReceipt: false,
      }, { status: 403 });
    }

    const result = await consentAndDecide({
      requestId: id,
      subjectId: session.subjectId,
      request: req,
    });

    const appOrigin = getPublicAppOriginFromRequest(req);

    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.subjectId,
      httpStatus: 200,
    });

    return NextResponse.json({
      decision: result.decision,
      claims: result.claims,
      valid_until: result.valid_until,
      decision_reference: result.decision_id,
      receipt_id: result.receipt_id,
      receipt_public_url: result.receipt_id
        ? `${appOrigin}/api/receipts/${result.receipt_id}/public`
        : null,
      reason_codes: result.reason_codes,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Consent failed";
    recordPartnerFlowRequestOutcome({
      request: req,
      endpoint: ENDPOINT,
      method: "POST",
      started,
      sessionSubject: session.subjectId,
      httpStatus: 400,
    });
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
