// FILE: lib/protocol/proofFirst/portableRevocationStrict.ts
// Build #564 — authenticated portable revocation for proof-first RP path.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
import {
  revocationSourceFromPortableSnapshot,
  verifyPortableRevocationArtifact,
  type PortableRevocationSignedArtifact,
  type PortableRevocationVerification,
} from "@/lib/protocol/portableRevocation";

export type StrictPortableRevocationResolution = {
  revocationSource: RevocationSourceState;
  portable_revocation_authenticated: boolean;
  portable_revocation_verification: PortableRevocationVerification | null;
  /** Caller supplied unsigned revocation hint without authenticated snapshot. */
  unsigned_revocation_hint_rejected: boolean;
};

/**
 * Strict proof-first path: authorization requires a verified portable revocation snapshot.
 * Raw `revocationSource` hints are never sufficient for a pass.
 */
export function resolveStrictPortableRevocation(input: {
  signed: DecisionReceiptRecord;
  now?: Date;
  env?: Record<string, string | undefined>;
  portableRevocationSnapshot?: PortableRevocationSignedArtifact;
  previousPortableRevocationSnapshot?: PortableRevocationSignedArtifact;
  revocationSource?: RevocationSourceState;
}): StrictPortableRevocationResolution {
  const unsignedHint =
    input.revocationSource?.available === true
    && !input.portableRevocationSnapshot;

  if (!input.portableRevocationSnapshot) {
    return {
      revocationSource: { available: false, reason: "unavailable" },
      portable_revocation_authenticated: false,
      portable_revocation_verification: null,
      unsigned_revocation_hint_rejected: unsignedHint,
    };
  }

  const artifactVerification = verifyPortableRevocationArtifact({
    artifact: input.portableRevocationSnapshot,
    now: input.now,
    env: input.env,
    previousArtifact: input.previousPortableRevocationSnapshot,
  });

  const mapped = revocationSourceFromPortableSnapshot({
    artifact: input.portableRevocationSnapshot,
    receiptId: input.signed.id,
    now: input.now,
    env: input.env,
    previousArtifact: input.previousPortableRevocationSnapshot,
  });

  return {
    revocationSource: mapped.available
      ? { available: true as const, status: mapped.status }
      : { available: false as const, reason: mapped.reason ?? "unavailable" },
    portable_revocation_authenticated: artifactVerification.ok,
    portable_revocation_verification: mapped.verification,
    unsigned_revocation_hint_rejected: false,
  };
}
