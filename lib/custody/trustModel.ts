// FILE: lib/custody/trustModel.ts
// Issuer / verifier / Abraxas / relying-party trust boundaries.

import type { TrustRole } from "./types";

export interface TrustBoundary {
  role: TrustRole;
  responsibilities: readonly string[];
  mustNot: readonly string[];
  mayOverlapWith?: readonly TrustRole[];
}

export const TRUST_BOUNDARIES: Record<TrustRole, TrustBoundary> = {
  holder: {
    role: "holder",
    responsibilities: [
      "Controls underlying evidence and authorization to present",
      "Approves partner-specific consent scopes",
      "May retain encrypted evidence locally or with authorized custodian",
    ],
    mustNot: [
      "Self-issue high-assurance government-ID-backed facts",
      "Assume browser storage alone preserves identity state",
    ],
  },
  issuer: {
    role: "issuer",
    responsibilities: [
      "Signs verifiable claims after evidence validation",
      "Sets assurance level and claim expiry",
      "Revokes credentials when evidence invalidated",
    ],
    mustNot: [
      "Disclose raw evidence to relying parties by default",
    ],
    mayOverlapWith: ["verifier"],
  },
  verifier: {
    role: "verifier",
    responsibilities: [
      "Validates source evidence (IDV vendor, document review, biometric engine)",
      "Returns verification outcome to issuance pipeline",
    ],
    mustNot: [
      "Become permanent warehouse for all holder PII without retention policy",
    ],
    mayOverlapWith: ["issuer", "abraxas_policy_engine"],
  },
  abraxas_policy_engine: {
    role: "abraxas_policy_engine",
    responsibilities: [
      "Evaluates policy against minimum necessary claims/facts",
      "Issues narrow signed decision receipts",
      "Enforces selective disclosure and custody guardrails",
      "Orchestrates consent, revocation, and audit metadata",
    ],
    mustNot: [
      "Require permanent possession of raw evidence when derived facts suffice",
      "Disclose wallet address globally to all partners",
      "Mandate blockchain for core verification",
    ],
    mayOverlapWith: ["verifier"],
  },
  relying_party: {
    role: "relying_party",
    responsibilities: [
      "Re-fetch and validate signed receipt before granting access",
      "Apply own business rules beyond Abraxas policy result",
    ],
    mustNot: [
      "Treat webhook notification as proof",
      "Persist DOB/ID images from Abraxas responses (not provided by default)",
    ],
  },
};

export const TRUST_MODEL_NOTICE =
  "Abraxas may occupy multiple roles in a deployment, but the architecture must not REQUIRE "
  + "Abraxas to be holder, issuer, verifier, and relying party simultaneously.";
