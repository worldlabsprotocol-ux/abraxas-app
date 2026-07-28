// FILE: lib/sui/zklogin/emailFromToken.ts
// Extract Google email from OAuth id_token (client + server safe).

import { decodeJwt } from "@mysten/sui/zklogin";

export function tryDecodeIdToken(idToken: string): Record<string, unknown> | null {
  try {
    return decodeJwt(idToken) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function emailFromJwtPayload(decoded: Record<string, unknown>): string | null {
  const email = decoded.email;
  return typeof email === "string" && email.includes("@") ? email : null;
}

export function emailFromIdToken(idToken: string): string | null {
  const decoded = tryDecodeIdToken(idToken);
  if (!decoded) return null;
  return emailFromJwtPayload(decoded);
}
