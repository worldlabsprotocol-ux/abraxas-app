// FILE: lib/authenticationProof/productionReference.ts
// Production reference proofs — Cielo Sunrise + Chickasaw only.

import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";
import {
  envelopeFromRegistry,
  DEFAULT_POLICY_ID,
  attachVerifyProof,
} from "@/lib/partner/partnerDecision";
import { resolveVerifierQuery } from "@/lib/verifyRegistry";
import { issueVerifyDecisionArtifacts } from "./issueVerifyDecision";
import { getSelfVerifiedAuthenticationProof } from "./verifyProof";

export const PRODUCTION_REFERENCE_ASSETS = {
  cielo: {
    abxId: "ABX-RE-HOSP-001",
    name: "Cielo Sunrise",
    caseStudyPath: "/case-studies/cielo",
  },
  chickasaw: {
    abxId: CPG_ASSET.id,
    name: CPG_ASSET.name,
    caseStudyPath: CPG_ASSET.caseStudyPath,
  },
} as const;

const ALLOWED_ABX_IDS = new Set(
  Object.values(PRODUCTION_REFERENCE_ASSETS).map(a => a.abxId.toUpperCase()),
);

export function isProductionReferenceAsset(assetId: string): boolean {
  return ALLOWED_ABX_IDS.has(assetId.trim().toUpperCase());
}

export function resolveProductionReferenceAsset(assetId: string) {
  const normalized = assetId.trim().toUpperCase();
  if (normalized === PRODUCTION_REFERENCE_ASSETS.cielo.abxId) {
    return PRODUCTION_REFERENCE_ASSETS.cielo;
  }
  if (normalized === PRODUCTION_REFERENCE_ASSETS.chickasaw.abxId.toUpperCase()) {
    return PRODUCTION_REFERENCE_ASSETS.chickasaw;
  }
  return null;
}

/** Issue a live registry verification proof for a production reference asset. */
export async function issueProductionReferenceProof(assetId: string) {
  const meta = resolveProductionReferenceAsset(assetId);
  if (!meta) {
    return { error: "not_allowed" as const };
  }

  const registry = await resolveVerifierQuery(meta.abxId);
  const partnerId = "abraxas-production-reference";
  const response = envelopeFromRegistry(registry, DEFAULT_POLICY_ID, partnerId);

  const artifacts = await issueVerifyDecisionArtifacts({
    partnerId,
    response,
    mode: "registry",
  });

  const bundle = attachVerifyProof(response, artifacts);
  const verified = await getSelfVerifiedAuthenticationProof(artifacts.proof_id);

  return {
    asset: meta,
    registry_state: registry.state,
    verify_response: bundle,
    self_verified_proof: verified,
    how_to_reproduce: {
      method: "POST",
      path: "/api/credentials/verify",
      body: { record_id: meta.abxId, policy_id: DEFAULT_POLICY_ID },
      note: "Partner API key optional for public registry record lookup.",
    },
  };
}
