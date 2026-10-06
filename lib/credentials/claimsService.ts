// FILE: lib/credentials/claimsService.ts
// Persist and query normalized credential claims.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getSupabaseAdmin, requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { ClaimStatus, CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { WalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";
import { appendAuditEvent } from "@/lib/verification/audit";
import {
  filterWalletControlClaimsForPolicyEvaluation,
  walletControlClaimDerivedFromBinding,
  type WalletBindingAuthorityRow,
} from "@/lib/walletControl/claimBindingLineage";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";

function mapRow(row: Record<string, unknown>): CredentialClaimRecord {
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
    status: row.status as ClaimStatus,
    revocation_reference: (row.revocation_reference as string | null) ?? null,
    evidence_reference: (row.evidence_reference as string | null) ?? null,
    jurisdiction: (row.jurisdiction as string | null) ?? null,
    policy_scope: (row.policy_scope as string | null) ?? null,
  };
}

export async function upsertWalletControlClaim(
  claim: Omit<CredentialClaimRecord, "id" | "status">,
): Promise<string> {
  if (!claim.evidence_reference) {
    throw new WalletPersistenceError(
      "claim_insert_failed",
      "Wallet control claims require evidence_reference",
    );
  }

  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(claim.subject_id);
  const { data, error } = await sb.rpc("upsert_wallet_control_claim_atomic", {
    p_subject_id: subject,
    p_evidence_reference: claim.evidence_reference,
    p_claim_value: claim.claim_value,
    p_issuer_id: claim.issuer_id,
    p_assurance_level: claim.assurance_level,
    p_issued_at: claim.issued_at,
    p_expires_at: claim.expires_at,
    p_jurisdiction: claim.jurisdiction,
    p_policy_scope: claim.policy_scope,
  });

  if (error) {
    throw new WalletPersistenceError(
      "rpc_failed",
      "Wallet control claim RPC failed",
      error.message,
    );
  }

  const result = data as { ok?: boolean; claim_id?: string; code?: string; detail?: string } | null;
  if (!result?.ok || !result.claim_id) {
    throw new WalletPersistenceError(
      "rpc_rejected",
      "Wallet control claim RPC rejected the write",
      result?.detail ?? result?.code ?? "rpc_rejected",
    );
  }

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "claims_service",
    action: "claims.wallet_control_upserted",
    object_type: "credential_claim",
    object_id: result.claim_id,
    metadata: { evidence_reference: claim.evidence_reference },
  });

  return result.claim_id;
}

export async function revokeWalletControlClaimForBinding(input: {
  subjectId: string;
  evidenceReference: string;
  reason: string;
  bindingId?: string;
}): Promise<boolean> {
  const bindingId = input.bindingId ?? input.evidenceReference.replace(/^wb:/, "");
  const revoked = await revokeWalletControlClaimsForBinding({
    subjectId: input.subjectId,
    bindingId,
    reason: input.reason,
  });
  return revoked.length > 0;
}

export async function revokeWalletControlClaimsForBinding(input: {
  subjectId: string;
  bindingId: string;
  reason: string;
}): Promise<string[]> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(input.subjectId);
  const now = new Date().toISOString();
  const evidenceReference = walletControlEvidenceRef(input.bindingId);

  const { data: bindingRow } = await sb
    .from("wallet_bindings")
    .select("id, subject_id, binding_status, revoked_at, verified_at, binding_method")
    .eq("id", input.bindingId)
    .eq("subject_id", subject)
    .maybeSingle();

  const binding = (bindingRow as WalletBindingAuthorityRow | null) ?? null;

  const { data: activeClaims } = await sb
    .from("credential_claims")
    .select("*")
    .eq("subject_id", subject)
    .eq("claim_type", "wallet_binding_confirmed")
    .eq("status", "active");

  const revokedIds: string[] = [];
  for (const row of activeClaims ?? []) {
    const claim = mapRow(row as Record<string, unknown>);
    if (!walletControlClaimDerivedFromBinding(claim, input.bindingId, binding)) {
      continue;
    }

    const { data: updated } = await sb
      .from("credential_claims")
      .update({
        status: "revoked",
        revocation_reference: input.reason,
        updated_at: now,
      })
      .eq("id", claim.id)
      .eq("status", "active")
      .select("id")
      .maybeSingle();

    if (!updated) continue;

    revokedIds.push(claim.id);
    await appendAuditEvent({
      actor_type: "system",
      actor_id: "claims_service",
      action: "claims.wallet_control_revoked",
      object_type: "credential_claim",
      object_id: claim.id,
      metadata: {
        reason: input.reason,
        evidence_reference: evidenceReference,
        binding_id: input.bindingId,
      },
    });
  }

  return revokedIds;
}

export async function getActiveWalletControlClaims(subjectId: string): Promise<CredentialClaimRecord[]> {
  const claims = await getActiveClaims(subjectId);
  return claims.filter(c => c.claim_type === "wallet_binding_confirmed");
}

export async function upsertClaims(
  claims: Omit<CredentialClaimRecord, "id" | "status">[],
): Promise<void> {
  if (!claims.length) return;
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();

  for (const claim of claims) {
    const subject = normalizeSuiAddress(claim.subject_id);
    const { data, error } = await sb.rpc("replace_credential_claim_atomic", {
      p_subject_id: subject,
      p_credential_jti: claim.credential_jti,
      p_claim_type: claim.claim_type,
      p_claim_value: claim.claim_value,
      p_issuer_id: claim.issuer_id,
      p_assurance_level: claim.assurance_level,
      p_issued_at: claim.issued_at ?? now,
      p_expires_at: claim.expires_at,
      p_evidence_reference: claim.evidence_reference,
      p_jurisdiction: claim.jurisdiction,
      p_policy_scope: claim.policy_scope,
    });

    if (error) {
      throw new WalletPersistenceError(
        "rpc_failed",
        "Credential claim replacement RPC failed",
        error.message,
      );
    }

    const result = data as { ok?: boolean; code?: string; detail?: string } | null;
    if (!result?.ok) {
      throw new WalletPersistenceError(
        "rpc_rejected",
        "Credential claim replacement RPC rejected the write",
        result?.detail ?? result?.code ?? "rpc_rejected",
      );
    }
  }

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "claims_service",
    action: "claims.upserted",
    object_type: "subject",
    object_id: claims[0]?.subject_id,
    metadata: { claim_types: claims.map(c => c.claim_type) },
  });
}

export async function getActiveClaimsForPolicyEvaluation(
  subjectId: string,
): Promise<CredentialClaimRecord[]> {
  const claims = await getActiveClaims(subjectId);
  return filterWalletControlClaimsForPolicyEvaluation(claims);
}

export async function getActiveClaims(subjectId: string): Promise<CredentialClaimRecord[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];

  const subject = normalizeSuiAddress(subjectId);
  const now = new Date().toISOString();

  const { data, error } = await sb
    .from("credential_claims")
    .select("*")
    .eq("subject_id", subject)
    .eq("status", "active")
    .order("issued_at", { ascending: false });

  if (error || !data) return [];

  return data
    .map(mapRow)
    .filter(c => !c.expires_at || c.expires_at > now);
}

export async function revokeSubjectClaims(
  subjectId: string,
  reason: string,
  jti?: string,
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;

  const subject = normalizeSuiAddress(subjectId);
  const revokedAt = new Date().toISOString();

  await sb.from("credential_claims")
    .update({
      status: "revoked",
      revocation_reference: reason,
      updated_at: revokedAt,
    })
    .eq("subject_id", subject)
    .eq("status", "active");

  if (jti) {
    await sb.from("abraxas_credentials")
      .update({ revoked_at: revokedAt })
      .eq("jti", jti);
  }

  await appendAuditEvent({
    actor_type: "system",
    actor_id: "claims_service",
    action: "claims.revoked",
    object_type: "subject",
    object_id: subject,
    metadata: { reason, jti },
  });
}

export async function expireStaleClaims(): Promise<number> {
  const sb = getSupabaseAdmin();
  if (!sb) return 0;

  const now = new Date().toISOString();
  const { data } = await sb
    .from("credential_claims")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now)
    .select("id");

  return data?.length ?? 0;
}

export async function updateClaimStatus(input: {
  claimId: string;
  status: ClaimStatus;
  reason?: string;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("Database unavailable");

  const { data } = await sb
    .from("credential_claims")
    .update({
      status: input.status,
      revocation_reference: input.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.claimId)
    .select("subject_id, claim_type")
    .single();

  if (data) {
    await appendAuditEvent({
      actor_type: "admin",
      actor_id: "claims_lifecycle",
      action: `claims.${input.status}`,
      object_type: "credential_claim",
      object_id: input.claimId,
      metadata: { claim_type: data.claim_type, reason: input.reason },
    });
  }
}

export async function upsertWalletBinding(
  subjectId: string,
  walletAddress: string,
  bindingMethod = "zklogin",
): Promise<void> {
  const sb = requireSupabaseAdmin();
  const subject = normalizeSuiAddress(subjectId);
  const wallet = normalizeSuiAddress(walletAddress);
  const now = new Date().toISOString();

  const { error } = await sb.from("wallet_bindings").upsert({
    subject_id: subject,
    chain: "sui",
    wallet_address: wallet,
    binding_method: bindingMethod,
    binding_status: "active",
    verified_at: now,
    revoked_at: null,
    risk_status: "low",
  }, { onConflict: "subject_id,wallet_address" });

  if (error) {
    throw new WalletPersistenceError(
      "binding_upsert_failed",
      "Failed to persist wallet binding",
      error.message,
    );
  }
}
