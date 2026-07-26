// FILE: lib/regulatedRetail/vertical.ts
// Cannabis + spirits: repeated age gates vs portable Abraxas eligibility proof.

import { GOOD_TROUBLE_BRAND } from "@/lib/goodTrouble/constants";

export const REGULATED_RETAIL_EYEBROW = "Regulated retail";

export const REGULATED_RETAIL_HEADLINE = "The age gate is the same problem as the ID parade.";

export const REGULATED_RETAIL_SUBLINE =
  "Cannabis sites, spirits checkout, and crypto-native communities all run the same loop: prove you qualify before you enter. Most stacks ask again on every visit — checkbox theater, not a durable audit trail. Abraxas verifies once and lets partners policy-check eligibility at transaction time without re-collecting your license.";

export const REGULATED_RETAIL_CRYPTO_PARALLEL =
  "Wallet-gated Discords, alpha groups, and trading flows already treat verification as infrastructure — not a one-off popup. Regulated retail deserves the same architecture: cryptographic proof, revocable consent, and outcomes partners can audit without holding biometrics.";

export const REGULATED_RETAIL_SAFER_THAN_POPUP = [
  {
    title: "Partners see outcomes, not ID images",
    body: "Dispensary POS and e-commerce get approved / denied / manual_review — not passport scans in a shared inbox.",
  },
  {
    title: "Re-check at transaction time",
    body: "POST /api/credentials/verify on every purchase decision. Portable proof does not mean cache forever.",
  },
  {
    title: "Consent + audit trail",
    body: "Users approve which claims a retailer reads. Decisions are signed and lookup-able for compliance review.",
  },
  {
    title: "Revoke when status changes",
    body: "Lost wallet, jurisdiction change, or policy update — credentials fail closed or trigger refresh.",
  },
] as const;

export type RegulatedRetailVerticalId = "cannabis_adult_use" | "spirits_age_gated";

export interface RegulatedRetailVertical {
  id: RegulatedRetailVerticalId;
  label: string;
  minimumAge: number;
  jurisdictionNote: string;
  gateCopy: {
    eyebrow: string;
    headline: string;
    requirement: string;
  };
  partnerExample?: {
    name: string;
    href: string;
    location: string;
    established?: number;
  };
  policyId: string;
  claimsSummary: string;
}

export const REGULATED_RETAIL_VERTICALS: RegulatedRetailVertical[] = [
  {
    id: "cannabis_adult_use",
    label: "Cannabis · adult use",
    minimumAge: 21,
    jurisdictionNote: "State law sets minimum age (21+ in Missouri adult-use). Partner maps Abraxas decision to POS gate.",
    gateCopy: GOOD_TROUBLE_BRAND.ageGate,
    partnerExample: {
      name: "Good Trouble",
      href: "/good-trouble",
      location: "Kansas City, MO",
      established: 2022,
    },
    policyId: "good-trouble-retail-v1",
    claimsSummary: "identity_verified · liveness_passed · residency · wallet binding",
  },
  {
    id: "spirits_age_gated",
    label: "Spirits · age-gated commerce",
    minimumAge: 21,
    jurisdictionNote: "21+ US (varies by state for wine/beer). Same Abraxas Passport path — different partner policy_id.",
    gateCopy: {
      eyebrow: "BEFORE YOU CHECK OUT",
      headline: "OF LEGAL DRINKING AGE?",
      requirement: "YOU MUST BE 21 OR OLDER TO PURCHASE",
    },
    policyId: "spirits-retail-v1",
    claimsSummary: "identity_verified · government_id_verified · residency_country",
  },
];

export function getRegulatedRetailVertical(id: RegulatedRetailVerticalId): RegulatedRetailVertical | undefined {
  return REGULATED_RETAIL_VERTICALS.find(v => v.id === id);
}
