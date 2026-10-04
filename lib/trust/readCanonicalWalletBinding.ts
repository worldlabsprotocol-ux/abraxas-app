// FILE: lib/trust/readCanonicalWalletBinding.ts
// Shared canonical wallet binding truth for identity + trust reads.
//
// Reads the holder's Sui zkLogin self-binding only — not EVM wallet-control siblings.
// Scoped claim lookup uses wb:{binding_id}; multiple active wallet-control claims per
// subject must not break this read (see migration 128/129).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { WALLET_BINDING_READ_FAILED_CODE } from "@/lib/trust/getTrustStatus";
import { walletControlEvidenceRef } from "@/lib/walletControl/contract";

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

function isLegacySuiZkLoginClaim(
  claim: { claim_value?: Record<string, unknown> | null },
  sui: string,
): boolean {
  const value = claim.claim_value ?? {};
  const chain = typeof value.chain === "string" ? value.chain : null;
  const wallet = typeof value.wallet_address === "string" ? value.wallet_address : null;
  if (chain !== "sui" || !wallet) return false;
  try {
    return normalizeSuiAddress(wallet) === sui;
  } catch {
    return false;
  }
}

async function readScopedZkLoginClaim(
  sb: SupabaseClient,
  sui: string,
  bindingId: string,
): Promise<{ id: string } | null> {
  const { data, error } = await sb
    .from("credential_claims")
    .select("id")
    .eq("subject_id", sui)
    .eq("claim_type", "wallet_binding_confirmed")
    .eq("evidence_reference", walletControlEvidenceRef(bindingId))
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ? { id: data.id as string } : null;
}

async function readLegacyUnscopedSuiClaim(
  sb: SupabaseClient,
  sui: string,
): Promise<{ id: string } | null> {
  const { data, error } = await sb
    .from("credential_claims")
    .select("id, claim_value")
    .eq("subject_id", sui)
    .eq("claim_type", "wallet_binding_confirmed")
    .eq("status", "active")
    .is("evidence_reference", null);

  if (error) throw error;

  const legacy = (data ?? []).find(row => isLegacySuiZkLoginClaim(
    row as { claim_value?: Record<string, unknown> | null },
    sui,
  ));
  return legacy ? { id: legacy.id as string } : null;
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
    .select("id, binding_method, binding_status, revoked_at")
    .eq("subject_id", sui)
    .eq("wallet_address", sui)
    .eq("chain", "sui")
    .maybeSingle();

  if (walletBindingError) {
    console.error("[readCanonicalWalletBindingTruth] wallet binding read failed", {
      subject: sui,
      wallet_binding_error: walletBindingError.message,
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
  let walletBindingClaim: { id: string } | null = null;

  if (walletBinding?.id && bindingStatus === "active") {
    try {
      walletBindingClaim = await readScopedZkLoginClaim(sb, sui, walletBinding.id as string);
      if (!walletBindingClaim) {
        walletBindingClaim = await readLegacyUnscopedSuiClaim(sb, sui);
      }
    } catch (claimError) {
      const message = claimError instanceof Error ? claimError.message : String(claimError);
      console.error("[readCanonicalWalletBindingTruth] wallet binding claim read failed", {
        subject: sui,
        wallet_binding_claim_error: message,
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
  }

  const persisted = bindingStatus === "active" && Boolean(walletBindingClaim?.id);

  return {
    persisted,
    status: persisted ? "active" : bindingStatus,
    binding_method: (walletBinding?.binding_method as string | null) ?? null,
    claim_active: Boolean(walletBindingClaim?.id),
    repairable: !persisted,
  };
}
