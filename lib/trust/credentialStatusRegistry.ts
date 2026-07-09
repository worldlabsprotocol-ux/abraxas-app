// FILE: lib/trust/credentialStatusRegistry.ts
// Credential status lifecycle with validated transitions and immutable audit events.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import type { ClaimStatus } from "@/lib/credentials/claimSchema";

export type CredentialStatus = ClaimStatus;

const ALLOWED_TRANSITIONS: Record<CredentialStatus, CredentialStatus[]> = {
  active: ["suspended", "revoked", "expired", "under_review"],
  suspended: ["active", "revoked", "expired"],
  under_review: ["active", "suspended", "revoked"],
  expired: [],
  revoked: [],
};

export function isTransitionAllowed(from: CredentialStatus, to: CredentialStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function resolveClaimStatusAtRead(input: {
  status: CredentialStatus;
  expires_at: string | null;
}): CredentialStatus {
  if (input.status === "revoked" || input.status === "suspended" || input.status === "under_review") {
    return input.status;
  }
  if (input.expires_at && new Date(input.expires_at) < new Date()) {
    return "expired";
  }
  return input.status;
}

export interface CredentialStatusPublicView {
  claim_id: string;
  claim_type: string;
  issuer_id: string;
  status: CredentialStatus;
  status_updated_at: string | null;
  status_reason_code: string | null;
  issued_at: string;
  expires_at: string | null;
  assurance_level: string | null;
  jurisdiction: string | null;
}

export async function getClaimById(claimId: string) {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("credential_claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function getCredentialStatusPublic(claimId: string): Promise<CredentialStatusPublicView | null> {
  const row = await getClaimById(claimId);
  if (!row) return null;
  const resolved = resolveClaimStatusAtRead({
    status: row.status as CredentialStatus,
    expires_at: (row.expires_at as string | null) ?? null,
  });
  return {
    claim_id: row.id as string,
    claim_type: row.claim_type as string,
    issuer_id: row.issuer_id as string,
    status: resolved,
    status_updated_at: (row.status_updated_at as string | null) ?? (row.updated_at as string | null) ?? null,
    status_reason_code: (row.status_reason_code as string | null) ?? null,
    issued_at: row.issued_at as string,
    expires_at: (row.expires_at as string | null) ?? null,
    assurance_level: (row.assurance_level as string | null) ?? null,
    jurisdiction: (row.jurisdiction as string | null) ?? null,
  };
}

async function findDependentReceiptIds(claimId: string): Promise<string[]> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("receipt_claim_dependencies")
    .select("receipt_id")
    .eq("claim_id", claimId);
  return (data ?? []).map(r => r.receipt_id as string);
}

export async function transitionClaimStatus(input: {
  claimId: string;
  toStatus: CredentialStatus;
  reasonCode?: string;
  changedBy: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: true; from: CredentialStatus; to: CredentialStatus } | { ok: false; error: string }> {
  const sb = requireSupabaseAdmin();

  if (input.idempotencyKey) {
    const { data: existing } = await sb
      .from("credential_status_events")
      .select("to_status, from_status")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return {
        ok: true,
        from: (existing.from_status as CredentialStatus) ?? "active",
        to: existing.to_status as CredentialStatus,
      };
    }
  }

  const row = await getClaimById(input.claimId);
  if (!row) return { ok: false, error: "Claim not found" };

  const fromStatus = resolveClaimStatusAtRead({
    status: row.status as CredentialStatus,
    expires_at: (row.expires_at as string | null) ?? null,
  });

  if (fromStatus === "revoked" && input.toStatus === "active") {
    return { ok: false, error: "Revoked credentials cannot be reactivated; issue a new credential" };
  }
  if (fromStatus === "expired" && input.toStatus === "active") {
    return { ok: false, error: "Expired credentials require re-verification via new issuance" };
  }
  if (!isTransitionAllowed(fromStatus, input.toStatus)) {
    return { ok: false, error: `Transition ${fromStatus} -> ${input.toStatus} not allowed` };
  }

  const now = new Date().toISOString();
  const affectedReceiptIds = await findDependentReceiptIds(input.claimId);

  const { error: updateErr } = await sb
    .from("credential_claims")
    .update({
      status: input.toStatus,
      status_updated_at: now,
      status_reason_code: input.reasonCode ?? null,
      status_changed_by: input.changedBy,
      updated_at: now,
      revocation_reference: input.toStatus === "revoked" ? (input.reasonCode ?? "revoked") : row.revocation_reference,
    })
    .eq("id", input.claimId);

  if (updateErr) return { ok: false, error: updateErr.message };

  await sb.from("credential_status_events").insert({
    claim_id: input.claimId,
    from_status: fromStatus,
    to_status: input.toStatus,
    reason_code: input.reasonCode ?? null,
    changed_by: input.changedBy,
    idempotency_key: input.idempotencyKey ?? null,
    metadata: input.metadata ?? {},
    affected_receipt_ids: affectedReceiptIds,
  });

  await appendAuditEvent({
    actor_type: input.changedBy.startsWith("admin") ? "admin" : "system",
    actor_id: input.changedBy,
    action: `credential_status.${input.toStatus}`,
    object_type: "credential_claim",
    object_id: input.claimId,
    metadata: {
      from_status: fromStatus,
      to_status: input.toStatus,
      reason_code: input.reasonCode,
      affected_receipt_ids: affectedReceiptIds,
    },
  });

  return { ok: true, from: fromStatus, to: input.toStatus };
}

export async function expireStaleClaimsWithAudit(changedBy = "expiry_sweep"): Promise<number> {
  const sb = requireSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: stale } = await sb
    .from("credential_claims")
    .select("id")
    .eq("status", "active")
    .lt("expires_at", now);

  let count = 0;
  for (const row of stale ?? []) {
    const result = await transitionClaimStatus({
      claimId: row.id as string,
      toStatus: "expired",
      reasonCode: "credential_expired",
      changedBy,
      idempotencyKey: `expire:${row.id as string}:${now.slice(0, 10)}`,
    });
    if (result.ok) count += 1;
  }
  return count;
}

export async function getClaimStatusTimeline(claimId: string) {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("credential_status_events")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getReceiptIdsForClaim(claimId: string): Promise<string[]> {
  return findDependentReceiptIds(claimId);
}
