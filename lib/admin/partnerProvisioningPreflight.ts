// FILE: lib/admin/partnerProvisioningPreflight.ts
// Read-only boolean partner/policy preflight for Production external partner readiness.

import { createClient } from "@supabase/supabase-js";
import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";

const STALE_HOST = "abraxas-app.vercel.app";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

export const PROVISIONING_PREFLIGHT_KEYS = new Set([
  "ok",
  "query_valid",
  "partner_row_exists",
  "partner_status_usable",
  "partner_is_external",
  "return_urls_configured",
  "return_url_allowlisted",
  "policy_row_exists",
  "policy_active",
  "policy_partner_match",
  "policy_not_sandbox",
  "onboarding_fields_present",
] as const);

export type ProvisioningPreflightReport = Record<
  (typeof PROVISIONING_PREFLIGHT_KEYS extends Set<infer K> ? K : never),
  boolean
>;

interface PartnerPreflightRow {
  partner_id: string;
  status: string | null;
  allowed_return_urls: string[] | null;
  is_external: boolean | null;
  onboarding_checklist: unknown;
}

interface PolicyPreflightRow {
  id: string;
  partner_id: string;
  status: string;
  rules_json: Record<string, unknown> | null;
}

export interface PartnerProvisioningPreflightDeps {
  loadPartner: (partnerId: string) => Promise<PartnerPreflightRow | null>;
  loadPolicy: (policyId: string) => Promise<PolicyPreflightRow | null>;
  isReturnUrlAllowed: (partnerId: string, returnUrl: string) => Promise<boolean>;
}

function emptyReport(): ProvisioningPreflightReport {
  return {
    ok: false,
    query_valid: false,
    partner_row_exists: false,
    partner_status_usable: false,
    partner_is_external: false,
    return_urls_configured: false,
    return_url_allowlisted: false,
    policy_row_exists: false,
    policy_active: false,
    policy_partner_match: false,
    policy_not_sandbox: false,
    onboarding_fields_present: false,
  };
}

function isQueryValid(partnerId: string, policyId: string, returnUrl: string): boolean {
  if (!partnerId || !policyId || !returnUrl) return false;
  if (!ID_PATTERN.test(partnerId) || !ID_PATTERN.test(policyId)) return false;

  try {
    const parsed = new URL(returnUrl);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function policyRulesAreSandboxOnly(rulesJson: unknown): boolean {
  return (
    rulesJson !== null
    && typeof rulesJson === "object"
    && (rulesJson as Record<string, unknown>).sandbox_only === true
  );
}

function partnerStatusUsable(status: string | null | undefined): boolean {
  return status === "active" || status === "pilot";
}

function returnUrlsConfigured(urls: string[] | null | undefined): boolean {
  if (!urls?.length) return false;
  return !urls.some((entry) => entry.includes(STALE_HOST));
}

function onboardingFieldsPresent(partner: PartnerPreflightRow): boolean {
  return (
    "is_external" in partner
    && "onboarding_checklist" in partner
    && partner.is_external !== undefined
  );
}

function buildSupabaseDeps(): PartnerProvisioningPreflightDeps | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });

  return {
    async loadPartner(partnerId: string): Promise<PartnerPreflightRow | null> {
      const { data, error } = await sb
        .from("partners")
        .select("partner_id, status, allowed_return_urls, is_external, onboarding_checklist")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as PartnerPreflightRow | null;
    },
    async loadPolicy(policyId: string): Promise<PolicyPreflightRow | null> {
      const { data, error } = await sb
        .from("partner_policies")
        .select("id, partner_id, status, rules_json")
        .eq("id", policyId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as PolicyPreflightRow | null;
    },
    isReturnUrlAllowed,
  };
}

export async function evaluatePartnerProvisioningPreflight(
  input: { partnerId: string; policyId: string; returnUrl: string },
  depsOverride?: PartnerProvisioningPreflightDeps,
): Promise<ProvisioningPreflightReport> {
  const partnerId = input.partnerId.trim();
  const policyId = input.policyId.trim();
  const returnUrl = input.returnUrl.trim();

  const report = emptyReport();
  report.query_valid = isQueryValid(partnerId, policyId, returnUrl);
  if (!report.query_valid) {
    return report;
  }

  const deps = depsOverride ?? buildSupabaseDeps();
  if (!deps) {
    return report;
  }

  const [partner, policy] = await Promise.all([
    deps.loadPartner(partnerId),
    deps.loadPolicy(policyId),
  ]);

  report.partner_row_exists = partner !== null;
  if (partner) {
    report.partner_status_usable = partnerStatusUsable(partner.status);
    report.partner_is_external = partner.is_external === true;
    report.return_urls_configured = returnUrlsConfigured(partner.allowed_return_urls);
    report.onboarding_fields_present = onboardingFieldsPresent(partner);
  }

  report.policy_row_exists = policy !== null;
  if (policy) {
    report.policy_active = policy.status === "active";
    report.policy_partner_match = policy.partner_id === partnerId;
    report.policy_not_sandbox =
      !isSandboxPolicyId(policyId)
      && !policyRulesAreSandboxOnly(policy.rules_json);
  }

  if (report.partner_row_exists) {
    report.return_url_allowlisted = await deps.isReturnUrlAllowed(partnerId, returnUrl);
  }

  report.ok =
    report.query_valid
    && report.partner_row_exists
    && report.partner_status_usable
    && report.partner_is_external
    && report.return_urls_configured
    && report.return_url_allowlisted
    && report.policy_row_exists
    && report.policy_active
    && report.policy_partner_match
    && report.policy_not_sandbox
    && report.onboarding_fields_present;

  return report;
}

export function provisioningPreflightResponseHasNoSecrets(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== PROVISIONING_PREFLIGHT_KEYS.size) return false;
  for (const key of keys) {
    if (!PROVISIONING_PREFLIGHT_KEYS.has(key as never)) return false;
    if (typeof record[key] !== "boolean") return false;
  }
  return true;
}
