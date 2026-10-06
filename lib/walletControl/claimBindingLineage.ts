// FILE: lib/walletControl/claimBindingLineage.ts
// Deterministic wallet-control claim ↔ wallet binding lineage and live eligibility.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveClaimStatusAtRead } from "@/lib/trust/credentialStatusRegistry";
import type { CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import {
  WALLET_CONTROL_CLAIM_TYPE,
  parseWalletControlEvidenceRef,
} from "@/lib/walletControl/contract";

/** Legacy signed_challenge / zklogin rows co-issued with wallet_bindings in one flow. */
export const WALLET_CONTROL_CO_ISSUED_TOLERANCE_MS = 2_000;

export interface WalletBindingAuthorityRow {
  id: string;
  subject_id: string;
  binding_status: string | null;
  revoked_at: string | null;
  verified_at: string;
  binding_method: string | null;
}

export function parseBindingIdFromWalletControlClaim(
  claim: Pick<CredentialClaimRecord, "evidence_reference" | "claim_value">,
): string | null {
  const fromRef = parseWalletControlEvidenceRef(claim.evidence_reference);
  if (fromRef) return fromRef;
  const value = (claim.claim_value ?? {}) as Record<string, unknown>;
  const bindingId = value.wallet_binding_id;
  return typeof bindingId === "string" && bindingId.length > 0 ? bindingId : null;
}

export function isWalletBindingAuthoritativelyActive(
  binding: WalletBindingAuthorityRow | null | undefined,
): boolean {
  if (!binding) return false;
  if (binding.revoked_at) return false;
  if (binding.binding_status === "revoked" || binding.binding_status === "compromised") {
    return false;
  }
  return binding.binding_status === "active" || !binding.binding_status;
}

function legacyClaimMatchesBinding(
  claim: Pick<CredentialClaimRecord, "issued_at" | "claim_value">,
  binding: WalletBindingAuthorityRow,
): boolean {
  const issuedMs = new Date(claim.issued_at).getTime();
  const verifiedMs = new Date(binding.verified_at).getTime();
  if (Math.abs(issuedMs - verifiedMs) > WALLET_CONTROL_CO_ISSUED_TOLERANCE_MS) {
    return false;
  }
  const claimMethod = (claim.claim_value as Record<string, unknown> | undefined)?.binding_method;
  if (typeof claimMethod === "string" && claimMethod.length > 0) {
    return binding.binding_method === claimMethod;
  }
  return true;
}

export function walletControlClaimDerivedFromBinding(
  claim: CredentialClaimRecord,
  bindingId: string,
  binding: WalletBindingAuthorityRow | null,
): boolean {
  const direct = parseBindingIdFromWalletControlClaim(claim);
  if (direct === bindingId) return true;
  if (!binding || binding.id !== bindingId) return false;
  if (claim.claim_type !== WALLET_CONTROL_CLAIM_TYPE) return false;
  return legacyClaimMatchesBinding(claim, binding);
}

async function loadBindingById(bindingId: string): Promise<WalletBindingAuthorityRow | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("wallet_bindings")
    .select("id, subject_id, binding_status, revoked_at, verified_at, binding_method")
    .eq("id", bindingId)
    .maybeSingle();
  return (data as WalletBindingAuthorityRow | null) ?? null;
}

export async function resolveWalletBindingForControlClaim(
  claim: CredentialClaimRecord,
): Promise<{ binding: WalletBindingAuthorityRow | null; ambiguous: boolean }> {
  const directId = parseBindingIdFromWalletControlClaim(claim);
  if (directId) {
    const binding = await loadBindingById(directId);
    return { binding, ambiguous: false };
  }

  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(claim.subject_id);
  const { data: bindings } = await sb
    .from("wallet_bindings")
    .select("id, subject_id, binding_status, revoked_at, verified_at, binding_method")
    .eq("subject_id", subject);

  const matches = (bindings ?? []).filter((row) =>
    legacyClaimMatchesBinding(claim, row as WalletBindingAuthorityRow),
  ) as WalletBindingAuthorityRow[];

  if (matches.length === 1) {
    return { binding: matches[0] ?? null, ambiguous: false };
  }
  if (matches.length > 1) {
    return { binding: null, ambiguous: true };
  }
  return { binding: null, ambiguous: false };
}

export async function evaluateWalletControlClaimLiveEligibilityById(
  claimId: string,
): Promise<{ eligible: boolean; reason: string | null }> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("credential_claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (!data) {
    return { eligible: false, reason: "missing_claim" };
  }
  return evaluateWalletControlClaimLiveEligibility(mapWalletControlClaimRow(data as Record<string, unknown>));
}

function mapWalletControlClaimRow(row: Record<string, unknown>): CredentialClaimRecord {
  return {
    id: row.id as string,
    subject_id: row.subject_id as string,
    credential_jti: (row.credential_jti as string | null) ?? null,
    claim_type: row.claim_type as CredentialClaimRecord["claim_type"],
    claim_value: (row.claim_value as Record<string, unknown>) ?? {},
    issuer_id: row.issuer_id as string,
    assurance_level: (row.assurance_level as CredentialClaimRecord["assurance_level"]) ?? null,
    issued_at: row.issued_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    status: row.status as CredentialClaimRecord["status"],
    revocation_reference: (row.revocation_reference as string | null) ?? null,
    evidence_reference: (row.evidence_reference as string | null) ?? null,
    jurisdiction: (row.jurisdiction as string | null) ?? null,
    policy_scope: (row.policy_scope as string | null) ?? null,
  };
}

export async function evaluateWalletControlClaimLiveEligibility(
  claim: CredentialClaimRecord,
): Promise<{ eligible: boolean; reason: string | null }> {
  if (claim.claim_type !== WALLET_CONTROL_CLAIM_TYPE) {
    return { eligible: true, reason: null };
  }

  const liveStatus = resolveClaimStatusAtRead({
    status: claim.status,
    expires_at: claim.expires_at,
  });
  if (liveStatus === "revoked") {
    return { eligible: false, reason: "claim_revoked" };
  }
  if (liveStatus === "suspended" || liveStatus === "under_review") {
    return { eligible: false, reason: "access_revoked" };
  }
  if (liveStatus === "expired") {
    return { eligible: false, reason: "claim_expired" };
  }

  const { binding, ambiguous } = await resolveWalletBindingForControlClaim(claim);
  if (ambiguous) {
    return { eligible: false, reason: "wallet_binding_lineage_ambiguous" };
  }
  if (!binding) {
    return { eligible: false, reason: "wallet_binding_missing" };
  }
  if (!isWalletBindingAuthoritativelyActive(binding)) {
    return { eligible: false, reason: "source_evidence_revoked" };
  }

  return { eligible: true, reason: null };
}

export async function filterWalletControlClaimsForPolicyEvaluation(
  claims: CredentialClaimRecord[],
): Promise<CredentialClaimRecord[]> {
  const eligible: CredentialClaimRecord[] = [];
  for (const claim of claims) {
    if (claim.claim_type !== WALLET_CONTROL_CLAIM_TYPE) {
      eligible.push(claim);
      continue;
    }
    const { eligible: ok } = await evaluateWalletControlClaimLiveEligibility(claim);
    if (ok) eligible.push(claim);
  }
  return eligible;
}
