// FILE: lib/api/passport.ts
// Passport API layer — UI components call these, not raw fetch inline.

import type { MeCredentialResponse, OnChainPassportStatus } from "@/lib/hooks/usePassportVerification";
import type { VerificationResult } from "@/lib/credentials/types";
import type { StoredCredential } from "@/lib/credentials/storage";

import type { PassportSetupState } from "@/lib/idv/identityVerificationStates";

export interface IdentityStatusResponse {
  status?: string;
  via?: string;
  identity_verification_status?: string;
  credential_status?: string;
  veriff_session_id?: string | null;
  credential_jti?: string | null;
  last_verified_at?: string | null;
  credential_issued_at?: string | null;
  expires_at?: string | null;
  error_message?: string | null;
  wallet_binding_l3?: boolean;
  setup?: PassportSetupState;
  veriff_configured?: boolean;
  idv_provider?: "veriff" | "manual";
}

export interface TrustStatusResponse {
  ready_to_transact: boolean;
  enhanced_trust: boolean;
  wallet_registered: boolean;
  identity: { status: string; veriff_session_id: string | null };
  credential: { active: boolean };
  on_chain: { provisioned: boolean; stamps_complete: boolean; object_id: string | null };
  intent: { proofs_count: number };
  claims?: { active_count: number; types: string[] };
}

export interface CheckLevelResponse {
  needsDeepVerification: boolean;
  currentLevel: "core" | "compliance_started" | "verified";
  decision: "approved" | "denied" | "manual_review";
  policy_id: string | null;
  missing_claims: string[];
  reason_codes: string[];
}

export interface CredentialClaimSummary {
  claim_type: string;
  label: string;
  value: Record<string, unknown>;
  issuer_id: string;
  assurance_level: string | null;
  issued_at: string;
  expires_at: string | null;
  status: string;
  jurisdiction: string | null;
}

export interface CredentialClaimsResponse {
  subject_id: string;
  claims: CredentialClaimSummary[];
  count: number;
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
  const res = await fetch(`/api/identity/status?${params}`, { credentials: "include" });
  return res.json() as Promise<IdentityStatusResponse>;
}

export async function syncVeriffDecision(suiAddress: string): Promise<VeriffSyncResponse> {
  const res = await fetch("/api/idv/sync-decision", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sui_address: suiAddress }),
  });
  return res.json() as Promise<VeriffSyncResponse>;
}

export async function fetchCredentialMe(suiAddress: string): Promise<MeCredentialResponse> {
  const res = await fetch(`/api/credentials/me?sui=${encodeURIComponent(suiAddress)}`, {
    credentials: "include",
  });
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

export async function fetchCheckLevel(
  action: string,
  suiAddress?: string | null,
): Promise<CheckLevelResponse> {
  const res = await fetch("/api/verification/check-level", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action,
      sui_address: suiAddress ?? undefined,
    }),
  });
  return res.json() as Promise<CheckLevelResponse>;
}

export async function fetchCredentialClaims(_suiAddress: string): Promise<CredentialClaimsResponse> {
  const res = await fetch("/api/credentials/claims", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load claims");
  return res.json() as Promise<CredentialClaimsResponse>;
}

export async function consentVerificationRequest(
  requestId: string,
): Promise<{
  decision: string;
  claims: Record<string, unknown>;
  decision_reference: string;
  valid_until: string | null;
  reason_codes: string[];
}> {
  const res = await fetch(`/api/v1/verification-requests/${requestId}/consent`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) ?? "Consent failed");
  return data as {
    decision: string;
    claims: Record<string, unknown>;
    decision_reference: string;
    valid_until: string | null;
    reason_codes: string[];
  };
}

export async function declineVerificationRequest(requestId: string): Promise<{ status: string }> {
  const res = await fetch(`/api/v1/verification-requests/${requestId}/decline`, {
    method: "POST",
    credentials: "include",
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as string) ?? "Decline failed");
  return data as { status: string };
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
  claims: (sui: string) => [...passportQueryKeys.all, "claims", sui] as const,
  checkLevel: (sui: string | null, action: string) =>
    [...passportQueryKeys.all, "checkLevel", sui, action] as const,
};
