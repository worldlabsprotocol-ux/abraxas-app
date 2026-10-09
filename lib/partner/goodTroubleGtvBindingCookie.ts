// FILE: lib/partner/goodTroubleGtvBindingCookie.ts
// HttpOnly signed binding between verify_request and Good Trouble gtf_* flow token (gtv).
// Survives sessionStorage loss on mobile OAuth; never exposes verifier or ownership secret.

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import {
  GOOD_TROUBLE_FLOW_ID_RE,
  GOOD_TROUBLE_GTV_PARAM,
  GOOD_TROUBLE_PURCHASE_CALLBACK_PATH,
  GOOD_TROUBLE_RETURN_HOST,
} from "@/lib/partner/normalizePartnerVerifyInput";
import { extractGoodTroubleFlowToken } from "@/lib/partner/continuationReturnUrlMatch";

export const GOOD_TROUBLE_GTV_BINDING_COOKIE = "abraxas_good_trouble_gtv_binding";
const MAX_AGE_SEC = 30 * 60;

export type GoodTroubleGtvBindingPayload = {
  verifyRequestId: string;
  flowToken: string;
};

function bindingSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export function isValidGoodTroublePurchaseFlowToken(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.startsWith("gtf_") && GOOD_TROUBLE_FLOW_ID_RE.test(trimmed);
}

export async function signGoodTroubleGtvBindingCookie(
  payload: GoodTroubleGtvBindingPayload,
): Promise<string | null> {
  const secret = bindingSecret();
  if (!secret) return null;
  const verifyRequestId = payload.verifyRequestId.trim();
  const flowToken = payload.flowToken.trim();
  if (!verifyRequestId || !isValidGoodTroublePurchaseFlowToken(flowToken)) return null;

  return new SignJWT({ verifyRequestId, flowToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyGoodTroubleGtvBindingCookie(
  token: string,
): Promise<GoodTroubleGtvBindingPayload | null> {
  const secret = bindingSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const verifyRequestId = typeof payload.verifyRequestId === "string"
      ? payload.verifyRequestId.trim()
      : "";
    const flowToken = typeof payload.flowToken === "string" ? payload.flowToken.trim() : "";
    if (!verifyRequestId || !isValidGoodTroublePurchaseFlowToken(flowToken)) return null;
    const extra = Object.keys(payload).filter((key) => (
      !["verifyRequestId", "flowToken", "iat", "exp", "nbf", "iss", "aud", "sub"].includes(key)
    ));
    if (extra.length > 0) return null;
    return { verifyRequestId, flowToken };
  } catch {
    return null;
  }
}

export function buildGoodTroublePurchaseCallbackUrlWithGtv(flowToken: string): string {
  const token = flowToken.trim();
  return `https://${GOOD_TROUBLE_RETURN_HOST}${GOOD_TROUBLE_PURCHASE_CALLBACK_PATH}?${GOOD_TROUBLE_GTV_PARAM}=${encodeURIComponent(token)}`;
}

export async function readGoodTroubleGtvBindingReturnUrl(
  request: NextRequest,
  verifyRequestId: string,
): Promise<string | null> {
  const trimmed = verifyRequestId.trim();
  if (!trimmed) return null;
  const raw = request.cookies.get(GOOD_TROUBLE_GTV_BINDING_COOKIE)?.value;
  if (!raw) return null;
  const payload = await verifyGoodTroubleGtvBindingCookie(raw);
  if (!payload || payload.verifyRequestId !== trimmed) return null;
  return buildGoodTroublePurchaseCallbackUrlWithGtv(payload.flowToken);
}

export function attachGoodTroubleGtvBindingCookie(
  res: NextResponse,
  token: string,
): void {
  res.cookies.set(GOOD_TROUBLE_GTV_BINDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearGoodTroubleGtvBindingCookie(res: NextResponse): void {
  res.cookies.set(GOOD_TROUBLE_GTV_BINDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Mint binding cookie when return_url already carries an authoritative gtv token. */
export async function maybeAttachGoodTroubleGtvBindingFromReturnUrl(
  res: NextResponse,
  verifyRequestId: string,
  returnUrl: string,
): Promise<void> {
  const flowToken = extractGoodTroubleFlowToken(returnUrl);
  if (!flowToken?.startsWith("gtf_")) return;
  const token = await signGoodTroubleGtvBindingCookie({
    verifyRequestId,
    flowToken,
  });
  if (token) attachGoodTroubleGtvBindingCookie(res, token);
}
