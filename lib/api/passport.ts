// FILE: lib/api/passport.ts
// Passport API layer — UI components call these, not raw fetch inline.

import type { MeCredentialResponse, OnChainPassportStatus } from "@/lib/hooks/usePassportVerification";
import type { VerificationResult } from "@/lib/credentials/types";
import type { StoredCredential } from "@/lib/credentials/storage";

export interface IdentityStatusResponse {
  status?: string;
  via?: string;
}

export interface TrustStatusResponse {
  ready_to_transact: boolean;
  enhanced_trust: boolean;
  wallet_registered: boolean;
  identity: { status: string; veriff_session_id: string | null };
  credential: { active: boolean };
  on_chain: { provisioned: boolean; stamps_complete: boolean; object_id: string | null };
  intent: { proofs_count: number };
}

export interface VeriffSyncResponse {
  status?: string;
  synced?: boolean;
  message?: string;
}

export async function fetchIdentityStatus(
  suiAddress: string | null,
  email: string | null,
): Promise<IdentityStatusResponse> {
  const params = new URLSearchParams();
  if (suiAddress) params.set("sui_address", suiAddress);
  if (email) params.set("email", email);
  const res = await fetch(`/api/identity/status?${params}`);
  return res.json() as Promise<IdentityStatusResponse>;
}

export async function syncVeriffDecision(suiAddress: string): Promise<VeriffSyncResponse> {
  const res = await fetch(`/api/idv/sync-decision?sui=${encodeURIComponent(suiAddress)}`);
  return res.json() as Promise<VeriffSyncResponse>;
}

export async function fetchCredentialMe(suiAddress: string): Promise<MeCredentialResponse> {
  const res = await fetch(`/api/credentials/me?sui=${encodeURIComponent(suiAddress)}`);
  return res.json() as Promise<MeCredentialResponse>;
}

export async function verifyCredentialSelf(suiAddress: string): Promise<VerificationResult> {
  const res = await fetch(`/api/credentials/verify-self?sui=${encodeURIComponent(suiAddress)}`);
  return res.json() as Promise<VerificationResult>;
}

export async function fetchOnChainPassportStatus(suiAddress: string): Promise<OnChainPassportStatus | null> {
  const res = await fetch(`/api/sui/passport/provision?sui=${encodeURIComponent(suiAddress)}`);
  if (!res.ok) return null;
  return res.json() as Promise<OnChainPassportStatus>;
}

export async function provisionOnChainPassport(
  suiAddress: string,
): Promise<OnChainPassportStatus & { error?: string }> {
  const res = await fetch("/api/sui/passport/provision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sui_address: suiAddress }),
  });
  return res.json() as Promise<OnChainPassportStatus & { error?: string }>;
}

export async function fetchTrustStatus(suiAddress: string): Promise<TrustStatusResponse> {
  const res = await fetch(`/api/trust/status?sui=${encodeURIComponent(suiAddress)}`);
  return res.json() as Promise<TrustStatusResponse>;
}

export function meResponseToStoredCredential(
  addr: string,
  data: MeCredentialResponse,
): StoredCredential | null {
  if (!data.verified || !data.credential_jwt || !data.credential_jti || !data.expires_at) {
    return null;
  }
  return {
    jwt: data.credential_jwt,
    jti: data.credential_jti,
    expires_at: data.expires_at,
    jurisdiction: data.jurisdiction ?? "",
    level: data.verification_level ?? "standard",
    sui_address: addr,
    document_type: data.document_type,
  };
}

export const passportQueryKeys = {
  all: ["passport"] as const,
  identity: (sui: string | null, email: string | null) =>
    [...passportQueryKeys.all, "identity", sui, email] as const,
  trust: (sui: string) => [...passportQueryKeys.all, "trust", sui] as const,
  onChain: (sui: string) => [...passportQueryKeys.all, "onChain", sui] as const,
};
