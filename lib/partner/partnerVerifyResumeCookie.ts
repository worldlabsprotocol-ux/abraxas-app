// FILE: lib/partner/partnerVerifyResumeCookie.ts
// Signed HttpOnly partner-verify resume — survives OAuth when sessionStorage is cleared.

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import {
  buildPartnerVerifyPath,
  isRestorablePartnerVerifyPath,
  type PartnerVerifyResumeParams,
} from "@/lib/partner/partnerVerifyResume";

export const PARTNER_VERIFY_RESUME_COOKIE = "abraxas_partner_verify_resume";
const MAX_AGE_SEC = 30 * 60; // 30 minutes — matches sessionStorage resume TTL

function resumeSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export type PartnerVerifyResumeCookiePayload = PartnerVerifyResumeParams;

export async function signPartnerVerifyResumeCookie(
  payload: PartnerVerifyResumeCookiePayload,
): Promise<string | null> {
  const secret = resumeSecret();
  if (!secret) return null;

  const path = buildPartnerVerifyPath(payload);
  if (!isRestorablePartnerVerifyPath(path)) return null;

  return new SignJWT({
    partnerId: payload.partnerId,
    policyId: payload.policyId,
    returnUrl: payload.returnUrl,
    permission: payload.permission ?? null,
    permissionVersion: payload.permissionVersion ?? null,
    purpose: payload.purpose ?? null,
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

    if (!partnerId || !returnUrl || (!policyId && !permission)) return null;

    const resume: PartnerVerifyResumeCookiePayload = {
      partnerId,
      policyId,
      returnUrl,
      permission: permission || undefined,
      permissionVersion: permissionVersion || undefined,
      purpose: purpose || undefined,
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
