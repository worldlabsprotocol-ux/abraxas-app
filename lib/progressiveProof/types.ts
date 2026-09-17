// FILE: lib/progressiveProof/types.ts
// Canonical progressive proof model — sign-in, evidence, and partner eligibility are distinct.

import type { AssuranceLevel, ClaimType } from "@/lib/credentials/claimSchema";
import type { PartnerPolicyRules, PolicyDecision } from "@/lib/policy/types";

/** End-user / partner UI states. Missing proof never maps to eligible. */
export type ProgressiveProofUiState =
  | "signed_in"
  | "proof_needed"
  | "pending"
  | "eligible"
  | "denied"
  | "expired"
  | "error";

/** Evidence collection steps — ordered from lowest friction to highest. */
export type ProofEvidenceStep =
  | "sign_in"
  | "bind_wallet"
  | "consent"
  | "self_attest"
  | "age_assurance"
  | "identity_documents"
  | "liveness"
  | "residency";

/** Authentication providers for account creation only — not policy proof. */
export type SignInProviderId = "google_zklogin" | "legacy_zklogin_recovery";

export interface SignInProviderDef {
  id: SignInProviderId;
  label: string;
  /** True when this provider may be offered as the default low-friction path. */
  isDefault: boolean;
  /** Sign-in never satisfies these claim types. */
  neverSatisfiesClaims: readonly ClaimType[];
}

/** Normalized held claim for policy evaluation and partner receipts. */
export interface HeldClaimRecord {
  claimType: ClaimType | string;
  issuerId: string;
  assuranceLevel: AssuranceLevel | null;
  issuedAt: string;
  expiresAt: string | null;
  status: "active" | "expired" | "revoked" | "suspended" | "under_review";
  consentScope?: string | null;
  walletBindingRequired: boolean;
  credentialJti: string | null;
}

export interface ProgressiveProofEvaluationInput {
  /** Holder has completed Google zkLogin (account exists). */
  signedIn: boolean;
  walletBound: boolean;
  consentGranted?: boolean;
  policyRules: PartnerPolicyRules;
  policyDecision?: PolicyDecision;
  missingClaims?: string[];
  reasonCodes?: string[];
  heldClaims?: HeldClaimRecord[];
}

export interface ProgressiveProofEvaluation {
  uiState: ProgressiveProofUiState;
  nextEvidenceStep: ProofEvidenceStep | null;
  missingClaimTypes: string[];
  satisfiedClaimTypes: string[];
  /** Human-readable detail safe for UI (no PII). */
  detail: string;
  /** Sign-in alone cannot produce eligible without policy satisfaction. */
  signInIsNotProof: true;
}

export interface PartnerVerificationSurface {
  /** Documented result partners consume without adopting Sui. */
  decision: PolicyDecision | "pending" | "error";
  uiState: ProgressiveProofUiState;
  assuranceLevel: AssuranceLevel | null;
  receiptRequired: boolean;
  productionUsable: boolean;
  disclosedClaims: string[];
  withheld: readonly string[];
}
