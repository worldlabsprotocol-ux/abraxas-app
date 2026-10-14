// FILE: lib/protocol/proofFirst/portableRevocationStrict.ts
// Build #564 — authenticated portable revocation for proof-first RP path.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { RevocationSourceState } from "@/lib/institutionalCertification/build546/independentVerifier";
import {
  verifyPortableRevocationAtRelyingParty,
  type PortableRevocationSignedArtifact,
  type PortableRevocationVerification,
} from "@/lib/protocol/portableRevocation";
import type { ProofFirstRelyingPartyConfig } from "./proofFirstRelyingParty";

export type StrictPortableRevocationResolution = {
  revocationSource: RevocationSourceState;
  portable_revocation_authenticated: boolean;
  portable_revocation_verification: PortableRevocationVerification | null;
  /** Caller supplied unsigned revocation hint without authenticated snapshot. */
  unsigned_revocation_hint_rejected: boolean;
};

function snapshotLayerAuthenticated(codes: PortableRevocationVerification["codes"]): boolean {
  return !codes.some(
    (code) => code !== "receipt_revoked" && code !== "receipt_not_in_snapshot",
  );
}

/**
 * Strict proof-first path: authorization requires a verified portable revocation snapshot.
 * Raw `revocationSource` hints are never sufficient for a pass.
 */
export async function resolveStrictPortableRevocation(input: {
  signed: DecisionReceiptRecord;
  now?: Date;
  rp: ProofFirstRelyingPartyConfig;
  portableRevocationSnapshot?: PortableRevocationSignedArtifact;
  revocationSource?: RevocationSourceState;
}): Promise<StrictPortableRevocationResolution> {
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

  const portable = input.rp.portableRevocation;
  if (!portable) {
    const verification: PortableRevocationVerification = {
      ok: false,
      codes: ["checkpoint_unavailable"],
      snapshot_sequence: input.portableRevocationSnapshot.payload.snapshot_sequence,
      issuer_id: input.portableRevocationSnapshot.payload.issuer_id,
    };
    return {
      revocationSource: { available: false, reason: "unavailable" },
      portable_revocation_authenticated: false,
      portable_revocation_verification: verification,
      unsigned_revocation_hint_rejected: false,
    };
  }

  const result = await verifyPortableRevocationAtRelyingParty({
    artifact: input.portableRevocationSnapshot,
    receipt: input.signed,
    now: input.now,
    env: input.rp.env,
    issuerTrust: portable.issuerTrust,
    checkpointStore: portable.checkpointStore,
    bootstrapTrusts: portable.bootstrapTrusts,
    clockSkewSeconds: portable.clockSkewSeconds,
    advanceCheckpointOnSuccess: portable.advanceCheckpointOnSuccess,
  });

  return {
    revocationSource: result.revocationSource,
    portable_revocation_authenticated: snapshotLayerAuthenticated(result.verification.codes),
    portable_revocation_verification: result.verification,
    unsigned_revocation_hint_rejected: false,
  };
}
