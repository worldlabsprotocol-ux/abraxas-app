// FILE: lib/partner/partnerVerifyResumeCookie.ts
// Signed HttpOnly partner-flow continuation pointer — jti only is trusted with the server store.

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import {
  buildPartnerVerifyPath,
  isRestorablePartnerVerifyPath,
  type PartnerVerifyResumeParams,
} from "@/lib/partner/partnerVerifyResume";

export const PARTNER_VERIFY_RESUME_COOKIE = "abraxas_partner_verify_resume";
export const PARTNER_CONTINUE_BINDING_COOKIE = "abraxas_partner_continue_binding";
const MAX_AGE_SEC = 30 * 60;

function resumeSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export type PartnerVerifyResumeCookiePayload = PartnerVerifyResumeParams & {
  jti?: string;
};

export type PartnerContinueBindingPayload = {
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  purpose?: string;
  returnUrl: string;
};

export async function signPartnerVerifyResumeCookie(
  payload: PartnerVerifyResumeCookiePayload,
): Promise<string | null> {
  const secret = resumeSecret();
  if (!secret) return null;

  const path = buildPartnerVerifyPath(payload);
  if (!isRestorablePartnerVerifyPath(path)) return null;

  return new SignJWT({
    jti: payload.jti,
    partnerId: payload.partnerId,
    policyId: payload.policyId,
    returnUrl: payload.returnUrl,
    permission: payload.permission,
    permissionVersion: payload.permissionVersion,
    purpose: payload.purpose,
    appSlug: payload.appSlug,
    policyVersion: payload.policyVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyPartnerVerifyResumeCookie(
  token: string,
): Promise<PartnerVerifyResumeCookiePayload | null> {
  const secret = resumeSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const policyId = typeof payload.policyId === "string" ? payload.policyId.trim() : "";
    const returnUrl = typeof payload.returnUrl === "string" ? payload.returnUrl.trim() : "";
    const permission = typeof payload.permission === "string" ? payload.permission.trim() : undefined;
    const permissionVersion = typeof payload.permissionVersion === "string"
      ? payload.permissionVersion.trim()
      : undefined;
    const purpose = typeof payload.purpose === "string" ? payload.purpose.trim() : undefined;
    const appSlug = typeof payload.appSlug === "string" ? payload.appSlug.trim() : undefined;
    const policyVersion = typeof payload.policyVersion === "number" ? payload.policyVersion : undefined;
    const jti = typeof payload.jti === "string" ? payload.jti.trim() : undefined;

    if (!partnerId || !returnUrl || (!policyId && !permission)) return null;

    const resume: PartnerVerifyResumeCookiePayload = {
      jti,
      partnerId,
      policyId,
      returnUrl,
      permission: permission || undefined,
      permissionVersion: permissionVersion || undefined,
      purpose: purpose || undefined,
      appSlug: appSlug || undefined,
      policyVersion,
    };

    const path = buildPartnerVerifyPath(resume);
    if (!isRestorablePartnerVerifyPath(path)) return null;

    return resume;
  } catch {
    return null;
  }
}

export function buildResumePathFromPayload(
  payload: PartnerVerifyResumeCookiePayload,
): string | null {
  const path = buildPartnerVerifyPath(payload);
  return isRestorablePartnerVerifyPath(path) ? path : null;
}

export async function signPartnerContinueBindingCookie(
  payload: PartnerContinueBindingPayload,
): Promise<string | null> {
  const secret = resumeSecret();
  if (!secret) return null;
  if (!payload.verifyRequestId.trim() || !payload.partnerId.trim() || !payload.policyId.trim()) {
    return null;
  }

  return new SignJWT({
    verifyRequestId: payload.verifyRequestId,
    partnerId: payload.partnerId,
    policyId: payload.policyId,
    purpose: payload.purpose,
    returnUrl: payload.returnUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyPartnerContinueBindingCookie(
  token: string,
): Promise<PartnerContinueBindingPayload | null> {
  const secret = resumeSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const verifyRequestId = typeof payload.verifyRequestId === "string" ? payload.verifyRequestId.trim() : "";
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const policyId = typeof payload.policyId === "string" ? payload.policyId.trim() : "";
    const purpose = typeof payload.purpose === "string" ? payload.purpose.trim() : undefined;
    const returnUrl = typeof payload.returnUrl === "string" ? payload.returnUrl.trim() : "";
    if (!verifyRequestId || !partnerId || !policyId || !returnUrl) return null;
    return { verifyRequestId, partnerId, policyId, purpose, returnUrl };
  } catch {
    return null;
  }
}

export function attachPartnerVerifyResumeCookie(
  res: NextResponse,
  token: string,
): void {
  res.cookies.set(PARTNER_VERIFY_RESUME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearPartnerVerifyResumeCookie(res: NextResponse): void {
  res.cookies.set(PARTNER_VERIFY_RESUME_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function attachPartnerContinueBindingCookie(
  res: NextResponse,
  token: string,
): void {
  res.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearPartnerContinueBindingCookie(res: NextResponse): void {
  res.cookies.set(PARTNER_CONTINUE_BINDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
