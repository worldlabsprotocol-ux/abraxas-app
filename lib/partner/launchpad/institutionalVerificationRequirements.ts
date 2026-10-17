// FILE: lib/partner/launchpad/institutionalVerificationRequirements.ts
// User-facing verification requirements for institutional developer onboarding.

import { INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID } from "@/lib/partner/launchpad/institutionalActivationEntry";
import { SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE } from "@/lib/partner/sandboxInstitutionalProtocolAccess/contract";

export type InstitutionalVerificationRequirementId =
  | "organization_protocol_access_sandbox"
  | "identity_verification"
  | "age_eligibility"
  | "custom_policy_configuration";

export type InstitutionalVerificationRequirementAvailability =
  | "selected"
  | "selectable"
  | "advanced_only"
  | "unavailable";

export interface InstitutionalVerificationRequirement {
  id: InstitutionalVerificationRequirementId;
  title: string;
  purpose: string;
  policy_template_id: string | null;
  availability: InstitutionalVerificationRequirementAvailability;
  unavailable_reason: string | null;
  sandbox_notice: string | null;
}

export function listInstitutionalVerificationRequirements(input: {
  selectedPolicyTemplateId: string | null;
}): InstitutionalVerificationRequirement[] {
  const institutionalSelected =
    input.selectedPolicyTemplateId === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;

  return [
    {
      id: "organization_protocol_access_sandbox",
      title: "Organization protocol access (sandbox)",
      purpose:
        "Verify that a holder meets your institutional protocol access policy and receive a signed decision receipt for offline verification.",
      policy_template_id: INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
      availability: institutionalSelected ? "selected" : "selectable",
      unavailable_reason: null,
      sandbox_notice: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
    },
    {
      id: "identity_verification",
      title: "Identity verification",
      purpose:
        "Holder identity assurance for regulated flows — configured as an additional eligibility policy on the same application when your tenant is authorized.",
      policy_template_id: null,
      availability: "advanced_only",
      unavailable_reason:
        "Not part of the default institutional protocol access pack. Add through Launchpad eligibility policies after your sandbox application exists.",
      sandbox_notice: null,
    },
    {
      id: "age_eligibility",
      title: "Age eligibility",
      purpose:
        "Age-gated commerce and retail eligibility — uses Partner Flow packs separate from institutional protocol verification.",
      policy_template_id: null,
      availability: "unavailable",
      unavailable_reason:
        "Age-gated Partner Flow is a separate integration path. Use Partner Launchpad catalog packs or Integration Studio for commerce eligibility.",
      sandbox_notice: null,
    },
    {
      id: "custom_policy_configuration",
      title: "Custom policy configuration",
      purpose:
        "Constrained custom eligibility policies for sandbox experimentation when approved catalog packs do not fit.",
      policy_template_id: "custom_launchpad_policy",
      availability: "advanced_only",
      unavailable_reason:
        "Custom policies remain sandbox-only and require explicit configuration in Launchpad advanced options.",
      sandbox_notice: null,
    },
  ];
}
