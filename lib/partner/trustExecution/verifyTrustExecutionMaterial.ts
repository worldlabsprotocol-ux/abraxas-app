// FILE: lib/partner/trustExecution/verifyTrustExecutionMaterial.ts

import {
  verifyAbraxasReceiptIndependently,
  type IndependentVerificationResult,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import { buildTrustAnchorBundleV1 } from "@/lib/persistence/boundary/trustDistribution/buildTrustAnchorBundle";
import type { TrustExecutionVerificationMaterial } from "./trustExecutionTypes";

export function verifyTrustExecutionMaterial(input: {
  material: TrustExecutionVerificationMaterial;
  pinnedTrustAnchor: TrustAnchorBundleV1;
  partnerId: string;
  policyId: string;
  environment?: "demo" | "production";
  statementObservedAt?: string;
}): IndependentVerificationResult {
  if (!input.material.signed_issuer_authority || !input.material.signed_status_statement) {
    return {
      contract_version: "abraxas_independent_verifier/1.1.0",
      cryptographically_authentic: false,
      issuer_currently_authorized: false,
      policy_and_audience_match: false,
      status_evidence_authentic: false,
      currently_acceptable: "indeterminate",
      phases: [
        {
          id: "portable_material",
          status: "fail",
          detail: "Signed issuer authority and signed status are required for independent verification.",
        },
      ],
      failure_codes: ["verification_material_incomplete"],
      disclaimer: "Relying parties must verify locally; HTTP success is not proof.",
    };
  }

  return verifyAbraxasReceiptIndependently({
    record: input.material.portable_receipt,
    pinnedTrustAnchor: input.pinnedTrustAnchor,
    signedIssuerAuthority: input.material.signed_issuer_authority,
    relyingParty: {
      partner_id: input.partnerId,
      policy_id: input.policyId,
      environment: input.environment ?? "demo",
    },
    statementObservedAt: input.statementObservedAt ?? new Date().toISOString(),
    signedStatusStatement: input.material.signed_status_statement,
  });
}

export function buildDemoTrustAnchorFromEnv(env: Record<string, string | undefined>): TrustAnchorBundleV1 | null {
  const raw = env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_PUBLIC_JWK;
  if (!raw?.trim()) return null;
  try {
    const anchorPublicJwk = JSON.parse(raw) as JsonWebKey;
    return buildTrustAnchorBundleV1({
      anchorKeyId: env.ABRAXAS_ISSUER_AUTHORITY_ANCHOR_KEY_ID ?? "demo-trust-anchor",
      anchorPublicJwk,
      environment: "demo",
      statusStatementMaxAgeSeconds: 3600,
    });
  } catch {
    return null;
  }
}
