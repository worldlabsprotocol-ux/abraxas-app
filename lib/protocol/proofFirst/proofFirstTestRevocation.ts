// FILE: lib/protocol/proofFirst/proofFirstTestRevocation.ts
// Shared synthetic portable revocation for proof-first tests.

import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import type { PortableRevocationSignedArtifact } from "@/lib/protocol/portableRevocation";

export function activePortableRevocationSnapshotForReceipt(
  receiptId: string,
  overrides?: Parameters<typeof buildSyntheticPortableRevocationSnapshot>[0],
): PortableRevocationSignedArtifact {
  return buildSyntheticPortableRevocationSnapshot({
    receiptId,
    state: "active",
    ...overrides,
  });
}
