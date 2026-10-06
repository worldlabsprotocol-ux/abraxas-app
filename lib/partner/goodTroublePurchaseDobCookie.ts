// FILE: lib/partner/goodTroublePurchaseDobCookie.ts
// Signed HttpOnly DOB prequal pointer — stores age-band outcome only, never DOB.

import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

export const GOOD_TROUBLE_DOB_PREQUAL_COOKIE = "abraxas_gt_dob_prequal";

export type GoodTroubleDobPrequalBand = "over_21" | "under_21";

export interface GoodTroubleDobPrequalRecord {
  verifyRequestId: string;
  partnerId: string;
  policyId: string;
  ageBand: GoodTroubleDobPrequalBand;
}

const MAX_AGE_SEC = 30 * 60;
const ALLOWED = new Set([
  "verifyRequestId",
  "partnerId",
  "policyId",
  "ageBand",
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

export async function signGoodTroubleDobPrequalCookie(
  record: GoodTroubleDobPrequalRecord,
): Promise<string | null> {
  const key = secret();
  if (!key) return null;
  return new SignJWT({
    verifyRequestId: record.verifyRequestId,
    partnerId: record.partnerId,
    policyId: record.policyId,
    ageBand: record.ageBand,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(key);
}

export async function verifyGoodTroubleDobPrequalCookie(
  token: string,
): Promise<GoodTroubleDobPrequalRecord | null> {
  const key = secret();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const extra = Object.keys(payload).filter((k) => !ALLOWED.has(k));
    if (extra.length > 0) return null;
    const verifyRequestId = typeof payload.verifyRequestId === "string" ? payload.verifyRequestId.trim() : "";
    const partnerId = typeof payload.partnerId === "string" ? payload.partnerId.trim() : "";
    const policyId = typeof payload.policyId === "string" ? payload.policyId.trim() : "";
    const ageBand = payload.ageBand === "over_21" || payload.ageBand === "under_21"
      ? payload.ageBand
      : null;
    if (!verifyRequestId || !partnerId || !policyId || !ageBand) return null;
    return { verifyRequestId, partnerId, policyId, ageBand };
  } catch {
    return null;
  }
}

export function attachGoodTroubleDobPrequalCookie(res: NextResponse, token: string): void {
  res.cookies.set(GOOD_TROUBLE_DOB_PREQUAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearGoodTroubleDobPrequalCookie(res: NextResponse): void {
  res.cookies.set(GOOD_TROUBLE_DOB_PREQUAL_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
