// FILE: lib/partner/twoAppEvaluation/evaluationSession.ts
// HttpOnly owner session for two-app evaluation read/export — binds UUID to partner.

import { SignJWT, jwtVerify } from "jose";
import type { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";

export const TWO_APP_EVAL_OWNER_COOKIE = "abx_two_app_eval_owner";
const DOMAIN_INFO = "abraxas:two-app-eval-owner:v1";
const SESSION_TTL_SEC = 60 * 60 * 24 * 14;

export interface TwoAppEvaluationOwnerSession {
  evaluationId: string;
  partnerId: string;
}

function sessionSecret(): Uint8Array | null {
  const raw = process.env.ABRAXAS_BROWSER_SESSION_SECRET?.trim();
  if (!raw || raw.length < 16) return null;
  return new Uint8Array(createHmac("sha256", raw).update(DOMAIN_INFO).digest());
}

export async function issueTwoAppEvaluationOwnerToken(
  session: TwoAppEvaluationOwnerSession,
): Promise<string | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  return new SignJWT({
    evaluation_id: session.evaluationId,
    partner_id: session.partnerId,
    typ: "two_app_eval_owner",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.evaluationId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secret);
}

export async function attachTwoAppEvaluationOwnerCookieForRecord(
  res: NextResponse,
  evaluationId: string,
  partnerId: string,
): Promise<void> {
  const token = await issueTwoAppEvaluationOwnerToken({ evaluationId, partnerId });
  if (token) attachTwoAppEvaluationOwnerCookie(res, token);
}

export function attachTwoAppEvaluationOwnerCookie(res: NextResponse, token: string): void {
  res.cookies.set(TWO_APP_EVAL_OWNER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function resolveTwoAppEvaluationOwnerSession(
  req: NextRequest,
): Promise<TwoAppEvaluationOwnerSession | null> {
  const secret = sessionSecret();
  if (!secret) return null;

  const token = req.cookies.get(TWO_APP_EVAL_OWNER_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.typ !== "two_app_eval_owner") return null;
    const evaluationId = typeof payload.evaluation_id === "string" ? payload.evaluation_id : payload.sub;
    const partnerId = typeof payload.partner_id === "string" ? payload.partner_id : null;
    if (!evaluationId || !partnerId) return null;
    return { evaluationId, partnerId };
  } catch {
    return null;
  }
}
