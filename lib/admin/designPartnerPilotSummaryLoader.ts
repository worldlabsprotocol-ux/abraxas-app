// FILE: lib/admin/designPartnerPilotSummaryLoader.ts
// Batch loader for promoted design-partner pilot summaries — bounded queries only.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  applyPilotSummaryCap,
  buildDesignPartnerPilotSummary,
  MAX_PILOT_SUMMARIES,
  type DesignPartnerPilotSummaryDto,
  type PilotSummaryResponse,
} from "@/lib/admin/designPartnerPilotSummary";
import type { PartnerPolicySummary } from "@/lib/admin/partnerOnboardingConsole";

export const BOUNDED_PILOT_SUMMARY_QUERY_COUNT = 4;

type DesignPartnerRow = {
  id: string;
  company: string;
  promoted_partner_id: string;
  status: string;
};

type PartnerRow = {
  partner_id: string;
  is_external: boolean;
  allowed_environments: string[];
  allowed_return_urls: string[] | null;
  assigned_policy_id: string | null;
  onboarding_checklist: unknown;
};

type PolicyRow = {
  id: string;
  version: number;
  status: string;
  name: string;
  partner_id: string;
};

type WebhookConfigRow = {
  partner_id: string;
};

function toPolicySummary(row: PolicyRow): PartnerPolicySummary {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    name: row.name,
    partner_id: row.partner_id,
  };
}

export function createPilotSummarySupabaseClient(
  url: string,
  key: string,
): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadPilotSummariesWithClient(
  sb: SupabaseClient,
): Promise<PilotSummaryResponse> {
  const { data: applications, error: applicationsError } = await sb
    .from("design_partners")
    .select("id, company, promoted_partner_id, status")
    .not("promoted_partner_id", "is", null)
    .neq("status", "rejected")
    .order("created_at", { ascending: false })
    .limit(MAX_PILOT_SUMMARIES + 1);

  if (applicationsError) {
    throw new Error("core_load_failed");
  }

  const { rows: applicationRows, capped } = applyPilotSummaryCap(
    (applications ?? []) as DesignPartnerRow[],
  );

  if (applicationRows.length === 0) {
    return {
      summaries: [],
      meta: {
        returned: 0,
        capped,
        max_summaries: MAX_PILOT_SUMMARIES,
      },
    };
  }

  const partnerIds = applicationRows.map((row) => row.promoted_partner_id);

  const [partnersResult, policiesResult, webhookConfigsResult] = await Promise.all([
    sb
      .from("partners")
      .select(
        "partner_id, is_external, allowed_environments, allowed_return_urls, assigned_policy_id, onboarding_checklist",
      )
      .in("partner_id", partnerIds),
    sb
      .from("partner_policies")
      .select("id, version, status, name, partner_id")
      .in("partner_id", partnerIds),
    sb
      .from("partner_webhook_configs")
      .select("partner_id")
      .in("partner_id", partnerIds),
  ]);

  if (partnersResult.error || policiesResult.error) {
    throw new Error("core_load_failed");
  }

  const partnerRows = (partnersResult.data ?? []) as PartnerRow[];
  const policyRows = (policiesResult.data ?? []) as PolicyRow[];
  const webhookConfiguredPartnerIds = webhookConfigsResult.error
    ? null
    : new Set(
        ((webhookConfigsResult.data ?? []) as WebhookConfigRow[]).map((row) => row.partner_id),
      );

  const partnersById = new Map(partnerRows.map((row) => [row.partner_id, row]));

  const summaries: DesignPartnerPilotSummaryDto[] = applicationRows.map((application) => {
    const partnerId = application.promoted_partner_id;
    const partnerRow = partnersById.get(partnerId) ?? null;
    const partnerPolicies = policyRows.filter((policy) => policy.partner_id === partnerId);
    const activePolicy = partnerPolicies.find((policy) => policy.status === "active") ?? null;

    return buildDesignPartnerPilotSummary({
      applicationId: application.id,
      displayName: application.company,
      promotedPartnerId: partnerId,
      partnerRow,
      activePolicy: activePolicy ? toPolicySummary(activePolicy) : null,
      webhookConfiguredPartnerIds,
    });
  });

  return {
    summaries,
    meta: {
      returned: summaries.length,
      capped,
      max_summaries: MAX_PILOT_SUMMARIES,
    },
  };
}

export async function loadPilotSummaries(): Promise<PilotSummaryResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    throw new Error("supabase_not_configured");
  }
  const sb = createPilotSummarySupabaseClient(url, key);
  return loadPilotSummariesWithClient(sb);
}
