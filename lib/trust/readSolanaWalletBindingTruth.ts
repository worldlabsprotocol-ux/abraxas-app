// FILE: lib/trust/readSolanaWalletBindingTruth.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalWalletBindingTruth } from "@/lib/trust/readCanonicalWalletBinding";
import { WALLET_BINDING_READ_FAILED_CODE } from "@/lib/trust/getTrustStatus";

const WALLET_FRESH_HOURS = 720;

export async function readSolanaWalletBindingTruth(
  claimsSubjectKey: string,
  solanaAddress: string,
  sb: SupabaseClient,
): Promise<CanonicalWalletBindingTruth> {
  try {
    const { data, error } = await sb
      .from("wallet_bindings")
      .select("id, binding_method, binding_status, verified_at, revoked_at, chain")
      .eq("subject_id", claimsSubjectKey)
      .eq("wallet_address", solanaAddress)
      .eq("chain", "solana")
      .maybeSingle();

    if (error) {
      return {
        persisted: false,
        status: "unavailable",
        binding_method: null,
        claim_active: false,
        repairable: false,
        read_error: WALLET_BINDING_READ_FAILED_CODE,
      };
    }

    if (!data || data.revoked_at || data.binding_status === "revoked") {
      return {
        persisted: false,
        status: "revoked",
        binding_method: data?.binding_method ?? null,
        claim_active: false,
        repairable: true,
      };
    }

    if (data.binding_method !== "signed_challenge" || data.binding_status !== "active") {
      return {
        persisted: false,
        status: "missing",
        binding_method: data?.binding_method ?? null,
        claim_active: false,
        repairable: true,
      };
    }

    const verifiedAt = new Date(data.verified_at as string).getTime();
    const fresh = Date.now() - verifiedAt <= WALLET_FRESH_HOURS * 60 * 60 * 1000;

    return {
      persisted: fresh,
      status: "active",
      binding_method: data.binding_method as string,
      claim_active: fresh,
      repairable: !fresh,
    };
  } catch {
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
