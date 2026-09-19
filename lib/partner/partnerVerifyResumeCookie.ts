// FILE: lib/partner/partnerVerifyResumeCookie.ts
// Signed HttpOnly opaque jti pointer — never an authoritative continuation store.

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const PARTNER_VERIFY_RESUME_COOKIE = "abraxas_partner_verify_resume";
export const PARTNER_CONTINUE_BINDING_COOKIE = "abraxas_partner_continue_binding";
const MAX_AGE_SEC = 30 * 60;

function resumeSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export type PartnerVerifyResumeCookiePayload = {
  jti: string;
};

export type PartnerContinueBindingPayload = {
  verifyRequestId: string;
};

export async function signPartnerVerifyResumeCookie(
  payload: PartnerVerifyResumeCookiePayload,
): Promise<string | null> {
  const secret = resumeSecret();
  if (!secret) return null;
  const jti = payload.jti.trim();
  if (!jti) return null;

  return new SignJWT({ jti })
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
    const jti = typeof payload.jti === "string" ? payload.jti.trim() : "";
    if (!jti) return null;
    const extra = Object.keys(payload).filter((key) => (
      !["jti", "iat", "exp", "nbf", "iss", "aud", "sub"].includes(key)
    ));
    if (extra.length > 0) return null;
    return { jti };
  } catch {
    return null;
  }
}

export async function signPartnerContinueBindingCookie(
  payload: PartnerContinueBindingPayload,
): Promise<string | null> {
  const secret = resumeSecret();
  if (!secret) return null;
  const verifyRequestId = payload.verifyRequestId.trim();
  if (!verifyRequestId) return null;

  return new SignJWT({ verifyRequestId })
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
    const verifyRequestId = typeof payload.verifyRequestId === "string"
      ? payload.verifyRequestId.trim()
      : "";
    if (!verifyRequestId) return null;
    const extra = Object.keys(payload).filter((key) => (
      !["verifyRequestId", "iat", "exp", "nbf", "iss", "aud", "sub"].includes(key)
    ));
    if (extra.length > 0) return null;
    return { verifyRequestId };
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
