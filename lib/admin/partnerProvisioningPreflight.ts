// FILE: lib/admin/partnerProvisioningPreflight.ts
// Read-only boolean partner/policy preflight for Production external partner readiness.

import { createClient } from "@supabase/supabase-js";
import { ACTIVATE_PROMOTION_CHECK_KEYS } from "@/lib/admin/partnerProductionEnvPromotion";
import { isReturnUrlAllowed } from "@/lib/connect/returnUrlAllowlist";
import { normalizePartnerReturnUrlForAllowlist } from "@/lib/connect/returnUrlAllowlistSemantics";
import { isSandboxPolicyId } from "@/lib/partner/sandboxPartner";

const STALE_HOST = "abraxas-app.vercel.app";
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,127}$/;

export const PROVISIONING_PREFLIGHT_KEYS = new Set([
  "ok",
  ...ACTIVATE_PROMOTION_CHECK_KEYS,
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
  assigned_policy_id?: string | null;
}

interface PolicyPreflightRow {
  id: string;
  partner_id: string;
  status: string;
  rules_json: Record<string, unknown> | null;
}

export interface PolicyActivationPreflightContext {
  familyExists: boolean;
  activeCount: number;
  activePolicy: PolicyPreflightRow | null;
}

export interface PartnerProvisioningPreflightDeps {
  loadPartner: (partnerId: string) => Promise<PartnerPreflightRow | null>;
  isReturnUrlAllowed: (partnerId: string, returnUrl: string) => Promise<boolean>;
  loadPolicyActivationContext?: (policyId: string) => Promise<PolicyActivationPreflightContext>;
  /** @deprecated Use loadPolicyActivationContext for post-055 policy families. */
  loadPolicy?: (policyId: string) => Promise<PolicyPreflightRow | null>;
}

function emptyReport(): ProvisioningPreflightReport {
  return {
    ok: false,
    query_valid: false,
    return_url_syntax_valid: false,
    partner_row_exists: false,
    partner_is_external: false,
    partner_status_usable: false,
    return_urls_configured: false,
    return_url_request_allowlisted: false,
    all_stored_return_urls_compliant: false,
    policy_row_exists: false,
    policy_active: false,
    policy_partner_match: false,
    policy_assigned_match: false,
    policy_not_sandbox: false,
    onboarding_fields_present: false,
  };
}

function isQueryValid(partnerId: string, policyId: string, returnUrl: string): boolean {
  if (!partnerId || !policyId || !returnUrl.trim()) return false;
  return ID_PATTERN.test(partnerId) && ID_PATTERN.test(policyId);
}

function returnUrlSyntaxValid(returnUrl: string): boolean {
  const trimmed = returnUrl.trim();
  return trimmed.toLowerCase().startsWith("https://")
    && normalizePartnerReturnUrlForAllowlist(trimmed) !== null;
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

function storedReturnUrlProductionCompliant(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!trimmed.toLowerCase().startsWith("https://")) return false;
  if (trimmed.includes(STALE_HOST)) return false;
  return normalizePartnerReturnUrlForAllowlist(trimmed) !== null;
}

function allStoredReturnUrlsCompliant(urls: string[] | null | undefined): boolean {
  if (!urls?.length) return false;
  return urls.every(storedReturnUrlProductionCompliant);
}

function onboardingFieldsPresent(partner: PartnerPreflightRow): boolean {
  return partner.is_external !== null && partner.onboarding_checklist !== null;
}

async function resolvePolicyActivationContext(
  policyId: string,
  deps: PartnerProvisioningPreflightDeps,
): Promise<PolicyActivationPreflightContext> {
  if (deps.loadPolicyActivationContext) {
    return deps.loadPolicyActivationContext(policyId);
  }

  if (deps.loadPolicy) {
    const policy = await deps.loadPolicy(policyId);
    if (!policy) {
      return { familyExists: false, activeCount: 0, activePolicy: null };
    }

    const activeCount = policy.status === "active" ? 1 : 0;
    return {
      familyExists: true,
      activeCount,
      activePolicy: activeCount === 1 ? policy : null,
    };
  }

  return { familyExists: false, activeCount: 0, activePolicy: null };
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
        .select("partner_id, status, allowed_return_urls, is_external, onboarding_checklist, assigned_policy_id")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as PartnerPreflightRow | null;
    },
    async loadPolicyActivationContext(policyId: string): Promise<PolicyActivationPreflightContext> {
      const { count: familyCount, error: familyError } = await sb
        .from("partner_policies")
        .select("id", { count: "exact", head: true })
        .eq("id", policyId);
      if (familyError) throw new Error(familyError.message);

      const { count: activeCount, error: activeError } = await sb
        .from("partner_policies")
        .select("id", { count: "exact", head: true })
        .eq("id", policyId)
        .eq("status", "active");
      if (activeError) throw new Error(activeError.message);

      const resolvedActiveCount = activeCount ?? 0;
      if (resolvedActiveCount !== 1) {
        return {
          familyExists: (familyCount ?? 0) > 0,
          activeCount: resolvedActiveCount,
          activePolicy: null,
        };
      }

      const { data, error } = await sb
        .from("partner_policies")
        .select("id, partner_id, status, rules_json")
        .eq("id", policyId)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw new Error(error.message);

      return {
        familyExists: (familyCount ?? 0) > 0,
        activeCount: resolvedActiveCount,
        activePolicy: data as PolicyPreflightRow | null,
      };
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
  report.return_url_syntax_valid = report.query_valid && returnUrlSyntaxValid(returnUrl);
  if (!report.query_valid) {
    return report;
  }

  const deps = depsOverride ?? buildSupabaseDeps();
  if (!deps) {
    return report;
  }

  const [partner, policyContext] = await Promise.all([
    deps.loadPartner(partnerId),
    resolvePolicyActivationContext(policyId, deps),
  ]);

  report.partner_row_exists = partner !== null;
  if (partner) {
    report.partner_status_usable = partnerStatusUsable(partner.status);
    report.partner_is_external = partner.is_external === true;
    report.return_urls_configured = returnUrlsConfigured(partner.allowed_return_urls);
    report.all_stored_return_urls_compliant = allStoredReturnUrlsCompliant(partner.allowed_return_urls);
    report.onboarding_fields_present = onboardingFieldsPresent(partner);
    report.policy_assigned_match = partner.assigned_policy_id === policyId;
  }

  report.policy_row_exists = policyContext.familyExists;
  report.policy_active = policyContext.activeCount === 1;

  if (policyContext.activeCount === 1 && policyContext.activePolicy) {
    const activePolicy = policyContext.activePolicy;
    report.policy_partner_match = activePolicy.partner_id === partnerId;
    report.policy_not_sandbox =
      !isSandboxPolicyId(policyId)
      && !policyRulesAreSandboxOnly(activePolicy.rules_json);
  }

  if (report.partner_row_exists) {
    report.return_url_request_allowlisted = await deps.isReturnUrlAllowed(partnerId, returnUrl);
  }

  report.ok = ACTIVATE_PROMOTION_CHECK_KEYS.every((key) => report[key] === true);

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
