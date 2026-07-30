// FILE: lib/auth/verifyZkLoginIdToken.ts
// Verify Google zkLogin id_tokens server-side against Google JWKS.

import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface VerifiedZkLoginIdToken {
  sub: string;
  email?: string;
}

function googleClientId(): string | null {
  return (
    process.env.GOOGLE_ZKLOGIN_CLIENT_ID?.trim()
    ?? process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID?.trim()
    ?? null
  );
}

export async function verifyGoogleZkLoginIdToken(
  idToken: string,
  expectedOAuthSub?: string,
): Promise<VerifiedZkLoginIdToken> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error("Google OAuth client ID not configured");
  }

  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sub) {
    throw new Error("Token missing sub");
  }

  if (expectedOAuthSub && sub !== expectedOAuthSub) {
    throw new Error("oauth_sub mismatch");
  }

  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
