// Signed HttpOnly pointer — explicit holder approval to share a request-bound result.

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const PARTNER_SHARING_CONSENT_COOKIE = "abraxas_partner_sharing_consent";

export type PartnerSharingConsentRecord = {
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
};

const MAX_AGE_SEC = 15 * 60;
const ALLOWED = new Set([
  "verifyRequestId",
  "partnerId",
  "policyId",
  "policyVersion",
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

export async function signPartnerSharingConsentCookie(
  record: PartnerSharingConsentRecord,
): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  return new SignJWT({
    verifyRequestId: record.verifyRequestId,
    partnerId: record.partnerId,
    policyId: record.policyId,
    policyVersion: record.policyVersion ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(key);
}

export async function verifyPartnerSharingConsentCookie(
  token: string,
): Promise<PartnerSharingConsentRecord | null> {
  const key = secret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const extra = Object.keys(payload).filter((k) => !ALLOWED.has(k));
    if (extra.length > 0) return null;
    const verifyRequestId = typeof payload.verifyRequestId === "string" ? payload.verifyRequestId.trim() : "";
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const policyId = typeof payload.policyId === "string" ? payload.policyId.trim() : "";
    if (!verifyRequestId || !partnerId || !policyId) return null;
    return {
      verifyRequestId,
      partnerId,
      policyId,
      policyVersion: typeof payload.policyVersion === "number" ? payload.policyVersion : undefined,
    };
  } catch {
    return null;
  }
}

export function sharingConsentMatchesBinding(input: {
  record: PartnerSharingConsentRecord | null;
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  policyVersion?: number;
}): boolean {
  if (!input.record) return false;
  if (input.record.verifyRequestId !== input.verifyRequestId.trim()) return false;
  if (input.record.partnerId !== input.partnerId.trim()) return false;
  if (input.record.policyId !== input.policyId.trim()) return false;
  if (
    input.policyVersion != null
    && input.record.policyVersion != null
    && input.record.policyVersion !== input.policyVersion
  ) {
    return false;
  }
  return true;
}

export function attachPartnerSharingConsentCookie(res: NextResponse, token: string): void {
  res.cookies.set(PARTNER_SHARING_CONSENT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearPartnerSharingConsentCookie(res: NextResponse): void {
  res.cookies.set(PARTNER_SHARING_CONSENT_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
