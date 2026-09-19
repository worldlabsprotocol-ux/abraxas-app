// FILE: app/api/v1/partner-verify/resume/route.ts
// Persist a tenant-scoped continuation. GET peeks only — never consumes, never returns a raw URL.

import { NextRequest, NextResponse } from "next/server";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import {
  parsePartnerVerifyResumeParams,
  type PartnerVerifyResumeParams,
} from "@/lib/partner/partnerVerifyResume";
import {
  attachPartnerVerifyResumeCookie,
  clearPartnerVerifyResumeCookie,
  PARTNER_VERIFY_RESUME_COOKIE,
  signPartnerVerifyResumeCookie,
  verifyPartnerVerifyResumeCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";
import { createPartnerFlowContinuationRecord, continuationIsUsable } from "@/lib/partner/partnerFlowContinuation";
import { createSupabaseContinuationStore } from "@/lib/partner/partnerFlowContinuationStore";
import { peekContinuationSafeView } from "@/lib/partner/activatePartnerFlowContinuation";

export const dynamic = "force-dynamic";

function sanitizeBody(body: Record<string, unknown>): PartnerVerifyResumeParams | null {
  const normalized = normalizePartnerVerifyInput({
    partnerId: typeof body.partnerId === "string" ? body.partnerId : null,
    policyId: typeof body.policyId === "string" ? body.policyId : null,
    returnUrl: typeof body.returnUrl === "string" ? body.returnUrl : null,
    permission: typeof body.permission === "string" ? body.permission : null,
    permissionVersion: typeof body.permissionVersion === "string" ? body.permissionVersion : null,
    purpose: typeof body.purpose === "string" ? body.purpose : null,
  });
  if (!normalized.ok) return null;

  const params = new URLSearchParams({
    partner_id: normalized.params.partnerId,
    return_url: normalized.params.returnUrl,
    policy_id: normalized.params.policyId,
  });
  if (normalized.params.permission) params.set("permission", normalized.params.permission);
  if (normalized.params.permissionVersion) {
    params.set("permission_version", normalized.params.permissionVersion);
  }
  if (normalized.params.purpose) params.set("purpose", normalized.params.purpose);

  const parsed = parsePartnerVerifyResumeParams(params);
  if (!parsed) return null;

  const appSlug = typeof body.appSlug === "string" ? body.appSlug.trim() : undefined;
  const policyVersion = typeof body.policyVersion === "number" ? body.policyVersion : undefined;
  return { ...parsed, appSlug, policyVersion };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resume = sanitizeBody(body);
  if (!resume) {
    return NextResponse.json({ error: "Invalid resume parameters" }, { status: 400 });
  }

  const record = createPartnerFlowContinuationRecord(resume);
  if (!record) {
    return NextResponse.json({ error: "Invalid resume parameters" }, { status: 400 });
  }

  try {
    await createSupabaseContinuationStore().save(record);
  } catch {
    // Cookie remains the OAuth-surviving pointer when the table is not yet applied.
  }

  const token = await signPartnerVerifyResumeCookie({ ...resume, jti: record.jti });
  if (!token) {
    return NextResponse.json({ error: "Resume cookie unavailable" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  attachPartnerVerifyResumeCookie(res, token);
  return res;
}

/**
 * GET — peek only. Does not consume. Does not return a path or return_url.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(PARTNER_VERIFY_RESUME_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: true, hasContinuation: false, action: null });
  }

  const payload = await verifyPartnerVerifyResumeCookie(token);
  if (!payload?.jti) {
    const res = NextResponse.json({ ok: true, hasContinuation: false, action: null });
    clearPartnerVerifyResumeCookie(res);
    return res;
  }

  try {
    const stored = await createSupabaseContinuationStore().peek(payload.jti);
    if (stored) {
      return NextResponse.json({ ok: true, ...peekContinuationSafeView(stored) });
    }
  } catch {
    // Fall through to signed cookie record.
  }

  const cookieRecord = {
    ...payload,
    jti: payload.jti,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    consumedAt: null,
  };
  return NextResponse.json({
    ok: true,
    ...peekContinuationSafeView(continuationIsUsable(cookieRecord) ? cookieRecord : null),
  });
}
