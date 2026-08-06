// FILE: lib/auth/verifyZkLoginIdToken.ts
// Verify Google zkLogin id_tokens server-side against Google JWKS.

import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  getTrustedGoogleAudiences,
  normalizeJwtAudience,
} from "@/lib/sui/zklogin/audienceCohorts";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface VerifiedZkLoginIdToken {
  sub: string;
  email?: string;
  aud: string;
}

export async function verifyGoogleZkLoginIdToken(
  idToken: string,
  expectedOAuthSub?: string,
): Promise<VerifiedZkLoginIdToken> {
  const audiences = getTrustedGoogleAudiences();
  if (audiences.length === 0) {
    throw new Error("Google OAuth client ID not configured");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: audiences.length === 1 ? audiences[0] : audiences,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sub) {
    throw new Error("Token missing sub");
  }

  if (expectedOAuthSub && sub !== expectedOAuthSub) {
    throw new Error("oauth_sub mismatch");
  }

  const aud = normalizeJwtAudience(payload.aud);
  if (!aud || !audiences.includes(aud)) {
    throw new Error("untrusted_oauth_audience");
  }

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    aud,
  };
}
