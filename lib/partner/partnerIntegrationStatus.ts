// FILE: lib/partner/partnerIntegrationStatus.ts
// Own-partner integration wiring booleans — no secrets, PII, or cross-partner data.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const PARTNER_INTEGRATION_SANDBOX_NOTICE =
  "Sandbox access (abx_test_ keys and sandbox policies) cannot be used for Production access. Receipts with production_usable: false must not gate live user actions.";

export interface PartnerIntegrationSnapshot {
  allowedReturnUrlCount: number;
  assignedPolicyId: string | null;
  hasActivePolicy: boolean;
  webhookEnabled: boolean;
}

export interface PartnerIntegrationWiringStatus {
  partner_id: string;
  key_environment: "sandbox" | "production";
  key_prefix: string;
  sandbox_notice: string;
  wiring: {
    return_urls_configured: boolean;
    return_url_count: number;
    active_policy_configured: boolean;
    policy_id: string | null;
    webhook_enabled: boolean;
    partner_flow_ready: boolean;
  };
  docs: {
    partner_flow_guide: string;
    integration_status_endpoint: string;
  };
}

function sb(): SupabaseClient | null {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

function keyEnvironment(keyPrefix: string): "sandbox" | "production" {
  return keyPrefix.startsWith("abx_live_") ? "production" : "sandbox";
}

export function buildPartnerIntegrationStatus(input: {
  partnerId: string;
  keyPrefix: string;
  snapshot: PartnerIntegrationSnapshot;
}): PartnerIntegrationWiringStatus {
  const returnUrlsConfigured = input.snapshot.allowedReturnUrlCount > 0;
  const activePolicyConfigured = input.snapshot.hasActivePolicy;
  const partnerFlowReady = returnUrlsConfigured && activePolicyConfigured;

  return {
    partner_id: input.partnerId,
    key_environment: keyEnvironment(input.keyPrefix),
    key_prefix: input.keyPrefix,
    sandbox_notice: PARTNER_INTEGRATION_SANDBOX_NOTICE,
    wiring: {
      return_urls_configured: returnUrlsConfigured,
      return_url_count: input.snapshot.allowedReturnUrlCount,
      active_policy_configured: activePolicyConfigured,
      policy_id: activePolicyConfigured ? input.snapshot.assignedPolicyId : null,
      webhook_enabled: input.snapshot.webhookEnabled,
      partner_flow_ready: partnerFlowReady,
    },
    docs: {
      partner_flow_guide: "/docs/partner-flow",
      integration_status_endpoint: "/api/partner/integration-status",
    },
  };
}

export async function fetchPartnerIntegrationSnapshot(
  partnerId: string,
): Promise<PartnerIntegrationSnapshot | null> {
  const client = sb();
  if (!client) return null;

  const [partnerRes, policyCountRes, webhookRes] = await Promise.all([
    client
      .from("partners")
      .select("allowed_return_urls, assigned_policy_id")
      .eq("partner_id", partnerId)
      .maybeSingle(),
    client
      .from("partner_policies")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", partnerId)
      .eq("status", "active"),
    client
      .from("partner_webhook_configs")
      .select("enabled")
      .eq("partner_id", partnerId)
      .maybeSingle(),
  ]);

  if (!partnerRes.data) return null;

  const allowedUrls = (partnerRes.data.allowed_return_urls as string[] | null) ?? [];

  return {
    allowedReturnUrlCount: allowedUrls.length,
    assignedPolicyId: (partnerRes.data.assigned_policy_id as string | null) ?? null,
    hasActivePolicy: (policyCountRes.count ?? 0) > 0,
    webhookEnabled: webhookRes.data?.enabled === true,
  };
}

export async function getPartnerIntegrationStatus(
  partnerId: string,
  keyPrefix: string,
): Promise<PartnerIntegrationWiringStatus | null> {
  const snapshot = await fetchPartnerIntegrationSnapshot(partnerId);
  if (!snapshot) return null;

  return buildPartnerIntegrationStatus({ partnerId, keyPrefix, snapshot });
}
