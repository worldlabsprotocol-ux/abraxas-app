// FILE: lib/protocol/portableRevocation/fixtures.ts
// Synthetic portable revocation snapshots for isolated tests.

import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PRIMARY_KEY,
} from "@/lib/institutionalCertification/build546/fixtures";
import type { ReceiptSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { buildPortableRevocationPayload, signPortableRevocationSnapshot } from "./sign";
import type { PortableRevocationSignedArtifact } from "./contract";

export const PORTABLE_REVOCATION_TEST_ISSUER_ID = "issuer:abraxas-portable-revocation-test";

export function buildSyntheticPortableRevocationSnapshot(input: {
  receiptId: string;
  state?: "active" | "revoked";
  signingKey?: ReceiptSigningKeyPair;
  sequence?: number;
  issuedAt?: string;
  expiresAt?: string;
  maxFreshnessSeconds?: number;
  previousSnapshot?: PortableRevocationSignedArtifact | null;
}): PortableRevocationSignedArtifact {
  const key = input.signingKey ?? BUILD_546_PRIMARY_KEY;
  const issuedAt = input.issuedAt ?? BUILD_546_FIXTURE_NOW.toISOString();
  const expiresAt = input.expiresAt ?? "2027-06-01T12:00:00.000Z";
  const previousSnapshotHash = input.previousSnapshot
    ? input.previousSnapshot.payload_hash
    : null;

  const payload = buildPortableRevocationPayload({
    issuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
    signingKeyId: key.signingKeyId,
    snapshotSequence: input.sequence ?? 1,
    issuedAt,
    expiresAt,
    maxFreshnessSeconds: input.maxFreshnessSeconds ?? 86_400,
    previousSnapshotHash,
    receiptStates: [
      {
        receiptId: input.receiptId,
        state: input.state ?? "active",
        updatedAt: issuedAt,
      },
    ],
  });

  return signPortableRevocationSnapshot({ payload, signingKey: key });
}
