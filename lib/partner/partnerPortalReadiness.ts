// FILE: lib/partner/partnerPortalReadiness.ts
// Partner portal readiness — assigned-policy binding, safe booleans, no secrets.

import { validatePartnerReturnUrlFormat } from "@/lib/partner/referenceRelyingPartyConfig";
import { getPartnerWebhookPortalStatus } from "@/lib/partner/partnerWebhookPortalStatus";
import type { PartnerScope } from "@/lib/partner/partnerAuth";
import { partnerHasWebhooksReadScope } from "@/lib/partner/webhooks/webhookOperatorReadiness";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PARTNER_PORTAL_SANDBOX_NOTICE =
  "Sandbox configuration cannot authorize Production access. Receipts with production_usable: false must not gate live user actions.";

export interface PartnerWebhookTrackReadiness {
  applicable: boolean;
  scope_ready: boolean;
  endpoint_configured: boolean;
  delivery_enabled: boolean;
  sandbox_test_available: boolean;
}

export interface PartnerDashboardReadiness {
  partner_row_ready: boolean;
  assigned_policy_configured: boolean;
  active_sandbox_policy_ready: boolean;
  active_policy_id: string | null;
  active_policy_ambiguous: boolean;
  callback_allowlist_configured: boolean;
  partner_flow_config_ready: boolean;
  verify_scopes_available: boolean;
  key_environment: "sandbox" | "production";
  webhook_track: PartnerWebhookTrackReadiness;
  sandbox_notice: string;
}

export interface PartnerPortalReadinessPartnerRow {
  status: string | null;
  is_external: boolean | null;
  assigned_policy_id: string | null;
  allowed_return_urls: string[] | null;
}

export interface PartnerPortalReadinessPolicyRow {
  id: string;
  rules_json: unknown;
}

const USABLE_PARTNER_STATUSES = new Set(["pilot", "recruiting", "active"]);

const INACTIVE_WEBHOOK_TRACK: PartnerWebhookTrackReadiness = {
  applicable: false,
  scope_ready: false,
  endpoint_configured: false,
  delivery_enabled: false,
  sandbox_test_available: false,
};

export function isExplicitSandboxPolicyRules(rulesJson: unknown): boolean {
  return (
    rulesJson !== null
    && typeof rulesJson === "object"
    && (rulesJson as { sandbox_only?: boolean }).sandbox_only === true
  );
}

export function isCallbackAllowlistConfigured(urls: string[] | null | undefined): boolean {
  if (!urls?.length) return false;
  return urls.every((raw) => {
    const url = raw.trim();
    if (!url) return false;
    return validatePartnerReturnUrlFormat(url).ok;
  });
}

export function keyEnvironmentFromPrefix(keyPrefix: string): "sandbox" | "production" {
  return keyPrefix.startsWith("abx_live_") ? "production" : "sandbox";
}

export function partnerVerifyScopesAvailable(scopes: readonly string[]): boolean {
  return scopes.includes("verify:credential") || scopes.includes("verify:registry");
}

export function resolveAssignedPolicyReadiness(input: {
  authPartnerId: string;
  assignedPolicyId: string | null | undefined;
  activeAssignedPolicies: readonly PartnerPortalReadinessPolicyRow[];
}): Pick<
  PartnerDashboardReadiness,
  | "assigned_policy_configured"
  | "active_sandbox_policy_ready"
  | "active_policy_id"
  | "active_policy_ambiguous"
> {
  const assignedId = input.assignedPolicyId?.trim() ?? "";
  const assigned_policy_configured = assignedId.length > 0;

  if (!assigned_policy_configured) {
    return {
      assigned_policy_configured: false,
      active_sandbox_policy_ready: false,
      active_policy_id: null,
      active_policy_ambiguous: false,
    };
  }

  const activeRows = input.activeAssignedPolicies.filter((row) => row.id === assignedId);

  if (activeRows.length === 0) {
    return {
      assigned_policy_configured: true,
      active_sandbox_policy_ready: false,
      active_policy_id: null,
      active_policy_ambiguous: false,
    };
  }

  if (activeRows.length > 1) {
    return {
      assigned_policy_configured: true,
      active_sandbox_policy_ready: false,
      active_policy_id: null,
      active_policy_ambiguous: true,
    };
  }

  const policy = activeRows[0];
  if (!isExplicitSandboxPolicyRules(policy.rules_json)) {
    return {
      assigned_policy_configured: true,
      active_sandbox_policy_ready: false,
      active_policy_id: null,
      active_policy_ambiguous: false,
    };
  }

  return {
    assigned_policy_configured: true,
    active_sandbox_policy_ready: true,
    active_policy_id: assignedId,
    active_policy_ambiguous: false,
  };
}

export function buildWebhookTrackReadiness(input: {
  scopes: readonly string[];
  portalStatus?: {
    webhook_configured: boolean;
    webhook_delivery_enabled: boolean;
    sandbox_test: { available: boolean };
  } | null;
}): PartnerWebhookTrackReadiness {
  if (!partnerHasWebhooksReadScope(input.scopes)) {
    return { ...INACTIVE_WEBHOOK_TRACK };
  }

  const status = input.portalStatus;
  return {
    applicable: true,
    scope_ready: true,
    endpoint_configured: status?.webhook_configured === true,
    delivery_enabled: status?.webhook_delivery_enabled === true,
    sandbox_test_available: status?.sandbox_test.available === true,
  };
}

export function resolvePartnerPortalReadiness(input: {
  authPartnerId: string;
  keyPrefix: string;
  scopes: readonly string[];
  partner: PartnerPortalReadinessPartnerRow | null;
  activeAssignedPolicies: readonly PartnerPortalReadinessPolicyRow[];
  webhookPortalStatus?: {
    webhook_configured: boolean;
    webhook_delivery_enabled: boolean;
    sandbox_test: { available: boolean };
  } | null;
}): PartnerDashboardReadiness {
  const partner_row_ready = Boolean(
    input.partner
    && input.partner.is_external === true
    && USABLE_PARTNER_STATUSES.has(input.partner.status ?? ""),
  );

  const policyState = resolveAssignedPolicyReadiness({
    authPartnerId: input.authPartnerId,
    assignedPolicyId: input.partner?.assigned_policy_id,
    activeAssignedPolicies: input.activeAssignedPolicies,
  });

  const callback_allowlist_configured = isCallbackAllowlistConfigured(
    input.partner?.allowed_return_urls,
  );

  const partner_flow_config_ready =
    partner_row_ready
    && policyState.assigned_policy_configured
    && policyState.active_sandbox_policy_ready
    && callback_allowlist_configured
    && !policyState.active_policy_ambiguous;

  return {
    partner_row_ready,
    ...policyState,
    callback_allowlist_configured,
    partner_flow_config_ready,
    verify_scopes_available: partnerVerifyScopesAvailable(input.scopes),
    key_environment: keyEnvironmentFromPrefix(input.keyPrefix),
    webhook_track: buildWebhookTrackReadiness({
      scopes: input.scopes,
      portalStatus: input.webhookPortalStatus,
    }),
    sandbox_notice: PARTNER_PORTAL_SANDBOX_NOTICE,
  };
}

function sb(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function loadPartnerPortalReadiness(input: {
  partnerId: string;
  keyPrefix: string;
  scopes: readonly PartnerScope[];
}): Promise<{
  partner: PartnerPortalReadinessPartnerRow | null;
  activeAssignedPolicies: PartnerPortalReadinessPolicyRow[];
  readiness: PartnerDashboardReadiness;
}> {
  const client = sb();
  if (!client) {
    const readiness = resolvePartnerPortalReadiness({
      authPartnerId: input.partnerId,
      keyPrefix: input.keyPrefix,
      scopes: input.scopes,
      partner: null,
      activeAssignedPolicies: [],
      webhookPortalStatus: null,
    });
    return { partner: null, activeAssignedPolicies: [], readiness };
  }

  const { data: partnerData } = await client
    .from("partners")
    .select("status, is_external, assigned_policy_id, allowed_return_urls")
    .eq("partner_id", input.partnerId)
    .maybeSingle();

  const partner = partnerData as PartnerPortalReadinessPartnerRow | null;
  const assignedId = partner?.assigned_policy_id?.trim() ?? "";

  let activeAssignedPolicies: PartnerPortalReadinessPolicyRow[] = [];
  if (assignedId) {
    const { data: policyRows } = await client
      .from("partner_policies")
      .select("id, rules_json")
      .eq("id", assignedId)
      .eq("partner_id", input.partnerId)
      .eq("status", "active");

    activeAssignedPolicies = (policyRows ?? []) as PartnerPortalReadinessPolicyRow[];
  }

  let webhookPortalStatus: {
    webhook_configured: boolean;
    webhook_delivery_enabled: boolean;
    sandbox_test: { available: boolean };
  } | null = null;

  if (partnerHasWebhooksReadScope(input.scopes)) {
    const status = await getPartnerWebhookPortalStatus({
      partnerId: input.partnerId,
      keyPrefix: input.keyPrefix,
      scopes: input.scopes,
    });
    if (status) {
      webhookPortalStatus = {
        webhook_configured: status.webhook_configured,
        webhook_delivery_enabled: status.webhook_delivery_enabled,
        sandbox_test: { available: status.sandbox_test.available },
      };
    }
  }

  const readiness = resolvePartnerPortalReadiness({
    authPartnerId: input.partnerId,
    keyPrefix: input.keyPrefix,
    scopes: input.scopes,
    partner,
    activeAssignedPolicies,
    webhookPortalStatus,
  });

  return { partner, activeAssignedPolicies, readiness };
}
