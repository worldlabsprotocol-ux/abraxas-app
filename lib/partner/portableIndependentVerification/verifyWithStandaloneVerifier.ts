// FILE: lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier.ts

import {
  verifyAbraxasReceiptIndependently,
  type IndependentVerificationResult,
} from "@abraxas/independent-verifier";
import type { PortableVerificationBundle } from "./buildPortableVerificationBundle";

export function verifyPortableBundle(input: {
  bundle: PortableVerificationBundle;
  partnerId: string;
  policyId: string;
  statementObservedAt?: string;
  minimumStatusVersion?: number;
}): IndependentVerificationResult {
  const environment = input.bundle.decision_receipt.decision_context === "production"
    ? "production"
    : "demo";
  return verifyAbraxasReceiptIndependently({
    record: input.bundle.decision_receipt,
    pinnedTrustAnchor: input.bundle.pinned_trust_anchor,
    signedIssuerAuthority: input.bundle.signed_issuer_authority,
    signedStatusStatement: input.bundle.signed_status_statement,
    relyingParty: {
      partner_id: input.partnerId,
      policy_id: input.policyId,
      environment,
    },
    statementObservedAt: input.statementObservedAt ?? new Date().toISOString(),
    minimumStatusVersion: input.minimumStatusVersion,
    minimumRegistryVersion: input.bundle.registry_version > 1 ? input.bundle.registry_version - 1 : undefined,
  });
}
