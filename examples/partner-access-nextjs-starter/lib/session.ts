// FILE: examples/partner-access-nextjs-starter/lib/session.ts
// Signed HttpOnly sample session — production partners must use their own secret.

import { createHmac, timingSafeEqual } from "crypto";
import { STARTER_SESSION_COOKIE } from "./constants";

export interface StarterSession {
  receiptId: string;
  partnerId: string;
  policyId: string;
  expiresAt: string;
}

export function signStarterSession(session: StarterSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyStarterSession(token: string, secret: string): StarterSession | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");

  try {
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as StarterSession;
    if (!parsed.receiptId || !parsed.partnerId || !parsed.policyId || !parsed.expiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isStarterSessionActive(session: StarterSession, now = new Date()): boolean {
  const expires = new Date(session.expiresAt);
  return !Number.isNaN(expires.getTime()) && expires.getTime() > now.getTime();
}

export { STARTER_SESSION_COOKIE };
