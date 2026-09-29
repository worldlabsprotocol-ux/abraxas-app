// FILE: lib/partner/launchpad/policyPresentation.ts
// Human-readable presentation mapped from canonical PolicyPack metadata.

import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
  resolvePolicyPack,
  type PolicyPack,
  type PolicyPackId,
  type PolicyPackProductionSuitability,
} from "@/lib/partner/launchpad/policyPacks";

export type PolicyCardAvailability =
  | "active"
  | "available"
  | "sandbox_only"
  | "production_eligible"
  | "configured"
  | "requires_review"
  | "unavailable"
  | "retired";

export type CompatibilityHint =
  | "reusable_available"
  | "refresh_required"
  | "different_evidence_required"
  | "reuse_unavailable"
  | "unavailable";

export interface PolicyPresentationView {
  pack_id: PolicyPackId | string;
  catalog_version: number;
  title: string;
  question: string;
  requested_label: string;
  shared_label: string;
  withheld: string[];
  partner_receives: string;
  partner_does_not_receive: string[];
  disclosed_result: string;
  receipt_claim: string;
  minimum_assurance: string;
  receipt_lifetime_hours: number;
  production_suitability: PolicyPackProductionSuitability;
  policy_production_eligible: boolean;
  reuse_notice: string;
  intended_use_examples: string[];
}

export interface ApplicationPolicyBindingView extends PolicyPresentationView {
  binding_id: string | null;
  policy_id: string;
  policy_version: number;
  binding_role: "primary" | "secondary";
  configured: boolean;
  availability: PolicyCardAvailability;
  application_environment: "sandbox" | "production";
  application_production_active: boolean;
  application_production_authorized: boolean;
  production_status: import("./bindingProduction/contract").BindingProductionStatus;
  production_next_action: string | null;
  compatibility_hint: CompatibilityHint;
  request_volume: number | null;
  verified_receipts: number | null;
  evidence_reuse_count: number | null;
}

export function buildPolicyPresentation(pack: PolicyPack): PolicyPresentationView {
  return {
    pack_id: pack.id,
    catalog_version: pack.catalog_version,
    title: pack.display_name,
    question: pack.holder_explanation,
    requested_label: pack.display_name,
    shared_label: simplifySharedResult(pack.partner_receives, pack.disclosed_result),
    withheld: pack.partner_does_not_receive,
    partner_receives: pack.partner_receives,
    partner_does_not_receive: pack.partner_does_not_receive,
    disclosed_result: pack.disclosed_result,
    receipt_claim: pack.receipt_claim,
    minimum_assurance: pack.minimum_assurance,
    receipt_lifetime_hours: pack.receipt_lifetime_hours,
    production_suitability: pack.production_suitability,
    policy_production_eligible: !policyPackIsSandboxOnly(pack),
    reuse_notice:
      "Existing verified evidence may satisfy eligible requests when assurance, freshness, consent, policy compatibility, and current-validity requirements are met.",
    intended_use_examples: pack.intended_use_examples,
  };
}

export function buildPolicyPresentationFromTemplateId(templateId: string): PolicyPresentationView | null {
  const pack = resolvePolicyPack(templateId);
  return pack ? buildPolicyPresentation(pack) : null;
}

export function buildPolicyPresentationFromPolicyId(policyId: string, templateId?: string): PolicyPresentationView | null {
  if (templateId) {
    const fromTemplate = buildPolicyPresentationFromTemplateId(templateId);
    if (fromTemplate) return fromTemplate;
  }
  const pack = inferPolicyPackFromPolicyId(policyId);
  return pack ? buildPolicyPresentation(pack) : null;
}

export function resolveBindingAvailability(input: {
  configured: boolean;
  pack: PolicyPack;
  bindingRole: "primary" | "secondary";
  applicationEnvironment: "sandbox" | "production";
  applicationProductionActive: boolean;
  policyDeprecated?: boolean;
}): PolicyCardAvailability {
  if (input.policyDeprecated) return "retired";
  if (input.configured) {
    if (input.bindingRole === "primary" && input.applicationProductionActive) return "active";
    if (input.bindingRole === "primary" && input.applicationEnvironment === "sandbox") return "configured";
    if (input.bindingRole === "secondary") return "configured";
    return "requires_review";
  }
  if (policyPackIsSandboxOnly(input.pack)) return "sandbox_only";
  if (input.pack.production_suitability === "production_eligible_after_safety_gate") return "production_eligible";
  return "available";
}

export function applicationProductionAuthorized(input: {
  bindingRole: "primary" | "secondary";
  applicationProductionActive: boolean;
  pack: PolicyPack;
  productionStatus?: import("./bindingProduction/contract").BindingProductionStatus;
  productionAuthorizedAt?: string | null;
}): boolean {
  if (policyPackIsSandboxOnly(input.pack)) return false;
  if (input.productionStatus === "production_suspended") return false;
  if (input.productionStatus === "production_active" && input.productionAuthorizedAt) return true;
  if (input.bindingRole === "primary" && input.applicationProductionActive) return true;
  return false;
}

function simplifySharedResult(partnerReceives: string, disclosedResult: string): string {
  const short = disclosedResult.replace(/_/g, " ");
  if (partnerReceives.length <= 80) return partnerReceives;
  return `Eligibility result (${short})`;
}
