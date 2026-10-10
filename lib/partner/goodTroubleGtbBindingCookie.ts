// FILE: lib/partner/goodTroubleGtbBindingCookie.ts
// HttpOnly signed binding between verify_request and Good Trouble gtb_* browse flow token.
// Survives sessionStorage loss on mobile OAuth; never exposes PKCE verifier.

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import {
  GOOD_TROUBLE_BROWSE_CALLBACK_PATH,
  GOOD_TROUBLE_BROWSE_RC_PARAM,
  GOOD_TROUBLE_BROWSE_RC_VALUE,
  GOOD_TROUBLE_FLOW_ID_RE,
  GOOD_TROUBLE_GTB_PARAM,
  GOOD_TROUBLE_RETURN_HOST,
} from "@/lib/partner/normalizePartnerVerifyInput";
import { extractGoodTroubleFlowToken } from "@/lib/partner/continuationReturnUrlMatch";

export const GOOD_TROUBLE_GTB_BINDING_COOKIE = "abraxas_good_trouble_gtb_binding";
const MAX_AGE_SEC = 30 * 60;

export type GoodTroubleGtbBindingPayload = {
  verifyRequestId: string;
  flowToken: string;
};

function bindingSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY;
  if (!raw) return null;
  return new TextEncoder().encode(raw);
}

export function isValidGoodTroubleBrowseFlowToken(token: string): boolean {
  const trimmed = token.trim();
  return trimmed.startsWith("gtb_") && GOOD_TROUBLE_FLOW_ID_RE.test(trimmed);
}

export async function signGoodTroubleGtbBindingCookie(
  payload: GoodTroubleGtbBindingPayload,
): Promise<string | null> {
  const secret = bindingSecret();
  if (!secret) return null;
  const verifyRequestId = payload.verifyRequestId.trim();
  const flowToken = payload.flowToken.trim();
  if (!verifyRequestId || !isValidGoodTroubleBrowseFlowToken(flowToken)) return null;

  return new SignJWT({ verifyRequestId, flowToken })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyGoodTroubleGtbBindingCookie(
  token: string,
): Promise<GoodTroubleGtbBindingPayload | null> {
  const secret = bindingSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const verifyRequestId = typeof payload.verifyRequestId === "string"
      ? payload.verifyRequestId.trim()
      : "";
    const flowToken = typeof payload.flowToken === "string" ? payload.flowToken.trim() : "";
    if (!verifyRequestId || !isValidGoodTroubleBrowseFlowToken(flowToken)) return null;
    const extra = Object.keys(payload).filter((key) => (
      !["verifyRequestId", "flowToken", "iat", "exp", "nbf", "iss", "aud", "sub"].includes(key)
    ));
    if (extra.length > 0) return null;
    return { verifyRequestId, flowToken };
  } catch {
    return null;
  }
}

export function buildGoodTroubleBrowseCallbackUrlWithGtb(flowToken: string): string {
  const token = flowToken.trim();
  const url = new URL(`https://${GOOD_TROUBLE_RETURN_HOST}${GOOD_TROUBLE_BROWSE_CALLBACK_PATH}`);
  url.searchParams.set(GOOD_TROUBLE_GTB_PARAM, token);
  url.searchParams.set(GOOD_TROUBLE_BROWSE_RC_PARAM, GOOD_TROUBLE_BROWSE_RC_VALUE);
  return url.toString();
}

export async function readGoodTroubleGtbBindingReturnUrl(
  request: NextRequest,
  verifyRequestId: string,
): Promise<string | null> {
  const trimmed = verifyRequestId.trim();
  if (!trimmed) return null;
  const raw = request.cookies.get(GOOD_TROUBLE_GTB_BINDING_COOKIE)?.value;
  if (!raw) return null;
  const payload = await verifyGoodTroubleGtbBindingCookie(raw);
  if (!payload || payload.verifyRequestId !== trimmed) return null;
  return buildGoodTroubleBrowseCallbackUrlWithGtb(payload.flowToken);
}

export function attachGoodTroubleGtbBindingCookie(
  res: NextResponse,
  token: string,
): void {
  res.cookies.set(GOOD_TROUBLE_GTB_BINDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export function clearGoodTroubleGtbBindingCookie(res: NextResponse): void {
  res.cookies.set(GOOD_TROUBLE_GTB_BINDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Mint binding cookie when return_url already carries an authoritative gtb token. */
export async function maybeAttachGoodTroubleGtbBindingFromReturnUrl(
  res: NextResponse,
  verifyRequestId: string,
  returnUrl: string,
): Promise<void> {
  const flowToken = extractGoodTroubleFlowToken(returnUrl);
  if (!flowToken?.startsWith("gtb_")) return;
  const token = await signGoodTroubleGtbBindingCookie({
    verifyRequestId,
    flowToken,
  });
  if (token) attachGoodTroubleGtbBindingCookie(res, token);
}
