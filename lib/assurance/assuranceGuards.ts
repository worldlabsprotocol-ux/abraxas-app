// FILE: lib/assurance/assuranceGuards.ts
// Fail-closed guards — authentication cannot substitute for authoritative age assurance.

import type { AuthenticationMethod } from "./eligibilityAssurance";
import {
  type EligibilityAssuranceLevel,
  isKnownEligibilityAssuranceLevel,
  meetsMinimumEligibilityAssurance,
  eligibilityAssuranceRank,
} from "./eligibilityAssurance";
import type { ReusableCredentialStatus } from "./reusableCredential";
import {
  type TransactionRequirement,
  isKnownTransactionRequirement,
} from "./transactionRequirement";

const AUTH_MAX_ELIGIBILITY: Record<AuthenticationMethod, EligibilityAssuranceLevel> = {
  zklogin_google: "SELF_ATTESTED",
  zklogin_oauth: "SELF_ATTESTED",
  wallet_binding: "SELF_ATTESTED",
  browser_session: "SELF_ATTESTED",
};

export function maxEligibilityFromAuthentication(
  method: AuthenticationMethod,
): EligibilityAssuranceLevel {
  return AUTH_MAX_ELIGIBILITY[method];
}

export function authenticationCanSatisfyAssurance(
  method: AuthenticationMethod,
  required: EligibilityAssuranceLevel,
): boolean {
  if (required === "AGE_VERIFIED") {
    return false;
  }
  const max = maxEligibilityFromAuthentication(method);
  return meetsMinimumEligibilityAssurance(max, required);
}

export function assertAssuranceNotSilentlyUpgraded(
  previous: EligibilityAssuranceLevel,
  next: EligibilityAssuranceLevel,
): void {
  if (eligibilityAssuranceRank(next) > eligibilityAssuranceRank(previous)) {
    throw new Error("assurance_silent_upgrade_blocked");
  }
}

/** Transaction obligations never raise or substitute for credential assurance. */
export function resolveCredentialAssurance(
  credentialAssurance: EligibilityAssuranceLevel,
  _transactionRequirement: TransactionRequirement,
): EligibilityAssuranceLevel {
  return credentialAssurance;
}

export function credentialStatusBlocksEvaluation(
  status: ReusableCredentialStatus,
  now: Date = new Date(),
  expiresAt?: string | null,
): boolean {
  if (status === "revoked" || status === "suspended") return true;
  if (status === "expired") return true;
  if (expiresAt && Date.parse(expiresAt) <= now.getTime()) return true;
  return false;
}

export interface PolicyAssuranceRequirement {
  policy_id: string;
  policy_version: number;
  minimum_assurance: EligibilityAssuranceLevel;
  transaction_requirement: TransactionRequirement;
}

export function policyRequiresExplicitAssurance(
  requirement: PolicyAssuranceRequirement | null | undefined,
): requirement is PolicyAssuranceRequirement {
  return Boolean(
    requirement?.minimum_assurance
    && isKnownEligibilityAssuranceLevel(requirement.minimum_assurance),
  );
}

export function assertPolicyTransactionRequirementDeclared(
  policy: PolicyAssuranceRequirement | null | undefined,
): void {
  if (!policy) {
    throw new Error("policy_required");
  }
  if (!isKnownEligibilityAssuranceLevel(policy.minimum_assurance)) {
    throw new Error("minimum_assurance_required");
  }
  if (!isKnownTransactionRequirement(policy.transaction_requirement)) {
    throw new Error("transaction_requirement_required");
  }
}

export function credentialAssuranceSatisfiesPolicy(
  credentialAssurance: EligibilityAssuranceLevel,
  policy: PolicyAssuranceRequirement,
): boolean {
  assertPolicyTransactionRequirementDeclared(policy);
  return meetsMinimumEligibilityAssurance(credentialAssurance, policy.minimum_assurance);
}

export interface MerchantSafeAssuranceDecision {
  decision: "approved" | "denied";
  assurance_level: EligibilityAssuranceLevel;
  transaction_requirement: TransactionRequirement;
}

export function buildMerchantSafeAssuranceDecision(input: {
  decision: "approved" | "denied";
  credentialAssurance: EligibilityAssuranceLevel;
  policy: PolicyAssuranceRequirement;
}): MerchantSafeAssuranceDecision {
  assertPolicyTransactionRequirementDeclared(input.policy);
  return {
    decision: input.decision,
    assurance_level: resolveCredentialAssurance(
      input.credentialAssurance,
      input.policy.transaction_requirement,
    ),
    transaction_requirement: input.policy.transaction_requirement,
  };
}

export function assertPolicyVersionMatches(
  expected: { policy_id: string; policy_version: number },
  received: { policy_id: string; policy_version: number },
): void {
  if (expected.policy_id !== received.policy_id) {
    throw new Error("policy_id_mismatch");
  }
  if (expected.policy_version !== received.policy_version) {
    throw new Error("policy_version_mismatch");
  }
}

export function assertReceiptAudienceMatches(
  receipt: { partner_id: string },
  expectedPartnerId: string,
): void {
  if (receipt.partner_id !== expectedPartnerId) {
    throw new Error("audience_mismatch");
  }
}

export function assertFreshReceiptIssue(
  replayStatus: "issued" | "idempotent_replay",
): void {
  if (replayStatus === "idempotent_replay") {
    throw new Error("receipt_replay_blocked");
  }
}
