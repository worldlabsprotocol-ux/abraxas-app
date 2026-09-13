// FILE: app/api/v1/partner-verify/resume/route.ts
// Persist partner-verify entry in a signed HttpOnly cookie across OAuth redirect.

import { NextRequest, NextResponse } from "next/server";
import { normalizePartnerVerifyInput } from "@/lib/partner/normalizePartnerVerifyInput";
import {
  parsePartnerVerifyResumeParams,
  type PartnerVerifyResumeParams,
} from "@/lib/partner/partnerVerifyResume";
import {
  attachPartnerVerifyResumeCookie,
  buildResumePathFromPayload,
  clearPartnerVerifyResumeCookie,
  PARTNER_VERIFY_RESUME_COOKIE,
  signPartnerVerifyResumeCookie,
  verifyPartnerVerifyResumeCookie,
} from "@/lib/partner/partnerVerifyResumeCookie";

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

  return parsePartnerVerifyResumeParams(params);
}

/**
 * POST — store resumable partner-verify path in signed HttpOnly cookie.
 */
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

  const token = await signPartnerVerifyResumeCookie(resume);
  if (!token) {
    return NextResponse.json({ error: "Resume cookie unavailable" }, { status: 503 });
  }

  const res = NextResponse.json({ ok: true });
  attachPartnerVerifyResumeCookie(res, token);
  return res;
}

/**
 * GET — consume cookie and return restorable partner-verify path (OAuth resume fallback).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(PARTNER_VERIFY_RESUME_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ ok: false, code: "no_resume" }, { status: 404 });
  }

  const payload = await verifyPartnerVerifyResumeCookie(token);
  if (!payload) {
    const res = NextResponse.json({ ok: false, code: "invalid_resume" }, { status: 400 });
    clearPartnerVerifyResumeCookie(res);
    return res;
  }

  const path = buildResumePathFromPayload(payload);
  if (!path) {
    const res = NextResponse.json({ ok: false, code: "invalid_resume" }, { status: 400 });
    clearPartnerVerifyResumeCookie(res);
    return res;
  }

  const res = NextResponse.json({
    ok: true,
    path,
  });
  clearPartnerVerifyResumeCookie(res);
  return res;
}
