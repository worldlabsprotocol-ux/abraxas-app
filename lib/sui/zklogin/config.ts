// FILE: lib/sui/zklogin/config.ts
// OAuth + proving service configuration for Sui zkLogin.

import { getPublicAppOrigin } from "@/lib/app/publicAppOrigin";
import {
  isLegacyRecoveryConfiguredClient,
  resolveOAuthClientIdForMode,
  type ZkLoginLoginMode,
} from "@/lib/sui/zklogin/audienceCohorts";

export type ZkLoginProvider = "google" | "apple";

export interface ZkLoginOAuthConfig {
  clientId: string;
  redirectUri: string;
  authUrl: string;
  responseType: "id_token";
  scope: string;
}

export const ZKLOGIN_CALLBACK_PATH = "/auth/zklogin/callback";

/**
 * OAuth redirect URI must match the browser origin that stores the ephemeral key.
 * Client: always same-origin (never a pinned cross-host redirect).
 * Server: configured public app origin (NEXT_PUBLIC_APP_URL → issuer → Vercel → localhost).
 */
export function getZkLoginRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${ZKLOGIN_CALLBACK_PATH}`;
  }
  return `${getPublicAppOrigin().replace(/\/$/, "")}${ZKLOGIN_CALLBACK_PATH}`;
}

export const ZKLOGIN_SESSION_KEY = "abraxas_zklogin_session_v1";
export const ZKLOGIN_PENDING_KEY = "abraxas_zklogin_pending_v1";

/** Mysten-hosted proving service (devnet/testnet). Override for self-hosted. */
export const DEFAULT_PROVING_SERVICE_URL =
  process.env.NEXT_PUBLIC_ZKLOGIN_PROVER_URL ??
  "https://prover-dev.mystenlabs.com/v1";

export function getGoogleOAuthConfig(mode: ZkLoginLoginMode = "canonical"): ZkLoginOAuthConfig | null {
  const clientId = resolveOAuthClientIdForMode(mode);
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
  return Boolean(getGoogleOAuthConfig("canonical"));
}

export function isLegacyZkLoginRecoveryConfigured(): boolean {
  return isLegacyRecoveryConfiguredClient();
}

export function buildGoogleOAuthUrl(nonce: string, mode: ZkLoginLoginMode = "canonical"): string | null {
  const cfg = getGoogleOAuthConfig(mode);
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
