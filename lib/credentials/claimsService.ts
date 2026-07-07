// FILE: lib/credentials/claimsService.ts
// Persist and query normalized credential claims.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ClaimStatus, CredentialClaimRecord } from "@/lib/credentials/claimSchema";
import { appendAuditEvent } from "@/lib/verification/audit";

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

export async function upsertClaims(
  claims: Omit<CredentialClaimRecord, "id" | "status">[],
): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb || !claims.length) return;

  for (const claim of claims) {
    await sb.from("credential_claims")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("subject_id", claim.subject_id)
      .eq("claim_type", claim.claim_type)
      .eq("status", "active");

    await sb.from("credential_claims").insert({
      ...claim,
      status: "active",
      updated_at: new Date().toISOString(),
    });
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
  const sb = getSupabaseAdmin();
  if (!sb) return;

  const subject = normalizeSuiAddress(subjectId);
  const wallet = normalizeSuiAddress(walletAddress);

  await sb.from("wallet_bindings").upsert({
    subject_id: subject,
    chain: "sui",
    wallet_address: wallet,
    binding_method: bindingMethod,
    verified_at: new Date().toISOString(),
    revoked_at: null,
  }, { onConflict: "subject_id,wallet_address" });
}
