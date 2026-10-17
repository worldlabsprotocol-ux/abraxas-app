// FILE: lib/partner/launchpad/institutionalVerificationRequirements.ts
// User-facing verification requirements for institutional developer onboarding.

import {
  ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_SUMMARY,
  ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_TITLE,
} from "@/lib/product/abraxasIdentityExperienceCopy";
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
  /** Full sandbox boundary text — show under Technical details only. */
  sandbox_notice: string | null;
  /** Engineering identifiers and scope — not primary onboarding copy. */
  technical_summary: string | null;
}

export function listInstitutionalVerificationRequirements(input: {
  selectedPolicyTemplateId: string | null;
}): InstitutionalVerificationRequirement[] {
  const institutionalSelected =
    input.selectedPolicyTemplateId === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID;

  return [
    {
      id: "organization_protocol_access_sandbox",
      title: ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_TITLE,
      purpose: ABRAXAS_INSTITUTIONAL_PROTOCOL_ACCESS_SUMMARY,
      policy_template_id: INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
      availability: institutionalSelected ? "selected" : "selectable",
      unavailable_reason: null,
      sandbox_notice: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
      technical_summary: `Policy template ${INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID}. Sandbox-only institutional protocol access; not live KYB or production authorization.`,
    },
    {
      id: "identity_verification",
      title: "Identity verification",
      purpose: "Add as a separate eligibility policy when your tenant is authorized.",
      policy_template_id: null,
      availability: "advanced_only",
      unavailable_reason: "Add in Launchpad eligibility policies after this app exists.",
      sandbox_notice: null,
      technical_summary: "Requires tenant authorization beyond the institutional sandbox path.",
    },
    {
      id: "age_eligibility",
      title: "Age eligibility",
      purpose: "Commerce age gates use Partner Flow, not this institutional path.",
      policy_template_id: null,
      availability: "unavailable",
      unavailable_reason: "Use Partner Flow catalog packs for age-gated commerce.",
      sandbox_notice: null,
      technical_summary: null,
    },
    {
      id: "custom_policy_configuration",
      title: "Custom policy",
      purpose: "Sandbox-only custom eligibility when catalog packs do not fit.",
      policy_template_id: "custom_launchpad_policy",
      availability: "advanced_only",
      unavailable_reason: "Configure in Launchpad advanced options.",
      sandbox_notice: null,
      technical_summary: "Sandbox-only custom eligibility when catalog packs do not fit.",
    },
  ];
}
