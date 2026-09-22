// FILE: lib/partner/launchpad/policyCatalog.ts
// Launchpad policy templates resolve from the versioned policy-pack catalog.

import { CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/customPolicy";
import {
  POLICY_PACKS,
  POLICY_PACK_LIST,
  resolvePolicyPack,
  type PolicyPack,
  type PolicyPackId,
} from "@/lib/partner/launchpad/policyPacks";
import { pinSandboxInstitutionalProtocolAccessPolicyId } from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import type { PartnerPolicyRules } from "@/lib/policy/types";

export type LaunchpadPolicyTemplateId = PolicyPackId;

export interface LaunchpadPolicyTemplate {
  id: LaunchpadPolicyTemplateId;
  label: string;
  userExplanation: string;
  disclosedResult: string;
  receiptClaim: string;
  receiptLifetimeHours: number;
  reusePolicy: "session" | "time_bound";
  permittedMethods: string[];
  rules: PartnerPolicyRules;
}

function packToTemplate(pack: PolicyPack): LaunchpadPolicyTemplate {
  return {
    id: pack.id,
    label: pack.display_name,
    userExplanation: pack.holder_explanation,
    disclosedResult: pack.disclosed_result,
    receiptClaim: pack.receipt_claim,
    receiptLifetimeHours: pack.receipt_lifetime_hours,
    reusePolicy: pack.reuse_policy,
    permittedMethods: pack.permitted_methods,
    rules: pack.rules,
  };
}

export const LAUNCHPAD_POLICY_TEMPLATES: Record<LaunchpadPolicyTemplateId, LaunchpadPolicyTemplate> =
  Object.fromEntries(POLICY_PACK_LIST.map((pack) => [pack.id, packToTemplate(pack)])) as Record<
    LaunchpadPolicyTemplateId,
    LaunchpadPolicyTemplate
  >;

export const LAUNCHPAD_POLICY_TEMPLATE_LIST = POLICY_PACK_LIST.map(packToTemplate);

export function resolveLaunchpadPolicyTemplate(
  templateId: string,
): LaunchpadPolicyTemplate | null {
  if (templateId === CUSTOM_LAUNCHPAD_POLICY_TEMPLATE_ID) return null;
  const pack = resolvePolicyPack(templateId);
  return pack ? packToTemplate(pack) : null;
}

export function buildLaunchpadPolicyId(partnerId: string, templateId: string): string {
  return pinSandboxInstitutionalProtocolAccessPolicyId(
    templateId,
    `${partnerId}-${templateId}-v1`,
  );
}

export { POLICY_PACKS };
