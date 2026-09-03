// FILE: lib/assurance/eligibilityAssurance.ts
// Eligibility assurance ladder — evidence quality only; not transaction obligations.

import type { AssuranceLevel as ClaimAssuranceLevel } from "@/lib/credentials/claimSchema";

/** Evidence-quality ladder for age and access eligibility. */
export type EligibilityAssuranceLevel =
  | "SELF_ATTESTED"
  | "AGE_ESTIMATED"
  | "AGE_VERIFIED";

export type EligibilityClaimType =
  | "age_over_18"
  | "age_over_21"
  | "account_humanity"
  | "product_eligibility"
  | "membership_eligible"
  | "event_entry_eligible";

export type AuthenticationMethod =
  | "zklogin_google"
  | "zklogin_oauth"
  | "wallet_binding"
  | "browser_session";

export interface EligibilityAssuranceLevelDef {
  level: EligibilityAssuranceLevel;
  label: string;
  shortLabel: string;
  description: string;
  minimumClaimAssurance: ClaimAssuranceLevel | null;
}

export const ELIGIBILITY_ASSURANCE_LADDER: EligibilityAssuranceLevelDef[] = [
  {
    level: "SELF_ATTESTED",
    label: "Self-attested",
    shortLabel: "Self-attested",
    description: "The person asserts they satisfy the requirement. Suitable only for low-risk policies that explicitly accept attestation.",
    minimumClaimAssurance: "L1",
  },
  {
    level: "AGE_ESTIMATED",
    label: "Age estimated",
    shortLabel: "Age estimated",
    description: "An approved age-estimation or independent-data provider produces an age-confidence result — not document-grade verification.",
    minimumClaimAssurance: "L2",
  },
  {
    level: "AGE_VERIFIED",
    label: "Age verified",
    shortLabel: "Age verified",
    description: "Authoritative evidence such as government ID validation and, where required, liveness — issued only from approved evidence pipelines.",
    minimumClaimAssurance: "L3",
  },
];

const ELIGIBILITY_ASSURANCE_RANK: Record<EligibilityAssuranceLevel, number> = {
  SELF_ATTESTED: 1,
  AGE_ESTIMATED: 2,
  AGE_VERIFIED: 3,
};

const KNOWN_ELIGIBILITY_ASSURANCE = new Set<EligibilityAssuranceLevel>(
  ELIGIBILITY_ASSURANCE_LADDER.map((entry) => entry.level),
);

export function isKnownEligibilityAssuranceLevel(
  value: string | null | undefined,
): value is EligibilityAssuranceLevel {
  return typeof value === "string" && KNOWN_ELIGIBILITY_ASSURANCE.has(value as EligibilityAssuranceLevel);
}

export function eligibilityAssuranceRank(level: EligibilityAssuranceLevel): number {
  return ELIGIBILITY_ASSURANCE_RANK[level];
}

export function meetsMinimumEligibilityAssurance(
  observed: EligibilityAssuranceLevel,
  required: EligibilityAssuranceLevel,
): boolean {
  return eligibilityAssuranceRank(observed) >= eligibilityAssuranceRank(required);
}

export function eligibilityAssuranceDef(
  level: EligibilityAssuranceLevel,
): EligibilityAssuranceLevelDef {
  return ELIGIBILITY_ASSURANCE_LADDER.find((entry) => entry.level === level)
    ?? ELIGIBILITY_ASSURANCE_LADDER[0];
}

export function mapClaimAssuranceToEligibility(
  claimAssurance: ClaimAssuranceLevel | null | undefined,
): EligibilityAssuranceLevel | null {
  if (!claimAssurance) return null;
  if (claimAssurance === "L1") return "SELF_ATTESTED";
  if (claimAssurance === "L2") return "AGE_ESTIMATED";
  if (claimAssurance === "L3" || claimAssurance === "L4") return "AGE_VERIFIED";
  return null;
}
