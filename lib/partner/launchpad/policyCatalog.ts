// FILE: lib/partner/launchpad/policyCatalog.ts
// Versioned predefined policy templates — partners cannot submit executable policy code.

import type { PartnerPolicyRules } from "@/lib/policy/types";

export type LaunchpadPolicyTemplateId =
  | "age_18_retail"
  | "age_21_retail"
  | "membership_credential"
  | "residency_us";

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

const SANDBOX_BASE: Pick<PartnerPolicyRules, "sandbox_only"> = { sandbox_only: true };

export const LAUNCHPAD_POLICY_TEMPLATES: Record<LaunchpadPolicyTemplateId, LaunchpadPolicyTemplate> = {
  age_18_retail: {
    id: "age_18_retail",
    label: "Age over 18",
    userExplanation: "Confirm the visitor is at least 18 without sharing a birth date.",
    disclosedResult: "age_eligible_18",
    receiptClaim: "age_threshold_met",
    receiptLifetimeHours: 24,
    reusePolicy: "time_bound",
    permittedMethods: ["passport", "self_attestation"],
    rules: {
      ...SANDBOX_BASE,
      minimum_age: 18,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L1" }],
    },
  },
  age_21_retail: {
    id: "age_21_retail",
    label: "Age over 21",
    userExplanation: "Confirm the visitor is at least 21 without sharing a birth date.",
    disclosedResult: "age_eligible_21",
    receiptClaim: "age_threshold_met",
    receiptLifetimeHours: 24,
    reusePolicy: "time_bound",
    permittedMethods: ["passport"],
    rules: {
      ...SANDBOX_BASE,
      minimum_age: 21,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    },
  },
  membership_credential: {
    id: "membership_credential",
    label: "Credential possession",
    userExplanation: "Confirm the visitor holds an active Abraxas credential.",
    disclosedResult: "credential_active",
    receiptClaim: "identity_verified",
    receiptLifetimeHours: 12,
    reusePolicy: "session",
    permittedMethods: ["passport"],
    rules: {
      ...SANDBOX_BASE,
      required_claims: [{ claim_type: "identity_verified", min_assurance: "L2" }],
    },
  },
  residency_us: {
    id: "residency_us",
    label: "United States residency",
    userExplanation: "Confirm United States residency without exposing full identity documents.",
    disclosedResult: "residency_us",
    receiptClaim: "jurisdiction_met",
    receiptLifetimeHours: 48,
    reusePolicy: "time_bound",
    permittedMethods: ["passport"],
    rules: {
      ...SANDBOX_BASE,
      required_claims: [
        { claim_type: "identity_verified", min_assurance: "L2" },
        { claim_type: "screening_outcome", min_assurance: "L1" },
      ],
    },
  },
};

export const LAUNCHPAD_POLICY_TEMPLATE_LIST = Object.values(LAUNCHPAD_POLICY_TEMPLATES);

export function resolveLaunchpadPolicyTemplate(
  templateId: string,
): LaunchpadPolicyTemplate | null {
  if (templateId in LAUNCHPAD_POLICY_TEMPLATES) {
    return LAUNCHPAD_POLICY_TEMPLATES[templateId as LaunchpadPolicyTemplateId];
  }
  return null;
}

export function buildLaunchpadPolicyId(partnerId: string, templateId: string): string {
  return `${partnerId}-${templateId}-v1`;
}
