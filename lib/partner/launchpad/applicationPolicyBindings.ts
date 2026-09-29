// FILE: lib/partner/launchpad/applicationPolicyBindings.ts
// Application policy bindings — derived from canonical pack registry + DB state.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { buildLaunchpadPolicyId, resolveLaunchpadPolicyTemplate } from "@/lib/partner/launchpad/policyCatalog";
import { resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import {
  applicationProductionAuthorized,
  buildPolicyPresentation,
  buildPolicyPresentationFromTemplateId,
  resolveBindingAvailability,
  type ApplicationPolicyBindingView,
  type CompatibilityHint,
  type PolicyPresentationView,
} from "@/lib/partner/launchpad/policyPresentation";
import { loadIntegrationEvents } from "@/lib/partner/pilotEvidence/load";

export interface ApplicationPolicyBindingRow {
  id: string;
  application_id: string;
  partner_id: string;
  policy_id: string;
  policy_version: number;
  policy_template_id: string;
  binding_role: "primary" | "secondary";
  status: "active" | "retired" | "pending_review";
  sandbox_configured_at: string;
  production_authorized_at: string | null;
}

export interface ApplicationPoliciesSummary {
  application_id: string;
  configured_count: number;
  production_active_count: number;
  sandbox_count: number;
  policy_expansion_observed: boolean;
  initial_policy_template_id: string | null;
  bindings: ApplicationPolicyBindingView[];
  available_to_add: PolicyPresentationView[];
  notice: string;
}

const BINDINGS_TABLE = "partner_launchpad_application_policies";
const ADD_POLICY_RPC = "partner_launchpad_add_application_policy_atomic";

export async function bindingsSchemaReady(): Promise<boolean> {
  try {
    const sb = requireSupabaseAdmin();
    const { error } = await sb.from(BINDINGS_TABLE).select("id", { head: true, count: "exact" }).limit(0);
    return !error;
  } catch {
    return false;
  }
}

function primaryBindingFromApplication(app: LaunchpadApplicationRow): ApplicationPolicyBindingRow {
  return {
    id: `primary:${app.id}`,
    application_id: app.id,
    partner_id: app.partner_id,
    policy_id: app.policy_id,
    policy_version: app.policy_version,
    policy_template_id: app.policy_template_id,
    binding_role: "primary",
    status: "active",
    sandbox_configured_at: app.created_at,
    production_authorized_at: app.production_activated_at ?? null,
  };
}

export async function listApplicationPolicyBindings(
  app: LaunchpadApplicationRow,
): Promise<ApplicationPolicyBindingRow[]> {
  const ready = await bindingsSchemaReady();
  if (!ready) return [primaryBindingFromApplication(app)];

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb
    .from(BINDINGS_TABLE)
    .select("*")
    .eq("application_id", app.id)
    .order("binding_role", { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [primaryBindingFromApplication(app)];
  return data as ApplicationPolicyBindingRow[];
}

function metricsForPolicy(
  events: Awaited<ReturnType<typeof loadIntegrationEvents>>,
  policyId: string,
) {
  const scoped = events.filter((e) => e.policy_id === policyId);
  return {
    request_volume: scoped.filter((e) => e.event_type === "verification_request_created").length,
    verified_receipts: scoped.filter((e) => e.event_type === "receipt_verification_succeeded").length,
    evidence_reuse_count: scoped.filter((e) => e.event_type === "evidence_reuse_accepted").length,
  };
}

function compatibilityHintForPack(packId: string, configured: boolean): CompatibilityHint {
  if (!configured) return "unavailable";
  const pack = resolvePolicyPack(packId);
  if (!pack) return "unavailable";
  if (pack.reuse_evidence_freshness?.allow_reuse === false) return "different_evidence_required";
  return "reusable_available";
}

export async function buildApplicationPoliciesSummary(
  app: LaunchpadApplicationRow,
): Promise<ApplicationPoliciesSummary> {
  const bindings = await listApplicationPolicyBindings(app);
  const events = await loadIntegrationEvents({
    partnerId: app.partner_id,
    applicationId: app.id,
  });

  const productionActive = app.environment === "production" && Boolean(app.production_activated_at);
  const configuredTemplateIds = new Set(bindings.map((b) => b.policy_template_id));

  const bindingViews: ApplicationPolicyBindingView[] = bindings.map((binding) => {
    const pack = resolvePolicyPack(binding.policy_template_id)
      ?? resolvePolicyPack(binding.policy_id);
    const presentation = pack
      ? buildPolicyPresentation(pack)
      : buildPolicyPresentationFromTemplateId(binding.policy_template_id)!;
    const metrics = metricsForPolicy(events, binding.policy_id);
    const availability = resolveBindingAvailability({
      configured: true,
      pack: pack ?? resolvePolicyPack("age_21_retail")!,
      bindingRole: binding.binding_role,
      applicationEnvironment: app.environment,
      applicationProductionActive: productionActive,
      policyDeprecated: binding.status === "retired",
    });

    return {
      ...presentation,
      binding_id: binding.id,
      policy_id: binding.policy_id,
      policy_version: binding.policy_version,
      binding_role: binding.binding_role,
      configured: true,
      availability,
      application_environment: app.environment,
      application_production_active: productionActive,
      application_production_authorized: applicationProductionAuthorized({
        bindingRole: binding.binding_role,
        applicationProductionActive: productionActive,
        pack: pack ?? resolvePolicyPack("age_21_retail")!,
      }),
      compatibility_hint: compatibilityHintForPack(binding.policy_template_id, true),
      request_volume: metrics.request_volume,
      verified_receipts: metrics.verified_receipts,
      evidence_reuse_count: metrics.evidence_reuse_count,
    };
  });

  const { POLICY_PACK_LIST } = await import("@/lib/partner/launchpad/policyPacks");
  const availableToAdd = POLICY_PACK_LIST
    .filter((pack) => !configuredTemplateIds.has(pack.id))
    .map((pack) => buildPolicyPresentation(pack));

  const primary = bindings.find((b) => b.binding_role === "primary") ?? bindings[0];
  const productionActiveCount = bindingViews.filter((b) => b.application_production_authorized).length;
  const sandboxCount = bindingViews.length - productionActiveCount;

  return {
    application_id: app.id,
    configured_count: bindings.length,
    production_active_count: productionActiveCount,
    sandbox_count: sandboxCount,
    policy_expansion_observed: bindings.length > 1,
    initial_policy_template_id: primary?.policy_template_id ?? null,
    bindings: bindingViews,
    available_to_add: availableToAdd,
    notice:
      "Policy bindings reflect configured eligibility questions for this application. Production authorization is per binding and fail-closed.",
  };
}

export async function addApplicationPolicyBinding(input: {
  application: LaunchpadApplicationRow;
  policyTemplateId: string;
}): Promise<
  | { ok: true; policy_id: string; policy_version: number; policy_template_id: string; binding_id: string }
  | { ok: false; code: string }
> {
  const template = resolveLaunchpadPolicyTemplate(input.policyTemplateId);
  const pack = resolvePolicyPack(input.policyTemplateId);
  if (!template || !pack) return { ok: false, code: "policy_template_invalid" };

  const policyId = buildLaunchpadPolicyId(input.application.partner_id, input.policyTemplateId);
  const ready = await bindingsSchemaReady();

  if (!ready) {
    return { ok: false, code: "bindings_schema_unavailable" };
  }

  const sb = requireSupabaseAdmin();
  const { data, error } = await sb.rpc(ADD_POLICY_RPC, {
    p_application_id: input.application.id,
    p_partner_id: input.application.partner_id,
    p_policy_template_id: input.policyTemplateId,
    p_policy_id: policyId,
    p_policy_rules: template.rules,
    p_idempotency_key: null,
  });

  if (error) {
    console.error("[launchpad/add-policy] rpc failed", error.message);
    return { ok: false, code: "add_policy_failed" };
  }

  const row = data as {
    ok?: boolean;
    code?: string;
    binding_id?: string;
    policy_id?: string;
    policy_version?: number;
    policy_template_id?: string;
  };

  if (!row?.ok || !row.policy_id || !row.binding_id) {
    return { ok: false, code: row?.code ?? "add_policy_failed" };
  }

  return {
    ok: true,
    binding_id: row.binding_id,
    policy_id: row.policy_id,
    policy_version: row.policy_version ?? 1,
    policy_template_id: row.policy_template_id ?? input.policyTemplateId,
  };
}
