// FILE: lib/partner/partnerDashboard.ts
// Partner-scoped usage stats for the developer dashboard.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { computeOnboardingProgress } from "@/lib/partner/partnerOnboarding";
import { computePartnerFlowPortalOnboarding } from "@/lib/partner/partnerOnboarding";
import type { PartnerFlowPortalOnboardingProgress } from "@/lib/partner/partnerOnboarding";
import type { PartnerScope } from "@/lib/partner/partnerAuth";
import {
  loadPartnerPortalReadiness,
  type PartnerDashboardReadiness,
} from "@/lib/partner/partnerPortalReadiness";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface PartnerDashboardData {
  partner_id: string;
  display_name: string;
  company: string | null;
  status: string | null;
  key_prefix: string;
  scopes: string[];
  stats: {
    calls_30d: number;
    success_30d: number;
    success_rate: number | null;
    calls_7d: number;
  };
  recent_events: Array<{
    id: string;
    endpoint: string;
    method: string;
    success: boolean | null;
    decision: string | null;
    record_id: string | null;
    policy_id: string | null;
    http_status: number | null;
    response_time_ms: number | null;
    created_at: string;
  }>;
  readiness: PartnerDashboardReadiness;
  onboarding: PartnerFlowPortalOnboardingProgress;
  mainnet_gate: {
    eligible: boolean;
    criteria: string;
  };
}

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export async function getPartnerDashboard(
  partnerId: string,
  keyPrefix: string,
  displayName: string,
  scopes: PartnerScope[],
): Promise<PartnerDashboardData | null> {
  const client = sb();
  if (!client) return null;

  const now = Date.now();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [partnerRes, usage30Res, usage7Count, recentRes, portalReadiness] = await Promise.all([
    client
      .from("partners")
      .select("company, status")
      .eq("partner_id", partnerId)
      .maybeSingle(),
    client
      .from("partner_api_usage")
      .select("success")
      .eq("partner_id", partnerId)
      .gte("created_at", since30d),
    client
      .from("partner_api_usage")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .gte("created_at", since7d),
    client
      .from("partner_api_usage")
      .select("id, endpoint, method, success, decision, record_id, policy_id, http_status, response_time_ms, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(20),
    loadPartnerPortalReadiness({ partnerId, keyPrefix, scopes }),
  ]);

  const usage30 = usage30Res.data ?? [];
  const success30 = usage30.filter(r => r.success).length;
  const recent = (recentRes.data ?? []) as PartnerDashboardData["recent_events"];
  const approvedCount = recent.filter(r => r.decision === "approved").length;

  const productionGate = computeOnboardingProgress({
    hasKey: true,
    keyPrefix,
    calls30d: usage30.length,
    approvedDecisions: approvedCount,
  });

  const { readiness } = portalReadiness;
  const onboarding = computePartnerFlowPortalOnboarding(readiness);

  return {
    partner_id: partnerId,
    display_name: displayName,
    company: partnerRes.data?.company ?? null,
    status: partnerRes.data?.status ?? null,
    key_prefix: keyPrefix,
    scopes,
    stats: {
      calls_30d: usage30.length,
      success_30d: success30,
      success_rate: usage30.length > 0 ? Math.round((success30 / usage30.length) * 100) : null,
      calls_7d: usage7Count.count ?? 0,
    },
    recent_events: recent,
    readiness,
    onboarding,
    mainnet_gate: {
      eligible: productionGate.productionGateEligible,
      criteria:
        "Unaffiliated abx_live_ partner with decision: approved on a production verify call.",
    },
  };
}
