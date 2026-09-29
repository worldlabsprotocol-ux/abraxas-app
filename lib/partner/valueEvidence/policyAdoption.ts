// FILE: lib/partner/valueEvidence/policyAdoption.ts
// Operator policy adoption aggregates — factual counts only.

import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { POLICY_PACK_LIST, policyPackIsSandboxOnly, resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { loadIntegrationEvents } from "@/lib/partner/pilotEvidence/load";
import {
  bindingsSchemaReady,
  listApplicationPolicyBindings,
} from "@/lib/partner/launchpad/applicationPolicyBindings";

export interface PolicyAdoptionAggregate {
  policy_id: string;
  policy_version: number | "unavailable";
  pack_id: string;
  result_family: string;
  sandbox_applications: number;
  production_applications: number;
  request_volume: number | "unavailable";
  verified_receipts: number | "unavailable";
  evidence_reuse_count: number | "unavailable";
}

export interface PolicyAdoptionSummary {
  canonical_policies_available: number;
  production_eligible_policies: number;
  actively_consumed_policies: number;
  applications_with_multiple_policies: number;
  production_applications_with_multiple_policies: number;
  partners_with_multiple_configured_policies: number;
  partners_with_multiple_production_policies: number;
  policy_expansion_observed: boolean;
  evidence_reuse_observed: boolean;
  aggregates: PolicyAdoptionAggregate[];
  notice: string;
}

export async function buildPolicyAdoptionSummary(input: {
  applications: LaunchpadApplicationRow[];
}): Promise<PolicyAdoptionSummary> {
  const bindingsReady = await bindingsSchemaReady();
  const packMetrics = new Map<string, PolicyAdoptionAggregate>();
  const partnerConfigured = new Map<string, Set<string>>();
  const partnerProduction = new Map<string, Set<string>>();
  let applicationsWithMultiple = 0;
  let productionAppsWithMultiple = 0;
  let evidenceReuseObserved = false;
  const consumedPacks = new Set<string>();

  for (const app of input.applications) {
    const productionActive = app.environment === "production" && Boolean(app.production_activated_at);
    const bindings = bindingsReady
      ? await listApplicationPolicyBindings(app)
      : [{
          policy_id: app.policy_id,
          policy_version: app.policy_version,
          policy_template_id: app.policy_template_id,
          binding_role: "primary" as const,
          production_status: productionActive ? "production_active" as const : "sandbox_only" as const,
          production_authorized_at: app.production_activated_at ?? null,
        }];

    if (bindings.length > 1) {
      applicationsWithMultiple += 1;
      if (productionActive) productionAppsWithMultiple += 1;
    }

    const configured = partnerConfigured.get(app.partner_id) ?? new Set<string>();
    const production = partnerProduction.get(app.partner_id) ?? new Set<string>();

    for (const binding of bindings) {
      configured.add(binding.policy_template_id);
      const bindingProductionActive = binding.production_status === "production_active"
        || (binding.binding_role === "primary" && productionActive && Boolean(binding.production_authorized_at));
      if (bindingProductionActive) {
        production.add(binding.policy_template_id);
      }

      const pack = resolvePolicyPack(binding.policy_template_id);
      const packId = pack?.id ?? binding.policy_template_id;
      const resultFamily = pack?.disclosed_result ?? "unavailable";
      const key = `${packId}:${binding.policy_version}`;

      const existing = packMetrics.get(key) ?? {
        policy_id: binding.policy_id,
        policy_version: binding.policy_version,
        pack_id: packId,
        result_family: resultFamily,
        sandbox_applications: 0,
        production_applications: 0,
        request_volume: 0,
        verified_receipts: 0,
        evidence_reuse_count: 0,
      };

      if (productionActive && binding.binding_role === "primary") {
        existing.production_applications += 1;
      } else {
        existing.sandbox_applications += 1;
      }
      packMetrics.set(key, existing);
    }

    partnerConfigured.set(app.partner_id, configured);
    partnerProduction.set(app.partner_id, production);

    const events = await loadIntegrationEvents({
      partnerId: app.partner_id,
      applicationId: app.id,
    });
    for (const event of events) {
      if (!event.policy_id) continue;
      const templateId = bindings.find((b) => b.policy_id === event.policy_id)?.policy_template_id
        ?? app.policy_template_id;
      const pack = resolvePolicyPack(templateId);
      const packId = pack?.id ?? templateId;
      const key = `${packId}:${bindings.find((b) => b.policy_id === event.policy_id)?.policy_version ?? 1}`;
      const row = packMetrics.get(key);
      if (!row) continue;

      if (event.event_type === "verification_request_created") {
        row.request_volume = (row.request_volume as number) + 1;
        consumedPacks.add(packId);
      }
      if (event.event_type === "receipt_verification_succeeded") {
        row.verified_receipts = (row.verified_receipts as number) + 1;
        consumedPacks.add(packId);
      }
      if (event.event_type === "evidence_reuse_accepted") {
        row.evidence_reuse_count = (row.evidence_reuse_count as number) + 1;
        evidenceReuseObserved = true;
      }
    }
  }

  const partnersMultiConfigured = Array.from(partnerConfigured.values()).filter((s) => s.size > 1).length;
  const partnersMultiProduction = Array.from(partnerProduction.values()).filter((s) => s.size > 1).length;

  return {
    canonical_policies_available: POLICY_PACK_LIST.length,
    production_eligible_policies: POLICY_PACK_LIST.filter((p) => !policyPackIsSandboxOnly(p)).length,
    actively_consumed_policies: consumedPacks.size,
    applications_with_multiple_policies: applicationsWithMultiple,
    production_applications_with_multiple_policies: productionAppsWithMultiple,
    partners_with_multiple_configured_policies: partnersMultiConfigured,
    partners_with_multiple_production_policies: partnersMultiProduction,
    policy_expansion_observed: applicationsWithMultiple > 0 || partnersMultiConfigured > 0,
    evidence_reuse_observed: evidenceReuseObserved,
    aggregates: Array.from(packMetrics.values()).sort((a, b) => a.pack_id.localeCompare(b.pack_id)),
    notice: "Counts reflect configured bindings and measured integration events. Not revenue or NRR.",
  };
}
