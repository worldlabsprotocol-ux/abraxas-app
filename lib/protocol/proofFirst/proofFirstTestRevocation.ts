// FILE: lib/protocol/proofFirst/proofFirstTestRevocation.ts
// Shared synthetic portable revocation for proof-first tests.

import {
  bootstrapTrustFromArtifact,
  build546PortableRevocationIssuerTrust,
  buildSyntheticPortableRevocationSnapshot,
  InMemoryPortableRevocationCheckpointStore,
  type PortableRevocationBootstrapTrust,
  type PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import type { ProofFirstRelyingPartyConfig } from "./proofFirstRelyingParty";

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

export type ProofFirstPortableRevocationTestContext = {
  checkpointStore: InMemoryPortableRevocationCheckpointStore;
  bootstrapTrusts: PortableRevocationBootstrapTrust[];
  registerBootstrapForSnapshot(artifact: PortableRevocationSignedArtifact): void;
};

export function createProofFirstPortableRevocationTestContext(): ProofFirstPortableRevocationTestContext {
  const checkpointStore = new InMemoryPortableRevocationCheckpointStore();
  const bootstrapTrusts: PortableRevocationBootstrapTrust[] = [];
  return {
    checkpointStore,
    bootstrapTrusts,
    registerBootstrapForSnapshot(artifact) {
      bootstrapTrusts.push(bootstrapTrustFromArtifact({ artifact }));
    },
  };
}

export function withProofFirstPortableRevocation(
  rp: ProofFirstRelyingPartyConfig,
  ctx: ProofFirstPortableRevocationTestContext,
): ProofFirstRelyingPartyConfig {
  return {
    ...rp,
    portableRevocation: {
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore: ctx.checkpointStore,
      bootstrapTrusts: ctx.bootstrapTrusts,
    },
  };
}

export function rpWithSnapshotBootstrap(
  rp: ProofFirstRelyingPartyConfig,
  ctx: ProofFirstPortableRevocationTestContext,
  snapshot: PortableRevocationSignedArtifact,
): ProofFirstRelyingPartyConfig {
  ctx.registerBootstrapForSnapshot(snapshot);
  return withProofFirstPortableRevocation(rp, ctx);
}
