// FILE: lib/partner/partnerMethodQualificationCookie.ts
// Signed HttpOnly qualification pointer. Not sufficient alone — routes re-bind to continuation.

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import type { EligibilityMethodId } from "@/lib/partner/eligibilityMethods";
import type { MethodQualificationRecord } from "@/lib/partner/partnerMethodQualification";

export const PARTNER_METHOD_QUALIFICATION_COOKIE = "abraxas_partner_method_qualification";
const MAX_AGE_SEC = 30 * 60;
const ALLOWED = new Set([
  "verifyRequestId",
  "partnerId",
  "policyId",
  "policyVersion",
  "methodId",
  "qualified",
  "issuedReceipt",
  "sandboxOnly",
  "iat",
  "exp",
  "nbf",
  "iss",
  "aud",
  "sub",
]);

function secret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export async function signPartnerMethodQualificationCookie(
  record: MethodQualificationRecord,
): Promise<string | null> {
  const key = secret();
  if (!key || !record.qualified) return null;
  return new SignJWT({
    verifyRequestId: record.verifyRequestId,
    partnerId: record.partnerId,
    policyId: record.policyId,
    policyVersion: record.policyVersion ?? null,
    methodId: record.methodId,
    qualified: true,
    issuedReceipt: false,
    sandboxOnly: record.sandboxOnly,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(key);
}

export async function verifyPartnerMethodQualificationCookie(
  token: string,
): Promise<MethodQualificationRecord | null> {
  const key = secret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const extra = Object.keys(payload).filter((k) => !ALLOWED.has(k));
    if (extra.length > 0) return null;
    if (payload.qualified !== true || payload.issuedReceipt !== false) return null;
    const verifyRequestId = typeof payload.verifyRequestId === "string" ? payload.verifyRequestId.trim() : "";
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const policyId = typeof payload.policyId === "string" ? payload.policyId.trim() : "";
    const methodId = typeof payload.methodId === "string" ? payload.methodId.trim() : "";
    if (!verifyRequestId || !partnerId || !policyId || !methodId) return null;
    return {
      verifyRequestId,
      partnerId,
      policyId,
      policyVersion: typeof payload.policyVersion === "number" ? payload.policyVersion : undefined,
      methodId: methodId as EligibilityMethodId,
      state: "qualified",
      qualified: true,
      issuedReceipt: false,
      sandboxOnly: payload.sandboxOnly === true,
    };
  } catch {
    return null;
  }
}

export function attachPartnerMethodQualificationCookie(res: NextResponse, token: string): void {
  res.cookies.set(PARTNER_METHOD_QUALIFICATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearPartnerMethodQualificationCookie(res: NextResponse): void {
  res.cookies.set(PARTNER_METHOD_QUALIFICATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
