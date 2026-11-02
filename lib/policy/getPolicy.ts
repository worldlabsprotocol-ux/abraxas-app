// FILE: lib/policy/getPolicy.ts

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import type { PartnerPolicy } from "@/lib/policy/types";

export async function getPartnerPolicy(policyId: string): Promise<PartnerPolicy | null> {
  if (persistenceUsesDirectPostgres()) {
    const { rows } = await queryAbraxasPg<{ policy: PartnerPolicy }>(
      `select to_jsonb(p) as policy from public.partner_policies p
       where p.id = $1 and p.status = 'active' order by p.version desc limit 1`,
      [policyId],
    );
    return rows[0]?.policy ?? null;
  }
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
  if (persistenceUsesDirectPostgres()) {
    const { rows } = await queryAbraxasPg<{ policy: PartnerPolicy }>(
      `select to_jsonb(p) as policy from public.partner_policies p
       where p.id = $1 and p.version = $2 limit 1`,
      [policyId, version],
    );
    return rows[0]?.policy ?? null;
  }
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
