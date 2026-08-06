// FILE: lib/admin/partnerOnboardingService.ts
// Supabase-backed loaders for admin partner onboarding console.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assessPartnerPilotReadiness,
  buildConformanceCommand,
  buildSecondPartnerPilotChecklist,
  type PartnerOnboardingRecord,
  type PartnerPolicySummary,
} from "@/lib/admin/partnerOnboardingConsole";

type PartnerRow = {
  partner_id: string;
  company: string;
  status: string;
  is_external: boolean;
  allowed_environments: string[];
  allowed_return_urls: string[] | null;
  assigned_policy_id: string | null;
  use_case: string | null;
  legal_entity: string | null;
  created_at: string;
  updated_at: string;
};

function toPolicySummary(row: {
  id: string;
  version: number;
  status: string;
  name: string;
  partner_id: string;
}): PartnerPolicySummary {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    name: row.name,
    partner_id: row.partner_id,
  };
}

export async function loadPartnerOnboardingRecords(): Promise<PartnerOnboardingRecord[]> {
  const sb = requireSupabaseAdmin();
  const { data: partners, error } = await sb
    .from("partners")
    .select(
      "partner_id, company, status, is_external, allowed_environments, allowed_return_urls, assigned_policy_id, use_case, legal_entity, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  const partnerRows = (partners ?? []) as PartnerRow[];
  const partnerIds = partnerRows.map(p => p.partner_id);

  const { data: policies, error: policyError } = partnerIds.length
    ? await sb
      .from("partner_policies")
      .select("id, version, status, name, partner_id")
      .in("partner_id", partnerIds)
    : { data: [], error: null };

  if (policyError) throw new Error(policyError.message);

  const policyRows = (policies ?? []) as Array<{
    id: string;
    version: number;
    status: string;
    name: string;
    partner_id: string;
  }>;

  return partnerRows.map((partner) => {
    const partnerPolicies = policyRows.filter(p => p.partner_id === partner.partner_id);
    const active = partnerPolicies.find(p => p.status === "active") ?? null;
    const draft = partnerPolicies.find(p => p.status === "draft") ?? null;
    const allowed_return_urls = partner.allowed_return_urls ?? [];

    const readiness = assessPartnerPilotReadiness({
      partner_id: partner.partner_id,
      status: partner.status,
      is_external: partner.is_external,
      allowed_return_urls,
      active_policy: active ? toPolicySummary(active) : null,
      assigned_policy_id: partner.assigned_policy_id,
    });

    const record: PartnerOnboardingRecord = {
      ...partner,
      allowed_return_urls,
      active_policy: active ? toPolicySummary(active) : null,
      draft_policy: draft ? toPolicySummary(draft) : null,
      readiness,
    };

    return record;
  });
}

export async function loadPartnerOnboardingRecord(
  partnerId: string,
): Promise<PartnerOnboardingRecord | null> {
  const records = await loadPartnerOnboardingRecords();
  return records.find(r => r.partner_id === partnerId) ?? null;
}

export function enrichPartnerOnboardingDetail(record: PartnerOnboardingRecord) {
  return {
    ...record,
    pilot_checklist: buildSecondPartnerPilotChecklist(record),
    conformance_command: buildConformanceCommand(record),
  };
}
