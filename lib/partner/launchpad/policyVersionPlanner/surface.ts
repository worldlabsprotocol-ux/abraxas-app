// FILE: lib/partner/launchpad/policyVersionPlanner/surface.ts
// Partner-visible policy version surfaces derived from the catalog. No internals.

import { planEligibilityMethods } from "@/lib/partner/eligibilityMethods";
import {
  inferPolicyPackFromPolicyId,
  policyPackIsSandboxOnly,
  resolvePolicyPack,
  type PolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import { resolveDisclosureProfile } from "@/lib/privacy/selectiveDisclosure";
import { PLANNER_ALLOWED_OUTPUT_FIELDS } from "@/lib/privacy/selectiveDisclosure/contract";
import {
  POLICY_VERSION_PATHS,
  type PolicyVersionPathId,
} from "./contract";

export type PolicyVersionStatus = "current" | "planning" | "deprecated" | "unavailable";

export interface PolicyVersionPathSupport {
  webhooks: boolean;
  trading: boolean;
  payment: boolean;
  wallet_standard: boolean;
  solana: boolean;
  starter_kit: boolean;
}

export interface PolicyVersionSurface {
  pack_id: PolicyPackId | null;
  version: number;
  display_name: string;
  result_category: string;
  method_category: string;
  partner_receives: string;
  withheld: string[];
  allowed_output_fields: string[];
  environment_label: string;
  sandbox_only: boolean;
  production_review: boolean;
  paths: PolicyVersionPathSupport;
  status: PolicyVersionStatus;
}

export interface PolicyVersionSuccessorSpec {
  pack_id: PolicyPackId;
  version: number;
  status: Exclude<PolicyVersionStatus, "current">;
  result_category?: string;
  method_category?: string;
  partner_receives?: string;
  withheld?: readonly string[];
  allowed_output_fields?: readonly string[];
  sandbox_only?: boolean;
  paths?: Partial<PolicyVersionPathSupport>;
}

export function methodCategoryForPack(pack: PolicyPack): string {
  const plan = planEligibilityMethods({ pack, privacyPreservingAvailable: true });
  const primary = plan.methods.find((method) => method.primary && method.qualifies)
    ?? plan.methods.find((method) => method.qualifies && method.id !== "account_login");
  return primary ? primary.label : "Qualifying policy method";
}

export function pathSupportForPack(pack: PolicyPack): PolicyVersionPathSupport {
  const id = pack.id;
  return {
    webhooks: true,
    trading: id === "wallet_control" || id === "collector_redemption",
    payment: id === "age_18_retail" || id === "age_21_retail" || id === "membership_credential",
    wallet_standard: id === "wallet_control",
    solana: id === "wallet_control" || id === "sandbox_economic_demo",
    starter_kit: true,
  };
}

export function environmentLabel(sandboxOnly: boolean): string {
  return sandboxOnly ? "Sandbox / test" : "Reviewed Production after Launchpad review";
}

export function surfaceFromPack(input: {
  pack: PolicyPack;
  version: number;
  status: PolicyVersionStatus;
}): PolicyVersionSurface {
  const sandboxOnly = policyPackIsSandboxOnly(input.pack);
  const disclosure = resolveDisclosureProfile(input.pack.id);
  const allowedOutput = disclosure.ok ? [...PLANNER_ALLOWED_OUTPUT_FIELDS] : [];
  return {
    pack_id: input.pack.id,
    version: input.version,
    display_name: input.pack.display_name,
    result_category: input.pack.disclosed_result,
    method_category: methodCategoryForPack(input.pack),
    partner_receives: input.pack.partner_receives,
    withheld: input.pack.partner_does_not_receive.slice(),
    allowed_output_fields: allowedOutput,
    environment_label: environmentLabel(sandboxOnly),
    sandbox_only: sandboxOnly,
    production_review: !sandboxOnly,
    paths: pathSupportForPack(input.pack),
    status: input.status,
  };
}

export function applySuccessor(base: PolicyVersionSurface, spec: PolicyVersionSuccessorSpec): PolicyVersionSurface {
  const sandboxOnly = spec.sandbox_only ?? base.sandbox_only;
  const paths: PolicyVersionPathSupport = { ...base.paths };
  POLICY_VERSION_PATHS.forEach((id: PolicyVersionPathId) => {
    if (spec.paths && spec.paths[id] != null) paths[id] = spec.paths[id] as boolean;
  });
  return {
    pack_id: spec.pack_id,
    version: spec.version,
    display_name: base.display_name,
    result_category: spec.result_category ?? base.result_category,
    method_category: spec.method_category ?? base.method_category,
    partner_receives: spec.partner_receives ?? base.partner_receives,
    withheld: spec.withheld ? spec.withheld.slice() : base.withheld.slice(),
    allowed_output_fields: spec.allowed_output_fields
      ? spec.allowed_output_fields.slice()
      : base.allowed_output_fields.slice(),
    environment_label: environmentLabel(sandboxOnly),
    sandbox_only: sandboxOnly,
    production_review: !sandboxOnly,
    paths,
    status: spec.status,
  };
}

export function resolvePackForPlanner(policyTemplateId: string, policyId: string): PolicyPack | null {
  return resolvePolicyPack(policyTemplateId) ?? inferPolicyPackFromPolicyId(policyId);
}

export const POLICY_PACK_VERSION_SUCCESSORS: PolicyVersionSuccessorSpec[] = [
  {
    pack_id: "age_21_retail",
    version: 2,
    status: "planning",
  },
  {
    pack_id: "residency_us",
    version: 2,
    status: "planning",
    method_category: "Privacy-preserving residency check",
  },
  {
    pack_id: "identity_liveness",
    version: 2,
    status: "planning",
    result_category: "identity_liveness_eligible_reviewed",
    partner_receives: "A reviewed identity-plus-liveness policy result. Not documents or a legal finding.",
    withheld: ["date of birth", "government ID images", "legal name", "email", "biometric templates"],
    sandbox_only: false,
  },
];

export const POLICY_PACK_PINNED_STATUS_OVERRIDES: Partial<Record<PolicyPackId, PolicyVersionStatus>> = {
  sandbox_economic_demo: "deprecated",
};
