// FILE: lib/partner/launchpad/bindingProduction/evaluate.ts
// Preconditions for binding-scoped production requests. Fail closed.

import { buildGoLiveReadinessView } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import type { GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import { buildPolicyVersionPlannerView } from "@/lib/partner/launchpad/policyVersionPlanner/view";
import { policyPackIsSandboxOnly, resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import type { ApplicationPolicyBindingRow } from "@/lib/partner/launchpad/applicationPolicyBindings";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { BindingProductionStatus } from "./contract";

export type BindingProductionBlocker =
  | "binding_not_found"
  | "binding_not_active"
  | "primary_uses_app_review"
  | "application_production_not_active"
  | "binding_already_production_active"
  | "binding_production_suspended"
  | "policy_not_production_eligible"
  | "policy_version_mismatch"
  | "policy_retired"
  | "readiness_incomplete"
  | "pending_request_exists";

export interface BindingProductionReadinessResult {
  ok: boolean;
  blockers: BindingProductionBlocker[];
  can_request: boolean;
  production_status: BindingProductionStatus;
}

export function evaluateBindingProductionReadiness(input: {
  application: LaunchpadApplicationRow;
  binding: ApplicationPolicyBindingRow;
  evidence: GoLiveEvidence;
  productionStatus: BindingProductionStatus;
  hasPendingRequest: boolean;
  policyEventsForBinding?: { verified_receipts: number; request_volume: number };
}): BindingProductionReadinessResult {
  const blockers: BindingProductionBlocker[] = [];
  const pack = resolvePolicyPack(input.binding.policy_template_id);

  if (input.binding.status !== "active") blockers.push("binding_not_active");
  if (input.binding.binding_role === "primary") blockers.push("primary_uses_app_review");
  if (!input.application.production_activated_at || input.application.environment !== "production") {
    blockers.push("application_production_not_active");
  }
  if (!pack || policyPackIsSandboxOnly(pack)) blockers.push("policy_not_production_eligible");
  if (input.binding.status === "retired") blockers.push("policy_retired");

  if (input.productionStatus === "production_active") blockers.push("binding_already_production_active");
  if (input.productionStatus === "production_suspended") blockers.push("binding_production_suspended");
  if (input.hasPendingRequest) blockers.push("pending_request_exists");

  const view = buildGoLiveReadinessView(input.evidence);
  const bindingVerified = (input.policyEventsForBinding?.verified_receipts ?? 0) > 0;
  const bindingRequests = (input.policyEventsForBinding?.request_volume ?? 0) > 0;
  if (!bindingVerified && !bindingRequests) {
    if (view.checks.some((c) => c.required && c.status !== "pass")) {
      blockers.push("readiness_incomplete");
    }
  }

  const plannerApp = {
    ...input.application,
    policy_id: input.binding.policy_id,
    policy_version: input.binding.policy_version,
    policy_template_id: input.binding.policy_template_id,
  };
  const planner = buildPolicyVersionPlannerView(plannerApp);
  if (planner.availability === "deprecated" || planner.availability === "catalog_unknown") {
    blockers.push("policy_version_mismatch");
  }

  const unique = Array.from(new Set(blockers));
  return {
    ok: unique.length === 0,
    blockers: unique,
    can_request: unique.length === 0
      && (input.productionStatus === "sandbox_only" || input.productionStatus === "production_rejected"),
    production_status: input.productionStatus,
  };
}

export function bindingProductionPartnerNextAction(input: {
  productionStatus: BindingProductionStatus;
  canRequest: boolean;
  applicationProductionActive: boolean;
}): string | null {
  if (!input.applicationProductionActive) return "complete_application_production";
  if (input.productionStatus === "production_requested") return "await_binding_production_review";
  if (input.productionStatus === "production_rejected" && input.canRequest) return "request_binding_production";
  if (input.productionStatus === "sandbox_only" && input.canRequest) return "request_binding_production";
  if (input.productionStatus === "production_suspended") return "contact_operator_reactivation";
  return null;
}
