// FILE: lib/credentials/claimSchema.ts
// Canonical claim types for Compliance + Asset passports.

export type ClaimStatus = "active" | "suspended" | "revoked" | "expired" | "under_review";
export type AssuranceLevel = "L1" | "L2" | "L3" | "L4";

/** Machine-readable claim identifiers used in policies and APIs */
export type ClaimType =
  | "identity_verified"
  | "liveness_passed"
  | "government_id_verified"
  | "screening_outcome"
  | "risk_review"
  | "kyb_verified"
  | "ubo_verified"
  | "accredited_status"
  | "product_eligibility"
  | "wallet_binding_confirmed"
  | "wallet_risk_band"
  | "asset_ownership_reviewed"
  | "asset_title_verified"
  | "transfer_eligibility"
  | "residency_country";

export interface CredentialClaimRecord {
  id: string;
  subject_id: string;
  credential_jti: string | null;
  claim_type: ClaimType;
  claim_value: Record<string, unknown>;
  issuer_id: string;
  assurance_level: AssuranceLevel | null;
  issued_at: string;
  expires_at: string | null;
  status: ClaimStatus;
  revocation_reference: string | null;
  evidence_reference: string | null;
  jurisdiction: string | null;
  policy_scope: string | null;
}

export const CLAIM_ISSUERS = {
  veriff: "issuer:veriff",
  abraxas: "issuer:abraxas",
  reclaim: "issuer:reclaim",
  manual: "issuer:abraxas-manual",
  sandbox: "issuer:abraxas-sandbox",
} as const;

/** Claims issued after Abraxas independent capture (name + ID + selfie) */
export function abraxasCaptureApprovedClaims(input: {
  subjectId: string;
  jti: string;
  jurisdiction: string;
  documentType: string;
  captureSessionId: string;
  expiresAt: Date;
  assuranceLevel?: AssuranceLevel;
  reviewMethod?: "automated_biometric" | "human_biometric_match";
  biometricScores?: { face_match: number; liveness: number };
}): Omit<CredentialClaimRecord, "id" | "status">[] {
  const issuedAt = new Date().toISOString();
  const expiresAt = input.expiresAt.toISOString();
  const assurance = input.assuranceLevel ?? "L2";
  const reviewMethod = input.reviewMethod ?? "human_biometric_match";
  const base = {
    subject_id: input.subjectId,
    credential_jti: input.jti,
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: assurance,
    issued_at: issuedAt,
    expires_at: expiresAt,
    revocation_reference: null,
    evidence_reference: `abraxas_capture:${input.captureSessionId}`,
    jurisdiction: input.jurisdiction,
    policy_scope: "compliance",
  };

  const livenessNote = reviewMethod === "automated_biometric"
    ? "Abraxas Verify engine: automated face match + liveness signals"
    : "Device selfie compared to government ID by Abraxas reviewer";

  return [
    {
      ...base,
      claim_type: "identity_verified",
      claim_value: {
        document_type: input.documentType,
        provider: "abraxas_independent",
        review_method: reviewMethod,
        ...(input.biometricScores && {
          face_match_score: input.biometricScores.face_match,
          liveness_score: input.biometricScores.liveness,
        }),
      },
    },
    {
      ...base,
      claim_type: "government_id_verified",
      claim_value: { document_type: input.documentType, provider: "abraxas_capture" },
    },
    {
      ...base,
      claim_type: "liveness_passed",
      claim_value: {
        provider: "abraxas_capture",
        review_method: reviewMethod,
        note: livenessNote,
        ...(input.biometricScores && {
          face_match_score: input.biometricScores.face_match,
          liveness_score: input.biometricScores.liveness,
        }),
      },
      assurance_level: assurance,
    },
    {
      ...base,
      claim_type: "screening_outcome",
      claim_value: { outcome: "pending_partner_screen", note: "Full AML/OFAC program is partner-gated" },
      assurance_level: "L1",
    },
  ];
}

/** Claims issued after Abraxas manual identity review (pilot — no Veriff) */
export function manualApprovedClaims(input: {
  subjectId: string;
  jti: string;
  jurisdiction: string;
  documentType: string;
  reviewId: string;
  expiresAt: Date;
}): Omit<CredentialClaimRecord, "id" | "status">[] {
  const issuedAt = new Date().toISOString();
  const expiresAt = input.expiresAt.toISOString();
  const base = {
    subject_id: input.subjectId,
    credential_jti: input.jti,
    issuer_id: CLAIM_ISSUERS.manual,
    assurance_level: "L2" as AssuranceLevel,
    issued_at: issuedAt,
    expires_at: expiresAt,
    revocation_reference: null,
    evidence_reference: `manual_review:${input.reviewId}`,
    jurisdiction: input.jurisdiction,
    policy_scope: "compliance",
  };

  return [
    {
      ...base,
      claim_type: "identity_verified",
      claim_value: {
        document_type: input.documentType,
        provider: "abraxas_manual_review",
        review_method: "pilot_manual",
      },
    },
    {
      ...base,
      claim_type: "government_id_verified",
      claim_value: { document_type: input.documentType, provider: "manual" },
    },
    {
      ...base,
      claim_type: "liveness_passed",
      claim_value: { provider: "manual_review", note: "Live check via video call or in-person pilot" },
      assurance_level: "L1",
    },
    {
      ...base,
      claim_type: "screening_outcome",
      claim_value: { outcome: "pending_partner_screen", note: "Full AML/OFAC program is partner-gated" },
      assurance_level: "L1",
    },
  ];
}

/** Claims issued after successful Veriff approval */
export function veriffApprovedClaims(input: {
  subjectId: string;
  jti: string;
  jurisdiction: string;
  documentType: string;
  veriffSessionId: string;
  expiresAt: Date;
}): Omit<CredentialClaimRecord, "id" | "status">[] {
  const issuedAt = new Date().toISOString();
  const expiresAt = input.expiresAt.toISOString();
  const base = {
    subject_id: input.subjectId,
    credential_jti: input.jti,
    issuer_id: CLAIM_ISSUERS.veriff,
    assurance_level: "L2" as AssuranceLevel,
    issued_at: issuedAt,
    expires_at: expiresAt,
    revocation_reference: null,
    evidence_reference: `veriff:${input.veriffSessionId}`,
    jurisdiction: input.jurisdiction,
    policy_scope: "compliance",
  };

  return [
    {
      ...base,
      claim_type: "identity_verified",
      claim_value: {
        document_type: input.documentType,
        provider: "veriff",
      },
    },
    {
      ...base,
      claim_type: "government_id_verified",
      claim_value: { document_type: input.documentType },
    },
    {
      ...base,
      claim_type: "liveness_passed",
      claim_value: { provider: "veriff" },
    },
    {
      ...base,
      claim_type: "screening_outcome",
      claim_value: { outcome: "pending_partner_screen", note: "Full AML/OFAC program is partner-gated" },
      assurance_level: "L1",
    },
  ];
}

/** Wallet binding claim after zkLogin registration */
export function walletBindingClaim(input: {
  subjectId: string;
  walletAddress: string;
  bindingMethod?: string;
}): Omit<CredentialClaimRecord, "id" | "status"> {
  return {
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: "wallet_binding_confirmed",
    claim_value: {
      wallet_address: input.walletAddress,
      chain: "sui",
      binding_method: input.bindingMethod ?? "zklogin",
    },
    issuer_id: CLAIM_ISSUERS.abraxas,
    assurance_level: "L2",
    issued_at: new Date().toISOString(),
    expires_at: null,
    revocation_reference: null,
    evidence_reference: null,
    jurisdiction: null,
    policy_scope: "core",
  };
}

export function claimTypeLabel(type: ClaimType): string {
  const labels: Record<ClaimType, string> = {
    identity_verified: "Identity verified",
    liveness_passed: "Liveness passed",
    government_id_verified: "Government ID verified",
    screening_outcome: "Sanctions screening",
    risk_review: "PEP / adverse media review",
    kyb_verified: "KYB verified",
    ubo_verified: "Beneficial ownership verified",
    accredited_status: "Accredited investor",
    product_eligibility: "Product suitability",
    wallet_binding_confirmed: "Wallet binding",
    wallet_risk_band: "Wallet risk band",
    asset_ownership_reviewed: "Asset ownership reviewed",
    asset_title_verified: "Asset title verified",
    transfer_eligibility: "Transfer eligibility",
    residency_country: "Residency country",
  };
  return labels[type] ?? type;
}
