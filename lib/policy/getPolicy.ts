// FILE: lib/policy/getPolicy.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import type { PartnerPolicy } from "@/lib/policy/types";

export async function getPartnerPolicy(policyId: string): Promise<PartnerPolicy | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_policies")
    .select("*")
    .eq("id", policyId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return null;
  return data as PartnerPolicy;
}

/** Load an exact historical policy version for reproducibility (P1-1). */
export async function getPartnerPolicyAtVersion(
  policyId: string,
  version: number,
): Promise<PartnerPolicy | null> {
  const sb = requireSupabaseAdmin();
  const { data } = await sb
    .from("partner_policies")
    .select("*")
    .eq("id", policyId)
    .eq("version", version)
    .maybeSingle();

  if (!data) return null;
  return data as PartnerPolicy;
}
