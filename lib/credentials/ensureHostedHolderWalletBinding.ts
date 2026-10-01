// FILE: lib/credentials/ensureHostedHolderWalletBinding.ts
// Idempotent wallet binding for abraxas_hosted holders — no Google signature required.

import { normalizeSuiAddress } from "@mysten/sui/utils";
import {
  ensureZkLoginWalletBinding,
  getCanonicalWalletBindingSnapshot,
  type WalletBindingStatusResult,
} from "@/lib/credentials/ensureZkLoginWalletBinding";
import { findHostedHolderBySuiAddress } from "@/lib/auth/hostedHolderSession";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { appendAuditEvent } from "@/lib/verification/audit";
import { WalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";

export async function ensureHostedHolderWalletBinding(
  subjectId: string,
): Promise<WalletBindingStatusResult> {
  const subject = normalizeSuiAddress(subjectId);
  const identity = await findHostedHolderBySuiAddress(subject);
  if (!identity) {
    return ensureZkLoginWalletBinding(subject);
  }

  const before = await getCanonicalWalletBindingSnapshot(subject);
  if (before.persisted) {
    return {
      status: "ok",
      binding_method: before.binding_method ?? "hosted_session",
    };
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc("upsert_zklogin_wallet_binding_atomic", {
    p_subject_id: subject,
    p_wallet_address: subject,
    p_binding_method: "hosted_session",
  });

  if (error) {
    await appendAuditEvent({
      actor_type: "system",
      actor_id: "hosted_wallet_binding",
      action: "wallet.binding_failed",
      object_type: "subject",
      object_id: subject,
      metadata: { reason_code: "rpc_failed", provider: "abraxas_hosted" },
    });
    throw new WalletPersistenceError(
      "rpc_failed",
      "Hosted wallet binding RPC failed",
      error.message,
    );
  }

  const result = data as { ok?: boolean; code?: string; detail?: string } | null;
  if (!result?.ok) {
    const reason = result?.code ?? "rpc_rejected";
    return { status: "failed", reason_code: reason };
  }

  const after = await getCanonicalWalletBindingSnapshot(subject);
  if (!after.persisted) {
    return { status: "failed", reason_code: "binding_not_persisted" };
  }

  return {
    status: "repaired",
    binding_method: after.binding_method ?? "hosted_session",
  };
}
