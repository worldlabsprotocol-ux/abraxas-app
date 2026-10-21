// FILE: lib/partner/launchpad/stagingWalletControlRpcReady.ts
// Staging preflight: wallet-control claim persistence RPC must exist on linked Supabase.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export async function isWalletControlClaimRpcReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb.rpc("upsert_wallet_control_claim_atomic", {
      p_subject_id: "abx_hs_00000000000000000000000000000000",
      p_evidence_reference: "wallet_binding:staging-preflight-probe",
      p_claim_value: { probe: true },
      p_issuer_id: "abraxas",
      p_assurance_level: "L3",
      p_issued_at: new Date().toISOString(),
      p_expires_at: new Date(Date.now() + 60_000).toISOString(),
      p_jurisdiction: null,
      p_policy_scope: "core",
    });
    if (error) return false;
    const result = data as { ok?: boolean } | null;
    return result?.ok === true;
  } catch {
    return false;
  }
}
