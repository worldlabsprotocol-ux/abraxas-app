// FILE: lib/partner/policyProposal/contract.ts
// Partner policy proposal. Structured choices only. Never a live catalog change.

import {
  POLICY_FIT_ACTIONS,
  POLICY_FIT_ACTION_LABELS,
  POLICY_FIT_CAPABILITIES,
  POLICY_FIT_CAPABILITY_LABELS,
  POLICY_FIT_CATEGORIES,
  POLICY_FIT_CATEGORY_LABELS,
  POLICY_FIT_ENVIRONMENTS,
  POLICY_FIT_ENVIRONMENT_LABELS,
} from "@/lib/partner/integrationStudio/policyFit/contract";
import {
  ELIGIBILITY_PLANNING_CATEGORIES,
  ELIGIBILITY_PLANNING_LABELS,
} from "@/lib/eligibilityPresentation/planning";

export const POLICY_PROPOSAL_VERSION = "1.0.0" as const;
export const POLICY_PROPOSAL_DOCS = "/docs/policy-proposals" as const;
export const POLICY_PROPOSAL_NOTICE =
  "A proposal is not a live policy. It does not create a pack, version, compatibility edge, credential, receipt, or Production access.";

export const POLICY_PROPOSAL_STATES = [
  "draft",
  "submitted",
  "needs_information",
  "under_review",
  "accepted_for_policy_work",
  "declined",
] as const;
export type PolicyProposalState = (typeof POLICY_PROPOSAL_STATES)[number];

export const POLICY_PROPOSAL_STATE_LABELS: Record<PolicyProposalState, string> = {
  draft: "Draft",
  submitted: "Submitted",
  needs_information: "Needs information",
  under_review: "Under review",
  accepted_for_policy_work: "Accepted for policy work",
  declined: "Declined",
};

export const POLICY_PROPOSAL_RECEIVES = [
  "eligibility_result",
  "method_category",
  "freshness_class",
] as const;
export type PolicyProposalReceive = (typeof POLICY_PROPOSAL_RECEIVES)[number];

export const POLICY_PROPOSAL_RECEIVE_LABELS: Record<PolicyProposalReceive, string> = {
  eligibility_result: "Current eligibility result",
  method_category: "How the result was produced (category only)",
  freshness_class: "Whether the result is current",
};

export const POLICY_PROPOSAL_PRIVATE = [
  "date_of_birth",
  "government_id",
  "biometric_sample",
  "holder_wallet",
  "raw_documents",
  "account_email",
] as const;
export type PolicyProposalPrivate = (typeof POLICY_PROPOSAL_PRIVATE)[number];

export const POLICY_PROPOSAL_PRIVATE_LABELS: Record<PolicyProposalPrivate, string> = {
  date_of_birth: "Date of birth",
  government_id: "Government ID images or numbers",
  biometric_sample: "Biometric samples",
  holder_wallet: "Wallet addresses",
  raw_documents: "Raw documents or scans",
  account_email: "Account email",
};

export const POLICY_PROPOSAL_PLATFORMS = [
  "typescript_nextjs",
  "python",
  "http_generic",
] as const;
export type PolicyProposalPlatform = (typeof POLICY_PROPOSAL_PLATFORMS)[number];

export const POLICY_PROPOSAL_PLATFORM_LABELS: Record<PolicyProposalPlatform, string> = {
  typescript_nextjs: "TypeScript / Next.js",
  python: "Python",
  http_generic: "HTTPS / any runtime",
};

export const POLICY_PROPOSAL_ALLOWED_BODY_KEYS = [
  "action",
  "result_needed",
  "partner_receives",
  "stays_private",
  "environment",
  "platform",
  "capabilities",
  "confirm",
] as const;

export const POLICY_PROPOSAL_OPERATOR_BODY_KEYS = [
  "status",
  "confirm",
  "remediation",
] as const;

export const POLICY_PROPOSAL_CLIENT_OVERRIDE_KEYS = [
  "partner_id",
  "application_id",
  "policy_id",
  "policy_version",
  "pack_id",
  "catalog",
  "api_key",
  "hash",
  "receipt",
  "wallet",
  "callback",
  "callback_url",
  "transaction",
  "payment",
  "trade",
  "network",
  "activate_mainnet",
  "activate_production",
  "environment_changed",
  "role",
  "planning",
] as const;

export const POLICY_PROPOSAL_OPERATOR_STATUSES = [
  "needs_information",
  "under_review",
  "accepted_for_policy_work",
  "declined",
] as const;

export const POLICY_PROPOSAL_ACTIONS = POLICY_FIT_ACTIONS;
export const POLICY_PROPOSAL_ACTION_LABELS = POLICY_FIT_ACTION_LABELS;
export const POLICY_PROPOSAL_RESULTS = [
  ...POLICY_FIT_CATEGORIES,
  ...ELIGIBILITY_PLANNING_CATEGORIES,
] as const;
export type PolicyProposalResult = (typeof POLICY_PROPOSAL_RESULTS)[number];
export const POLICY_PROPOSAL_RESULT_LABELS: Record<PolicyProposalResult, string> = {
  ...POLICY_FIT_CATEGORY_LABELS,
  ...ELIGIBILITY_PLANNING_LABELS,
};
export const POLICY_PROPOSAL_ENVIRONMENTS = POLICY_FIT_ENVIRONMENTS;
export const POLICY_PROPOSAL_ENVIRONMENT_LABELS = POLICY_FIT_ENVIRONMENT_LABELS;
export const POLICY_PROPOSAL_CAPABILITIES = POLICY_FIT_CAPABILITIES;
export const POLICY_PROPOSAL_CAPABILITY_LABELS = POLICY_FIT_CAPABILITY_LABELS;

export function policyProposalPublicChoices() {
  return {
    version: POLICY_PROPOSAL_VERSION,
    notice: POLICY_PROPOSAL_NOTICE,
    actions: POLICY_PROPOSAL_ACTIONS.map((id) => ({ id, label: POLICY_PROPOSAL_ACTION_LABELS[id] })),
    results: POLICY_PROPOSAL_RESULTS.map((id) => ({ id, label: POLICY_PROPOSAL_RESULT_LABELS[id] })),
    receives: POLICY_PROPOSAL_RECEIVES.map((id) => ({ id, label: POLICY_PROPOSAL_RECEIVE_LABELS[id] })),
    stays_private: POLICY_PROPOSAL_PRIVATE.map((id) => ({ id, label: POLICY_PROPOSAL_PRIVATE_LABELS[id] })),
    environments: POLICY_PROPOSAL_ENVIRONMENTS.map((id) => ({ id, label: POLICY_PROPOSAL_ENVIRONMENT_LABELS[id] })),
    platforms: POLICY_PROPOSAL_PLATFORMS.map((id) => ({ id, label: POLICY_PROPOSAL_PLATFORM_LABELS[id] })),
    capabilities: POLICY_PROPOSAL_CAPABILITIES.map((id) => ({ id, label: POLICY_PROPOSAL_CAPABILITY_LABELS[id] })),
  };
}

export function isPolicyProposalState(value: string): value is PolicyProposalState {
  return (POLICY_PROPOSAL_STATES as readonly string[]).includes(value);
}
