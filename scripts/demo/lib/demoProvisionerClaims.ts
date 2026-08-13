// FILE: scripts/demo/lib/demoProvisionerClaims.ts
// Build provisioner claim payloads from canonical pure claim builders.

import {
  manualApprovedClaims,
  walletBindingClaim,
  type CredentialClaimRecord,
} from "@/lib/credentials/claimSchema";
import { SANDBOX_ISSUER_ID, sandboxClaimMetadata } from "@/lib/credentials/sandboxClaims";
import {
  DEMO_SCREENING_TTL_HOURS,
  DEMO_SYNTHETIC_DOCUMENT_TYPE,
  DEMO_SYNTHETIC_JURISDICTION,
  sandboxEvidenceReference,
} from "./demoProvisionerConfig";

export type ProvisionerClaimInsert = Omit<CredentialClaimRecord, "id" | "status">;

export function buildManualProvisionerClaims(input: {
  subjectId: string;
  jti: string;
  provisionId: string;
  expiresAt: Date;
  issuedAt?: Date;
}): ProvisionerClaimInsert[] {
  const expiresAt = input.expiresAt;
  const claims = manualApprovedClaims({
    subjectId: input.subjectId,
    jti: input.jti,
    jurisdiction: DEMO_SYNTHETIC_JURISDICTION,
    documentType: DEMO_SYNTHETIC_DOCUMENT_TYPE,
    reviewId: input.provisionId,
    expiresAt,
  });

  const wallet = walletBindingClaim({
    subjectId: input.subjectId,
    walletAddress: input.subjectId,
    bindingMethod: "zklogin",
  });

  if (input.issuedAt) {
    const issuedIso = input.issuedAt.toISOString();
    return [...claims, wallet].map((claim) => ({
      ...claim,
      issued_at: issuedIso,
    }));
  }

  return [...claims, wallet];
}

export function buildSandboxScreeningClaim(input: {
  subjectId: string;
  provisionId: string;
  createdAt: Date;
}): ProvisionerClaimInsert {
  const expiresAt = new Date(
    input.createdAt.getTime() + DEMO_SCREENING_TTL_HOURS * 60 * 60 * 1000,
  );

  return {
    subject_id: input.subjectId,
    credential_jti: null,
    claim_type: "screening_outcome",
    claim_value: {
      outcome: "clear",
      ...sandboxClaimMetadata(),
      note: "Demo screening only — not a real sanctions or AML clearance.",
      synthetic_demo_holder: true,
    },
    issuer_id: SANDBOX_ISSUER_ID,
    assurance_level: "L1",
    issued_at: input.createdAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    revocation_reference: null,
    evidence_reference: sandboxEvidenceReference(input.provisionId),
    jurisdiction: null,
    policy_scope: "sandbox",
  };
}

export function manualClaimTypesForProvisioner(): string[] {
  return [
    "identity_verified",
    "government_id_verified",
    "liveness_passed",
    "screening_outcome",
    "residency_country",
    "wallet_binding_confirmed",
  ];
}
