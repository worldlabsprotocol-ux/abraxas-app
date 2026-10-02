// FILE: lib/gtm/proofPack.ts
// Buyer-readable proof packaging — reference harness metrics and story beats.

import type { ProofClassification } from "./contract";
import { PROOF_CLASSIFICATION_LABELS } from "./contract";
import {
  REFERENCE_HARNESS_FUNNEL_INVARIANTS,
  REFERENCE_HARNESS_OPERATOR_INVARIANTS,
  REFERENCE_HARNESS_PRIVACY_INVARIANTS,
  REFERENCE_HARNESS_REVOCATION_INVARIANT,
} from "./referenceProofInvariants";

/** Observed reference harness metrics — bound to canonical gate-A invariants, not live harness reads. */
export const INSTITUTIONAL_REFERENCE_METRICS = {
  provider_verifications: REFERENCE_HARNESS_FUNNEL_INVARIANTS.provider_verifications,
  applications_receiving_results: REFERENCE_HARNESS_FUNNEL_INVARIANTS.application_verifications,
  raw_kyc_recollections: REFERENCE_HARNESS_FUNNEL_INVARIANTS.raw_kyc_recollections,
  forbidden_fields_in_partner_payload:
    REFERENCE_HARNESS_PRIVACY_INVARIANTS.forbidden_fields_in_partner_payload,
  operator_actions_after_trust_config:
    REFERENCE_HARNESS_OPERATOR_INVARIANTS.operator_actions_after_trust_config,
  post_revocation_reuse: REFERENCE_HARNESS_REVOCATION_INVARIANT,
  cross_application_public_identity: "distinct application-specific results" as const,
} as const;

export interface ProofStoryBeat {
  id: string;
  question: string;
  answer: string;
}

export const INSTITUTIONAL_REFERENCE_STORY: readonly ProofStoryBeat[] = [
  {
    id: "problem",
    question: "What problem was tested?",
    answer:
      "Can one authenticated provider verification support a second relying application without raw KYC recollection, with distinct application-facing results and post-revocation reuse denial?",
  },
  {
    id: "provider",
    question: "What happened first?",
    answer:
      "An existing KYC provider verifies the customer once. Abraxas ingests trusted provider evidence — Abraxas does not replace the provider.",
  },
  {
    id: "app_a",
    question: "What did Application A receive?",
    answer:
      "Only the eligibility answer Application A is authorized to use — a server-verifiable result, not the underlying identity package.",
  },
  {
    id: "app_b",
    question: "What happened when Application B asked?",
    answer:
      "Compatible existing evidence satisfied Application B's policy with fresh consent. No second raw KYC collection.",
  },
  {
    id: "recollection",
    question: "Was KYC collected again?",
    answer: `No. Raw KYC recollections in the reference harness: ${INSTITUTIONAL_REFERENCE_METRICS.raw_kyc_recollections}.`,
  },
  {
    id: "identity",
    question: "Did the applications receive the same public customer identifier?",
    answer:
      "No. Each application received its own application-specific result surface. Applications do not share a common globally stable public identity.",
  },
  {
    id: "revocation",
    question: "What happened after revocation?",
    answer:
      "Provider revocation blocked future reuse. Post-revocation reuse attempts fail closed in the reference harness.",
  },
  {
    id: "limits",
    question: "What does this not prove?",
    answer:
      "This is reference harness evidence — not a live production institutional deployment, not measured ROI, and not a live third-party provider contract. Production readiness remains separately verified.",
  },
] as const;

export const GOOD_TROUBLE_PROOF_ROLE = {
  classification: "reference_proof" as ProofClassification,
  title: "Good Trouble — production-shaped narrow-disclosure demo",
  summary:
    "Screen-recorded retail flow showing a private 21+ eligibility answer without birth date or identity documents in the partner payload.",
  limits:
    "Production-shaped partner demo for age-gated retail — not an institutional customer, not multi-app reuse proof, and not a substitute for legally required in-person ID checks.",
} as const;

export const INSTITUTIONAL_PROOF_ROLE = {
  classification: "reference_proof" as ProofClassification,
  title: "Institutional reusable-KYC — reference harness",
  summary:
    "Automated reference scenario proving one provider verification supporting two application results with reuse, distinct application-facing identities, and revocation blocking.",
  limits:
    "Reference harness / reference proof only. Not a live production institutional deployment or paying customer.",
} as const;

export function proofClassificationLabel(classification: ProofClassification): string {
  return PROOF_CLASSIFICATION_LABELS[classification];
}

export const WHY_NOT_KYC_PROVIDER = {
  title: "Why not just use our KYC provider?",
  body:
    "Your KYC provider verifies the customer. Abraxas is not trying to replace that provider. Abraxas controls how verified evidence is reused across applications and what each application is allowed to learn.",
} as const;

export const WHY_NOT_STORE_OURSELVES = {
  title: "Why not store the verification result ourselves?",
  body:
    "A shared identity profile can solve storage. It does not automatically solve policy-specific disclosure, freshness, consent, revocation, application-specific public identity, or a provider-neutral verification contract above changing provider payloads.",
} as const;

export const PERSONA_MESSAGES = {
  ceo:
    "Launch additional gated products without expanding your identity-data footprint at the same rate.",
  product:
    "Returning users can avoid repeating compatible verification steps when policy still allows reuse.",
  compliance:
    "Downstream applications receive the decision they need rather than unnecessary identity fields.",
  engineering:
    "Integrate against a stable verification result contract above provider-specific payloads.",
} as const;
