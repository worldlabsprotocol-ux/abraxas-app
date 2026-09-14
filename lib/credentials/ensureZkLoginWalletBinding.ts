// FILE: lib/credentials/ensureZkLoginWalletBinding.ts
// Idempotent zkLogin wallet binding repair — new and returning Google users.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { WalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";
import { readCanonicalWalletBindingTruth } from "@/lib/trust/readCanonicalWalletBinding";

export type WalletBindingStatusValue = "ok" | "repaired" | "failed";

export type WalletBindingStatusResult = {
  status: WalletBindingStatusValue;
  reason_code?: string;
  binding_method?: string;
};

export type CanonicalWalletBindingSnapshot = {
  subject_id: string;
  wallet_address: string;
  persisted: boolean;
  binding_status: "active" | "missing" | "revoked";
  binding_method: string | null;
  claim_active: boolean;
  repairable: boolean;
};

async function emitBindingFailedAudit(subjectId: string, reasonCode: string): Promise<void> {
  await appendAuditEvent({
    actor_type: "system",
    actor_id: "wallet_binding_service",
    action: "wallet.binding_failed",
    object_type: "subject",
    object_id: subjectId,
    metadata: { reason_code: reasonCode },
  });
}

export async function getCanonicalWalletBindingSnapshot(
  subjectId: string,
): Promise<CanonicalWalletBindingSnapshot> {
  const subject = normalizeSuiAddress(subjectId);
  const truth = await readCanonicalWalletBindingTruth(subject, requireSupabaseAdmin());

  if (truth.status === "unavailable") {
    throw new WalletPersistenceError(
      "binding_upsert_failed",
      "Failed to read wallet binding",
      truth.read_error,
    );
  }

  const bindingStatus = truth.status === "active"
    ? "active"
    : truth.status === "revoked"
      ? "revoked"
      : "missing";

  return {
    subject_id: subject,
    wallet_address: subject,
    persisted: truth.persisted,
    binding_status: bindingStatus,
    binding_method: truth.binding_method,
    claim_active: truth.claim_active,
    repairable: truth.repairable,
  };
}

/**
 * Ensure canonical zkLogin wallet binding + L2 claim exist for a subject.
 * Safe to call on every registration and from the signed-in repair endpoint.
 */
export async function ensureZkLoginWalletBinding(
  subjectId: string,
  walletAddress?: string,
): Promise<WalletBindingStatusResult> {
  const subject = normalizeSuiAddress(subjectId);
  const wallet = normalizeSuiAddress(walletAddress ?? subjectId);

  if (subject !== wallet) {
    await emitBindingFailedAudit(subject, "subject_wallet_mismatch");
    return { status: "failed", reason_code: "subject_wallet_mismatch" };
  }

  const before = await getCanonicalWalletBindingSnapshot(subject);
  if (before.persisted) {
    return {
      status: "ok",
      binding_method: before.binding_method ?? "zklogin",
    };
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("upsert_zklogin_wallet_binding_atomic", {
    p_subject_id: subject,
    p_wallet_address: wallet,
    p_binding_method: "zklogin",
  });

  if (error) {
    await emitBindingFailedAudit(subject, "rpc_failed");
    throw new WalletPersistenceError(
      "rpc_failed",
      "Wallet binding RPC failed",
      error.message,
    );
  }

  const result = data as { ok?: boolean; code?: string; detail?: string } | null;
  if (!result?.ok) {
    const reason = result?.code ?? "rpc_rejected";
    await emitBindingFailedAudit(subject, reason);
    throw new WalletPersistenceError(
      "rpc_rejected",
      "Wallet binding RPC rejected the write",
      result?.detail ?? reason,
    );
  }

  const after = await getCanonicalWalletBindingSnapshot(subject);
  if (!after.persisted) {
    await emitBindingFailedAudit(subject, "binding_not_persisted");
    return { status: "failed", reason_code: "binding_not_persisted" };
  }

  return {
    status: "repaired",
    binding_method: after.binding_method ?? "zklogin",
  };
}
