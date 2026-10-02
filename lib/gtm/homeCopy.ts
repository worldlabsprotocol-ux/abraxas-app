// FILE: lib/gtm/homeCopy.ts
// Buyer-first homepage copy — complements cinematic thesis lines.

import {
  GTM_ONE_SENTENCE_DESCRIPTION,
  GTM_PRIMARY_COMMERCIAL_MESSAGE,
  GTM_PRIMARY_CTA_HREF,
  GTM_PRIMARY_CTA_LABEL,
  GTM_SECONDARY_CTA_HREF,
  GTM_SECONDARY_CTA_LABEL,
} from "./contract";

export const HOME_BUYER_EYEBROW = "FOR MULTI-APP FINTECH & DIGITAL-ASSET PLATFORMS" as const;

export const HOME_BUYER_PROBLEM = GTM_PRIMARY_COMMERCIAL_MESSAGE;

export const HOME_BUYER_OUTCOME = GTM_ONE_SENTENCE_DESCRIPTION;

export const HOME_KEEP_KYC_PROVIDER =
  "Keep your existing KYC provider. Abraxas handles what happens after verification — trusted evidence, policy-specific answers, and reuse when compatible." as const;

export const HOME_PRIMARY_CTA = GTM_PRIMARY_CTA_LABEL;
export const HOME_PRIMARY_CTA_HREF = GTM_PRIMARY_CTA_HREF;

export const HOME_SECONDARY_CTA = GTM_SECONDARY_CTA_LABEL;
export const HOME_SECONDARY_CTA_HREF = GTM_SECONDARY_CTA_HREF;

export const HOME_TWO_APP_PROOF_HEADLINE = "Reference proof: one verification, two applications" as const;

export const HOME_TWO_APP_PROOF_BODY =
  "In the institutional reference harness, one provider verification supported two application results with zero raw KYC recollections and distinct application-facing identities." as const;

export const HOME_PASSPORT_DEMOTED_NOTE =
  "Abraxas Passport is the holder-facing experience for consent and reusable evidence — one component of the infrastructure, not the whole product." as const;

export const BENEFIT_FIRST_CAPABILITY_COPY = {
  decision_receipts: {
    feature: "Signed eligibility receipts",
    benefit: "Server-verifiable answers your application can trust",
  },
  reusable_evidence: {
    feature: "Reusable evidence",
    benefit:
      "Don't ask returning users for the same proof again when existing evidence still satisfies policy",
  },
  policy_packs: {
    feature: "Policy packs",
    benefit: "Add a new eligibility requirement without rebuilding onboarding",
  },
  pairwise_subject: {
    feature: "Application-specific subject references",
    benefit: "Applications don't need a shared public customer identifier",
  },
  provider_ingestion: {
    feature: "Provider-neutral ingestion",
    benefit: "Keep your existing verification provider",
  },
} as const;
