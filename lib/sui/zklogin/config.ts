// FILE: lib/sui/zklogin/config.ts
// OAuth + proving service configuration for Sui zkLogin.

export type ZkLoginProvider = "google" | "apple";

export interface ZkLoginOAuthConfig {
  clientId: string;
  redirectUri: string;
  authUrl: string;
  responseType: "id_token";
  scope: string;
}

const APP_ORIGIN =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.ABRAXAS_ISSUER_URL ?? "https://abraxasworld.xyz";

export const ZKLOGIN_CALLBACK_PATH = "/auth/zklogin/callback";

const CANONICAL_ORIGIN = (
  process.env.NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI?.replace(/\/auth\/zklogin\/callback\/?$/, "")
  ?? process.env.ABRAXAS_ISSUER_URL
  ?? "https://abraxasworld.xyz"
).replace(/\/$/, "");

/** Pin redirect in Google Console: https://abraxasworld.xyz/auth/zklogin/callback */
export function getZkLoginRedirectUri(): string {
  const pinned = process.env.NEXT_PUBLIC_ZKLOGIN_REDIRECT_URI?.trim();
  if (pinned) return pinned.replace(/\/$/, "");

  // Production builds always callback on abraxasworld.xyz — never a git-preview host.
  if (process.env.NODE_ENV === "production") {
    return `${CANONICAL_ORIGIN}${ZKLOGIN_CALLBACK_PATH}`;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${ZKLOGIN_CALLBACK_PATH}`;
  }
  return `${CANONICAL_ORIGIN}${ZKLOGIN_CALLBACK_PATH}`;
}

/** @deprecated use getZkLoginRedirectUri() */
export const ZKLOGIN_CALLBACK_URI = getZkLoginRedirectUri();

export const ZKLOGIN_SESSION_KEY = "abraxas_zklogin_session_v1";
export const ZKLOGIN_PENDING_KEY = "abraxas_zklogin_pending_v1";

/** Mysten-hosted proving service (devnet/testnet). Override for self-hosted. */
export const DEFAULT_PROVING_SERVICE_URL =
  process.env.NEXT_PUBLIC_ZKLOGIN_PROVER_URL ??
  "https://prover-dev.mystenlabs.com/v1";

export function getGoogleOAuthConfig(): ZkLoginOAuthConfig | null {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_ZKLOGIN_CLIENT_ID;
  if (!clientId) return null;
  return {
    clientId,
    redirectUri: getZkLoginRedirectUri(),
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    responseType: "id_token",
    scope: "openid email",
  };
}

export function isZkLoginConfigured(): boolean {
  return Boolean(getGoogleOAuthConfig());
}

export function buildGoogleOAuthUrl(nonce: string): string | null {
  const cfg = getGoogleOAuthConfig();
  if (!cfg) return null;
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: cfg.responseType,
    scope: cfg.scope,
    nonce,
  });
  return `${cfg.authUrl}?${params.toString()}`;
}
