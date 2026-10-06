// FILE: lib/custody/goodTroubleCustody.ts
// Good Trouble reference custody analysis — semantics unchanged.

export const GOOD_TROUBLE_CUSTODY_VERSION = "1.0.0" as const;

export const GOOD_TROUBLE_L0_SEMANTICS = {
  assurance: "L0 self-attestation",
  isGovernmentIdProof: false,
  partnerReceives: "21+ eligibility result (narrow policy answer)",
  partnerDoesNotReceive: ["DOB", "government document", "identity profile", "unrelated Passport data"],
} as const;

export const GOOD_TROUBLE_L0_FLOW_CUSTODY = [
  {
    stage: "DOB entry (browse/purchase)",
    transient: ["date_of_birth in HTTP request body"],
    persisted: [],
    storageClass: "raw_evidence",
    note: "Discarded after age band derivation",
  },
  {
    stage: "Age band derivation",
    transient: [],
    persisted: ["self_attestation_ledger.age_band (over_21 | under_21)"],
    storageClass: "derived_fact",
    note: "TTL ~24h; not written to credential_claims for L0",
  },
  {
    stage: "Purchase prequal cookie",
    transient: [],
    persisted: ["abraxas_gt_dob_prequal: age_band + flow IDs only"],
    storageClass: "derived_fact",
    note: "30 min HttpOnly; valid_for_authoritative_decision: false on prequal",
  },
  {
    stage: "Policy evaluation",
    transient: ["Ephemeral self_attested_age_band claim projection"],
    persisted: [],
    storageClass: "derived_fact",
    note: "Resolved from ledger at evaluation time",
  },
  {
    stage: "Partner receipt",
    transient: [],
    persisted: ["decision_receipts with claim refs, no claim_value"],
    storageClass: "receipt",
    note: "Partner verifies signed receipt; must re-fetch for live validity",
  },
] as const;

export const GOOD_TROUBLE_SAFE_REDUCTIONS = [
  "DOB remains transient; never add DOB column to ledger",
  "Prequal cookie remains age_band-only",
  "L0 must not be described as government-ID-backed",
  "Partner webhook remains notification-only without PII",
] as const;

export const GOOD_TROUBLE_MUST_NOT_CHANGE = [
  "good-trouble-browse-v1 policy semantics",
  "good-trouble-age_21_retail-v1 L0 pilot semantics",
  "valid_for_authoritative_decision flags on prequal",
  "DecisionReceiptCanonicalPayload v1.0.0",
] as const;
