// FILE: lib/assurance/eligibilityPolicyCatalog.ts
// Example policy identifiers for architecture and homepage — not production approval claims.

import type { EligibilityAssuranceLevel } from "./eligibilityAssurance";
import type { TransactionRequirement } from "./transactionRequirement";

export interface EligibilityPolicyExample {
  policy_id: string;
  title: string;
  summary: string;
  minimum_assurance: EligibilityAssuranceLevel;
  transaction_requirement: TransactionRequirement;
  example_only: true;
}

export const ELIGIBILITY_POLICY_EXAMPLES: EligibilityPolicyExample[] = [
  {
    policy_id: "good-trouble-cbd-v1",
    title: "CBD retail precheck",
    summary: "Designed to support lower-risk catalog gating with explicit partner policy rules.",
    minimum_assurance: "AGE_ESTIMATED",
    transaction_requirement: "NO_ADDITIONAL_CHECK",
    example_only: true,
  },
  {
    policy_id: "good-trouble-hemp-21-v1",
    title: "Hemp 21+ precheck",
    summary: "Configurable for hemp retail workflows that require stronger eligibility evidence.",
    minimum_assurance: "AGE_VERIFIED",
    transaction_requirement: "NO_ADDITIONAL_CHECK",
    example_only: true,
  },
  {
    policy_id: "missouri-cannabis-precheck-v1",
    title: "Missouri cannabis precheck",
    summary: "Pre-verification that can prepare a customer while preserving merchant-side ID obligations.",
    minimum_assurance: "AGE_VERIFIED",
    transaction_requirement: "TRANSACTION_ID_REQUIRED",
    example_only: true,
  },
  {
    policy_id: "tobacco-remote-sale-21-v1",
    title: "Tobacco remote sale 21+",
    summary: "Remote-sale eligibility with transaction-time ID requirements where law mandates them.",
    minimum_assurance: "AGE_VERIFIED",
    transaction_requirement: "TRANSACTION_ID_REQUIRED",
    example_only: true,
  },
  {
    policy_id: "event-entry-18-v1",
    title: "Event entry 18+",
    summary: "Venue entry policies can accept estimated or verified assurance depending on risk.",
    minimum_assurance: "AGE_ESTIMATED",
    transaction_requirement: "NO_ADDITIONAL_CHECK",
    example_only: true,
  },
  {
    policy_id: "event-entry-21-v1",
    title: "Event entry 21+",
    summary: "Higher-assurance entry policies with optional on-site ID reinforcement.",
    minimum_assurance: "AGE_VERIFIED",
    transaction_requirement: "TRANSACTION_ID_REQUIRED",
    example_only: true,
  },
  {
    policy_id: "account-humanity-v1",
    title: "Account humanity",
    summary: "Humanity and abuse-resistance signals — not a substitute for government ID age proof.",
    minimum_assurance: "SELF_ATTESTED",
    transaction_requirement: "NO_ADDITIONAL_CHECK",
    example_only: true,
  },
  {
    policy_id: "reusable-human-assurance-v1",
    title: "Reusable human assurance",
    summary: "Cross-partner eligibility reuse with partner-bound transaction receipts.",
    minimum_assurance: "AGE_VERIFIED",
    transaction_requirement: "NO_ADDITIONAL_CHECK",
    example_only: true,
  },
];
