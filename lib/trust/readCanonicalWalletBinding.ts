// FILE: lib/trust/readCanonicalWalletBinding.ts
// Shared canonical wallet binding truth for identity + trust reads.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { WALLET_BINDING_READ_FAILED_CODE } from "@/lib/trust/getTrustStatus";

export type CanonicalWalletBindingStatus = "active" | "missing" | "revoked" | "unavailable";

export interface CanonicalWalletBindingTruth {
  persisted: boolean;
  status: CanonicalWalletBindingStatus;
  binding_method: string | null;
  claim_active: boolean;
  repairable: boolean;
  read_error?: string;
}

function resolveBindingStatus(binding: {
  binding_status?: string | null;
  revoked_at?: string | null;
} | null): Exclude<CanonicalWalletBindingStatus, "unavailable"> {
  if (!binding) return "missing";
  if (
    binding.revoked_at
    || binding.binding_status === "revoked"
    || binding.binding_status === "compromised"
  ) {
    return "revoked";
  }
  if (binding.binding_status === "active" || !binding.binding_status) {
    return "active";
  }
  return "missing";
}

export async function readCanonicalWalletBindingTruth(
  rawAddress: string,
  supabase?: SupabaseClient,
): Promise<CanonicalWalletBindingTruth> {
  const sui = normalizeSuiAddress(rawAddress);
  const sb = supabase ?? createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    { auth: { persistSession: false } },
  );

  const { data: walletBinding, error: walletBindingError } = await sb
    .from("wallet_bindings")
    .select("binding_method, binding_status, revoked_at")
    .eq("subject_id", sui)
    .eq("wallet_address", sui)
    .eq("chain", "sui")
    .maybeSingle();

  const { data: walletBindingClaim, error: walletBindingClaimError } = await sb
    .from("credential_claims")
    .select("id")
    .eq("subject_id", sui)
    .eq("claim_type", "wallet_binding_confirmed")
    .eq("status", "active")
    .maybeSingle();

  if (walletBindingError || walletBindingClaimError) {
    console.error("[readCanonicalWalletBindingTruth] wallet binding read failed", {
      subject: sui,
      wallet_binding_error: walletBindingError?.message,
      wallet_binding_claim_error: walletBindingClaimError?.message,
    });
    return {
      persisted: false,
      status: "unavailable",
      binding_method: null,
      claim_active: false,
      repairable: false,
      read_error: WALLET_BINDING_READ_FAILED_CODE,
    };
  }

  const bindingStatus = resolveBindingStatus(walletBinding);
  const persisted = bindingStatus === "active" && Boolean(walletBindingClaim?.id);

  return {
    persisted,
    status: persisted ? "active" : bindingStatus,
    binding_method: (walletBinding?.binding_method as string | null) ?? null,
    claim_active: Boolean(walletBindingClaim?.id),
    repairable: !persisted,
  };
}
