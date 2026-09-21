// FILE: app/api/reclaim/session/route.ts
// Holder session for Reclaim. Server creates the request; browser never receives the app secret.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { resolveBoundPartnerContinuation } from "@/lib/partner/resolveBoundPartnerContinuation";
import { CONTINUATION_STORE_UNAVAILABLE } from "@/lib/partner/partnerFlowContinuation";
import {
  RECLAIM_HOLDER_COPY,
  cancelReclaimSession,
  createReclaimSession,
  publicReclaimSessionView,
  reclaimPayloadLeaks,
} from "@/lib/reclaimAttestation";
import { reclaimRouteForPolicy } from "@/lib/reclaimAttestation/policyFit";
import { loadReclaimSession } from "@/lib/reclaimAttestation/store";
import { holderBindingHmac } from "@/lib/reclaimAttestation/opaque";

export const dynamic = "force-dynamic";

function fail(code: string, status: number) {
  return NextResponse.json({
    ok: false,
    code,
    issued_receipt: false,
    consent_required: true,
  }, { status });
}

export async function GET(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) return fail(session.error, session.status);

  const sessionRef = request.nextUrl.searchParams.get("session_ref")?.trim() ?? "";
  if (!sessionRef) return fail("missing", 400);
  let record;
  try {
    record = await loadReclaimSession(sessionRef);
  } catch {
    return fail("schema_unavailable", 503);
  }
  if (!record || record.holder_hmac !== holderBindingHmac(session.session.suiAddress)) {
    return fail("reclaim_session_missing", 404);
  }
  const view = publicReclaimSessionView({
    session_ref: record.session_ref,
    status: record.status,
    expires_at: record.expires_at,
    method_category: record.method_category,
    result_class: record.result_class,
    assurance_level: record.assurance_level,
    environment: record.environment,
    configuration_present: true,
    issued_receipt: false,
    consent_required: true,
    next_action: record.status === "accepted" ? "continue_consent" : record.status === "created" ? "wait" : "retry",
    holder_copy: RECLAIM_HOLDER_COPY,
  });
  if (!view || reclaimPayloadLeaks(view).length > 0) return fail("disclosure_rejected", 503);
  return NextResponse.json({ ok: true, ...view });
}

export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) return fail(session.error, session.status);

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (typeof body.provider_id === "string" || typeof body.provider_version === "string" || typeof body.mapping_id === "string") {
    return fail("reclaim_client_override_rejected", 400);
  }
  const verifyRequest = typeof body.verify_request === "string" ? body.verify_request.trim() : "";
  if (!verifyRequest) return fail("missing", 400);

  const bound = await resolveBoundPartnerContinuation({
    request,
    verifyRequestId: verifyRequest,
    sessionSubject: session.session.suiAddress,
  });
  if (!bound.ok) {
    return fail(bound.code, bound.code === CONTINUATION_STORE_UNAVAILABLE ? 503 : 400);
  }

  const route = reclaimRouteForPolicy(bound.stored.policyId, "sandbox");
  if (!route?.available) return fail("reclaim_unavailable", 400);

  const created = await createReclaimSession({
    holderSubject: session.session.suiAddress,
    verifyRequest,
    policyId: bound.stored.policyId,
    policyVersion: bound.stored.policyVersion ?? 1,
    methodCategory: "privacy_preserving",
    resultClass: route.resultClass,
    assuranceLevel: route.pack.minimum_assurance,
    environment: "sandbox",
  });
  if (!created.ok) {
    const status = created.code === "schema_unavailable" || created.code === "reclaim_configuration_missing" ? 503 : 400;
    return fail(created.code, status);
  }
  if (reclaimPayloadLeaks(created.browser).length > 0) return fail("disclosure_rejected", 503);
  return NextResponse.json({ ok: true, ...created.browser, issued_receipt: false });
}

export async function DELETE(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) return fail(session.error, session.status);
  const sessionRef = request.nextUrl.searchParams.get("session_ref")?.trim() ?? "";
  if (!sessionRef) return fail("missing", 400);
  const cancelled = await cancelReclaimSession(sessionRef, session.session.suiAddress);
  if (!cancelled) return fail("reclaim_session_missing", 404);
  return NextResponse.json({
    ok: true,
    session_ref: cancelled.session_ref,
    status: cancelled.status,
    issued_receipt: false,
    next_action: "retry",
  });
}
