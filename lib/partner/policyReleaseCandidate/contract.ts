// FILE: lib/partner/policyReleaseCandidate/contract.ts
// Operator policy release candidates. Never a live catalog publish.

import {
  POLICY_PROPOSAL_ACTIONS,
  POLICY_PROPOSAL_ACTION_LABELS,
  POLICY_PROPOSAL_ENVIRONMENTS,
  POLICY_PROPOSAL_ENVIRONMENT_LABELS,
  POLICY_PROPOSAL_PRIVATE,
  POLICY_PROPOSAL_PRIVATE_LABELS,
  POLICY_PROPOSAL_RECEIVES,
  POLICY_PROPOSAL_RECEIVE_LABELS,
} from "@/lib/partner/policyProposal/contract";
import {
  POLICY_FIT_CATEGORIES,
  POLICY_FIT_CATEGORY_LABELS,
} from "@/lib/partner/integrationStudio/policyFit/contract";
import {
  ELIGIBILITY_PLANNING_CATEGORIES,
  ELIGIBILITY_PLANNING_LABELS,
} from "@/lib/eligibilityPresentation/planning";
import { PORTABLE_ACTION_SCOPES } from "@/lib/partner/portableActionContract/contract";
import { POLICY_VERSION_COMPATIBILITY } from "@/lib/partner/launchpad/policyVersionPlanner/contract";

export const POLICY_RC_VERSION = "1.0.0" as const;
export const POLICY_RC_DOCS = "/docs/policy-release-candidates" as const;
export const POLICY_RC_NOTICE =
  "A release candidate is not a live policy. Approved for catalog PR still requires a separately reviewed source-code change. Abraxas does not auto-publish policy logic.";

export const POLICY_RC_STATES = [
  "draft",
  "ready_for_review",
  "needs_revision",
  "approved_for_catalog_pr",
  "superseded",
] as const;
export type PolicyRcState = (typeof POLICY_RC_STATES)[number];

export const POLICY_RC_STATE_LABELS: Record<PolicyRcState, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  needs_revision: "Needs revision",
  approved_for_catalog_pr: "Approved for catalog PR",
  superseded: "Superseded",
};

export const POLICY_RC_OPERATOR_STATUSES = POLICY_RC_STATES;

export const POLICY_RC_METHODS = [
  "reuse_existing_proof",
  "partner_age_check",
  "privacy_preserving",
  "identity_liveness",
  "self_attestation",
] as const;
export type PolicyRcMethod = (typeof POLICY_RC_METHODS)[number];

export const POLICY_RC_METHOD_LABELS: Record<PolicyRcMethod, string> = {
  reuse_existing_proof: "Reuse an existing proof",
  partner_age_check: "Partner age or eligibility check",
  privacy_preserving: "Privacy-preserving check",
  identity_liveness: "Identity plus liveness",
  self_attestation: "Self attestation (sandbox only)",
};

export const POLICY_RC_ASSURANCE = ["L1", "L2", "L3"] as const;
export type PolicyRcAssurance = (typeof POLICY_RC_ASSURANCE)[number];

export const POLICY_RC_DISCLOSURE = [
  "result_only",
  "result_and_method_category",
  "result_and_freshness",
] as const;
export type PolicyRcDisclosure = (typeof POLICY_RC_DISCLOSURE)[number];

export const POLICY_RC_DISCLOSURE_LABELS: Record<PolicyRcDisclosure, string> = {
  result_only: "Share the eligibility result only",
  result_and_method_category: "Share result plus method category",
  result_and_freshness: "Share result plus whether it is current",
};

export const POLICY_RC_COMPATIBILITY = [
  ...POLICY_VERSION_COMPATIBILITY,
  "new_edge_required",
] as const;
export type PolicyRcCompatibility = (typeof POLICY_RC_COMPATIBILITY)[number];

export const POLICY_RC_COMPATIBILITY_LABELS: Record<PolicyRcCompatibility, string> = {
  unchanged: "No compatibility change",
  sandbox_retest: "Sandbox retest required",
  policy_review: "Policy review required",
  new_edge_required: "New compatibility edge required after catalog PR",
};

export const POLICY_RC_ACTIONS = POLICY_PROPOSAL_ACTIONS;
export const POLICY_RC_ACTION_LABELS = POLICY_PROPOSAL_ACTION_LABELS;
export const POLICY_RC_RESULTS = [...POLICY_FIT_CATEGORIES, ...ELIGIBILITY_PLANNING_CATEGORIES] as const;
export const POLICY_RC_RESULT_LABELS = {
  ...POLICY_FIT_CATEGORY_LABELS,
  ...ELIGIBILITY_PLANNING_LABELS,
};

export type PolicyRcLabel = `reviewed_gate_${(typeof POLICY_RC_RESULTS)[number]}`;
export const POLICY_RC_LABELS: readonly PolicyRcLabel[] = POLICY_RC_RESULTS.map(
  (id) => `reviewed_gate_${id}` as PolicyRcLabel,
);

export const POLICY_RC_CREATE_KEYS = [
  "confirm",
  "policy_label",
  "action",
  "result_category",
  "shared_result",
  "withheld",
  "method_category",
  "minimum_assurance",
  "environment",
  "action_scopes",
  "disclosure_profile",
  "compatibility_impact",
] as const;

export const POLICY_RC_DECIDE_KEYS = [
  "status",
  "confirm",
  "remediation",
] as const;

export const POLICY_RC_CLIENT_OVERRIDE_KEYS = [
  "partner_id",
  "application_id",
  "proposal_id",
  "policy_id",
  "policy_version",
  "pack_id",
  "catalog",
  "publish",
  "live_policy",
  "edge_id",
  "compatibility_edge",
  "api_key",
  "receipt",
  "receipt_id",
  "wallet",
  "callback",
  "callback_url",
  "transaction",
  "payment",
  "trade",
  "network",
  "activate_mainnet",
  "activate_production",
  "role",
  "owner",
  "sql",
  "dsl",
  "code",
  "rules_json",
] as const;

export const POLICY_RC_ENVIRONMENTS = POLICY_PROPOSAL_ENVIRONMENTS;
export const POLICY_RC_ENVIRONMENT_LABELS = POLICY_PROPOSAL_ENVIRONMENT_LABELS;
export const POLICY_RC_PRIVATE = POLICY_PROPOSAL_PRIVATE;
export const POLICY_RC_PRIVATE_LABELS = POLICY_PROPOSAL_PRIVATE_LABELS;
export const POLICY_RC_RECEIVES = POLICY_PROPOSAL_RECEIVES;
export const POLICY_RC_RECEIVE_LABELS = POLICY_PROPOSAL_RECEIVE_LABELS;
export const POLICY_RC_SCOPES = PORTABLE_ACTION_SCOPES;

export const POLICY_RC_CHECKLIST = [
  "catalog pack/version change",
  "selective-disclosure profile",
  "qualifying-method plan",
  "Partner Flow holder brief",
  "receipt/public verification contract",
  "Starter Kit / Studio compatibility",
  "policy-version planner classification",
  "compatibility-edge decision",
  "tests and migration impact",
] as const;

export function policyRcPublicChoices() {
  return {
    version: POLICY_RC_VERSION,
    notice: POLICY_RC_NOTICE,
    states: POLICY_RC_STATES.map((id) => ({ id, label: POLICY_RC_STATE_LABELS[id] })),
    labels: POLICY_RC_LABELS.map((id) => ({ id, label: id.replace("reviewed_gate_", "Reviewed gate: ") })),
    actions: POLICY_RC_ACTIONS.map((id) => ({ id, label: POLICY_RC_ACTION_LABELS[id] })),
    results: POLICY_RC_RESULTS.map((id) => ({ id, label: POLICY_RC_RESULT_LABELS[id] })),
    shared_result: POLICY_RC_RECEIVES.map((id) => ({ id, label: POLICY_RC_RECEIVE_LABELS[id] })),
    withheld: POLICY_RC_PRIVATE.map((id) => ({ id, label: POLICY_RC_PRIVATE_LABELS[id] })),
    methods: POLICY_RC_METHODS.map((id) => ({ id, label: POLICY_RC_METHOD_LABELS[id] })),
    assurance: POLICY_RC_ASSURANCE.map((id) => ({ id, label: id })),
    environments: POLICY_RC_ENVIRONMENTS.map((id) => ({ id, label: POLICY_RC_ENVIRONMENT_LABELS[id] })),
    action_scopes: POLICY_RC_SCOPES.map((id) => ({ id, label: id })),
    disclosure: POLICY_RC_DISCLOSURE.map((id) => ({ id, label: POLICY_RC_DISCLOSURE_LABELS[id] })),
    compatibility: POLICY_RC_COMPATIBILITY.map((id) => ({ id, label: POLICY_RC_COMPATIBILITY_LABELS[id] })),
    checklist: POLICY_RC_CHECKLIST,
  };
}

export function isPolicyRcState(value: string): value is PolicyRcState {
  return (POLICY_RC_STATES as readonly string[]).includes(value);
}

export function policyRcCanTransition(from: PolicyRcState, to: PolicyRcState): boolean {
  if (from === to) return true;
  if (from === "superseded") return false;
  if (to === "superseded") return true;
  const allowed: Record<PolicyRcState, PolicyRcState[]> = {
    draft: ["ready_for_review", "needs_revision"],
    ready_for_review: ["needs_revision", "approved_for_catalog_pr"],
    needs_revision: ["draft", "ready_for_review"],
    approved_for_catalog_pr: [],
    superseded: [],
  };
  return allowed[from].includes(to);
}
