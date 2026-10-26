// FILE: lib/partner/portableIndependentVerification/verifyWithStandaloneVerifier.ts

import {
  verifyAbraxasReceiptIndependently,
  type IndependentVerificationResult,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import type { PortableVerificationBundle } from "./buildPortableVerificationBundle";
import { assertBundledAnchorMatchesIntegratorPin } from "./trustAnchorPinning";
import { toIndependentVerifierRecord } from "@/lib/decisionReceipts/independentVerifierBridge";

export function verifyPortableBundle(input: {
  bundle: PortableVerificationBundle;
  /** Out-of-band pin — must match bundled anchor before verification proceeds. */
  integratorPinnedTrustAnchor: TrustAnchorBundleV1;
  partnerId: string;
  policyId: string;
  statementObservedAt?: string;
  minimumStatusVersion?: number;
  minimumRegistryVersion?: number;
  now?: Date;
}): IndependentVerificationResult {
  const bundled =
    input.bundle.bundled_trust_anchor ?? input.bundle.pinned_trust_anchor;
  const pinMatch = assertBundledAnchorMatchesIntegratorPin({
    bundled,
    integratorPinned: input.integratorPinnedTrustAnchor,
  });
  if (!pinMatch.ok) {
    return {
      contract_version: "abraxas_independent_verifier/1.1.0",
      cryptographically_authentic: false,
      issuer_currently_authorized: false,
      policy_and_audience_match: false,
      status_evidence_authentic: false,
      currently_acceptable: "indeterminate",
      phases: [
        {
          id: "integrator_trust_anchor_pin",
          status: "fail",
          detail: "Bundled trust anchor does not match integrator pin — bundle anchor is informational only.",
        },
      ],
      failure_codes: [pinMatch.reason],
      disclaimer:
        "Trust anchors must be established independently; never auto-trust a downloadable bundle anchor.",
    };
  }

  const environment = input.bundle.decision_receipt.decision_context === "production"
    ? "production"
    : "demo";
  let verifierRecord;
  try {
    verifierRecord = toIndependentVerifierRecord(input.bundle.decision_receipt);
  } catch {
    return {
      contract_version: "abraxas_independent_verifier/1.1.0",
      cryptographically_authentic: false,
      issuer_currently_authorized: false,
      policy_and_audience_match: false,
      status_evidence_authentic: false,
      currently_acceptable: "no",
      phases: [
        {
          id: "issuance_finalization",
          status: "fail",
          detail: "Receipt issuance is not finalized — not portable for current acceptability.",
        },
      ],
      failure_codes: ["issuance_incomplete"],
      disclaimer:
        "Portable verification requires finalized issuance and signed status evidence.",
    };
  }
  return verifyAbraxasReceiptIndependently({
    record: verifierRecord,
    pinnedTrustAnchor: input.integratorPinnedTrustAnchor,
    signedIssuerAuthority: input.bundle.signed_issuer_authority,
    signedStatusStatement: input.bundle.signed_status_statement,
    relyingParty: {
      partner_id: input.partnerId,
      policy_id: input.policyId,
      environment,
    },
    statementObservedAt: input.statementObservedAt ?? new Date().toISOString(),
    minimumStatusVersion: input.minimumStatusVersion,
    minimumRegistryVersion:
      input.minimumRegistryVersion
      ?? (input.bundle.registry_version > 1 ? input.bundle.registry_version - 1 : undefined),
    now: input.now,
  });
}
