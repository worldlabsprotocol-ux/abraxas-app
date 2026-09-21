// FILE: lib/partner/launchpad/productionReview/evaluate.ts
// Server re-check before an operator Production-review decision. Client fields are never authority.

import { policyPackIsSandboxOnly, resolvePolicyPack } from "@/lib/partner/launchpad/policyPacks";
import { CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";
import { buildGoLiveReadinessView, type GoLiveEvidence } from "@/lib/partner/launchpad/goLiveReadiness/evaluate";
import { buildPolicyVersionPlannerView } from "@/lib/partner/launchpad/policyVersionPlanner/view";
import { NETWORK_CAPABILITY_REGISTRY } from "@/lib/partner/networkCapability/registry";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { ProductionReviewBlocker } from "./contract";

export interface ProductionReviewGateInput {
  request: {
    id: string;
    application_id: string;
    partner_id: string;
    status: string;
  };
  application: LaunchpadApplicationRow;
  evidence: GoLiveEvidence;
  durableSchemaReady: boolean;
  displayedCapabilities?: readonly string[];
  requestedNetworkIds?: readonly string[];
}

export interface ProductionReviewGateResult {
  ok: boolean;
  blockers: ProductionReviewBlocker[];
  readiness_class: string;
  policy_compatibility: string;
  webhook_health_class: string;
  test_console_class: string;
  network_postures: Array<{ network_id: string; status: string; environment: string }>;
  selected_capabilities: string[];
  issues_production_key: false;
  activates_mainnet: false;
  executes: false;
}

function networksForCapabilities(capabilities: readonly string[]) {
  return NETWORK_CAPABILITY_REGISTRY.filter((entry) => {
    if (entry.ecosystem === "solana") {
      return capabilities.includes("solana_gate") || capabilities.includes("onchain_protocol_gate") || capabilities.includes("solana_onchain_eligibility_gate");
    }
    if (entry.ecosystem === "trading_venue") return capabilities.includes("trading_venue");
    if (entry.ecosystem === "arc_circle") return capabilities.includes("payment_authorization");
    if (entry.ecosystem === "evm") {
      return capabilities.includes("evm_partner_adapter") || capabilities.includes("onchain_protocol_gate");
    }
    return false;
  });
}

export function evaluateProductionReviewGates(input: ProductionReviewGateInput): ProductionReviewGateResult {
  const blockers: ProductionReviewBlocker[] = [];
  if (input.request.status !== "pending") blockers.push("request_not_pending");
  if (input.application.id !== input.request.application_id || input.application.partner_id !== input.request.partner_id) {
    blockers.push("app_mismatch");
  }
  if (input.application.status !== "active") blockers.push("app_not_active");
  if (input.application.status === "suspended") blockers.push("revocation_unresolved");
  if (!input.durableSchemaReady) blockers.push("durable_schema_missing");

  const view = buildGoLiveReadinessView(input.evidence, input.displayedCapabilities);
  const requiredFail = view.checks.some((check) => check.required && check.status !== "pass");
  if (requiredFail) blockers.push("readiness_incomplete");

  const pack = resolvePolicyPack(input.application.policy_template_id);
  const sandboxOnly = input.application.policy_template_id === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID
    || (pack ? policyPackIsSandboxOnly(pack) : true);
  if (sandboxOnly) blockers.push("sandbox_only_policy");

  if (
    input.application.policy_id !== input.evidence.policyId
    || input.application.policy_version !== input.evidence.policyVersion
  ) {
    blockers.push("policy_version_mismatch");
  }

  const planner = buildPolicyVersionPlannerView(input.application);
  if (planner.availability === "deprecated" || planner.availability === "catalog_unknown") {
    blockers.push("policy_version_mismatch");
  }

  const capabilities = view.selected_capabilities;
  const requested = input.requestedNetworkIds?.length
    ? NETWORK_CAPABILITY_REGISTRY.filter((entry) => input.requestedNetworkIds!.includes(entry.network_id))
    : networksForCapabilities(capabilities);
  const mainnet = requested.filter((entry) => entry.environment === "mainnet");
  for (const entry of mainnet) {
    if (entry.status === "disabled") blockers.push("network_disabled");
    else if (entry.status === "planned") blockers.push("network_planned");
    else if (entry.status !== "configured" && entry.status !== "available" && entry.status !== "production_review_required") {
      blockers.push("network_unconfigured");
    }
  }

  const unique = Array.from(new Set(blockers));
  const webhook = input.evidence.webhookConfigured
    ? (input.evidence.latestDeliveryStatus ?? "configured")
    : "not_configured";
  const consoleCheck = view.checks.find((check) => check.id === "test_console");

  return {
    ok: unique.length === 0,
    blockers: unique,
    readiness_class: view.lifecycle,
    policy_compatibility: planner.availability,
    webhook_health_class: webhook,
    test_console_class: consoleCheck?.status ?? "action_required",
    network_postures: requested.map((entry) => ({
      network_id: entry.network_id,
      status: entry.status,
      environment: entry.environment,
    })),
    selected_capabilities: [...capabilities],
    issues_production_key: false,
    activates_mainnet: false,
    executes: false,
  };
}
