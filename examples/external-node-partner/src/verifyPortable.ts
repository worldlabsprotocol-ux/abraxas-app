import {
  validateTrustAnchorBundle,
  verifyAbraxasReceiptIndependently,
  type TrustAnchorBundleV1,
} from "@abraxas/independent-verifier";
import type { PortableBundle } from "./abraxasHttp.js";
import { enforcementFromVerification } from "./enforce.js";

function assertBundledMatchesPin(bundled: TrustAnchorBundleV1, pin: TrustAnchorBundleV1): { ok: true } | { ok: false; reason: string } {
  if (bundled.public_key_fingerprint !== pin.public_key_fingerprint) {
    return { ok: false, reason: "anchor_fingerprint_mismatch" };
  }
  return { ok: true };
}

export function verifyPortableBundle(input: {
  bundle: PortableBundle;
  pinnedTrustAnchor: TrustAnchorBundleV1;
  expectedPartnerId: string;
  expectedPolicyId: string;
  environment: "demo" | "production";
  minimumStatusVersion?: number;
  minimumRegistryVersion?: number;
  now?: Date;
}) {
  const pinMatch = assertBundledMatchesPin(input.bundle.bundled_trust_anchor, input.pinnedTrustAnchor);
  if (!pinMatch.ok) {
    return {
      verification: {
        contract_version: "abraxas_independent_verifier/1.1.0" as const,
        cryptographically_authentic: false,
        issuer_currently_authorized: false,
        policy_and_audience_match: false,
        status_evidence_authentic: false,
        currently_acceptable: "indeterminate" as const,
        phases: [],
        failure_codes: [pinMatch.reason],
        disclaimer: "",
      },
      enforcement: { action: "indeterminate" as const, failure_codes: [pinMatch.reason] },
    };
  }

  const verified = verifyAbraxasReceiptIndependently({
    record: input.bundle.decision_receipt,
    pinnedTrustAnchor: input.pinnedTrustAnchor,
    signedIssuerAuthority: input.bundle.signed_issuer_authority,
    signedStatusStatement: input.bundle.signed_status_statement,
    relyingParty: {
      partner_id: input.expectedPartnerId,
      policy_id: input.expectedPolicyId,
      environment: input.environment,
    },
    minimumStatusVersion: input.minimumStatusVersion,
    minimumRegistryVersion: input.minimumRegistryVersion,
    statementObservedAt: (input.now ?? new Date()).toISOString(),
    now: input.now,
  });

  return { verification: verified, enforcement: enforcementFromVerification(verified) };
}

export function loadPinnedTrustAnchor(raw: unknown): TrustAnchorBundleV1 {
  const validated = validateTrustAnchorBundle(raw as TrustAnchorBundleV1);
  if (!validated.ok) throw new Error(`invalid_trust_anchor:${validated.reason}`);
  return raw as TrustAnchorBundleV1;
}
