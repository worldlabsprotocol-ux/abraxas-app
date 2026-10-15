// FILE: lib/passport/reusableCredential/build566.trustBoundary.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { BUILD_546_FIXTURE_NOW } from "@/lib/institutionalCertification/build546/fixtures";
import {
  InMemoryPortableRevocationCheckpointStore,
  bootstrapTrustFromArtifact,
  buildSyntheticPortableRevocationSnapshot,
} from "@/lib/protocol/portableRevocation";
import { verifyCredentialPortableRevocationStrict } from "./credentialRevocationStrict";
import {
  build566SyntheticReusableCredential,
  build566TrustEnv,
  BUILD_566_CREDENTIAL_ISSUER,
  BUILD_566_CREDENTIAL_ISSUER_KEY,
} from "./fixtures";
import { credentialIssuerRegistryFromKeyPair, loadPassportCredentialIssuerRegistry } from "./credentialIssuerRegistry";
import { PORTABLE_REVOCATION_TEST_ISSUER_ID } from "@/lib/protocol/portableRevocation/fixtures";
import { BUILD_546_PRIMARY_KEY } from "@/lib/institutionalCertification/build546/fixtures";

describe("Build #566 strict credential revocation", () => {
  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    Object.assign(process.env, build566TrustEnv());
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  it("fails closed on rollback snapshot against checkpoint", async () => {
    const credential = build566SyntheticReusableCredential();
    const receiptId = credential.payload.credential_id;
    const seq1 = buildSyntheticPortableRevocationSnapshot({ receiptId, sequence: 1 });
    const seq2 = buildSyntheticPortableRevocationSnapshot({
      receiptId,
      sequence: 2,
      previousSnapshot: seq1,
    });
    const store = new InMemoryPortableRevocationCheckpointStore();
    const entry = credentialIssuerRegistryFromKeyPair({
      issuerId: BUILD_566_CREDENTIAL_ISSUER,
      key: BUILD_566_CREDENTIAL_ISSUER_KEY,
      revocationIssuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      snapshotSigningKeyIds: [BUILD_546_PRIMARY_KEY.signingKeyId],
    });
    const bootstrap = [bootstrapTrustFromArtifact({ artifact: seq1 })];
    const base = {
      credential,
      registryEntry: entry,
      checkpointStore: store,
      bootstrapTrusts: bootstrap,
      now: BUILD_546_FIXTURE_NOW,
    };

    const first = await verifyCredentialPortableRevocationStrict({ ...base, artifact: seq1 });
    expect(first.ok).toBe(true);

    const advanced = await verifyCredentialPortableRevocationStrict({
      ...base,
      artifact: seq2,
      bootstrapTrusts: [],
    });
    expect(advanced.ok).toBe(true);

    const rollback = await verifyCredentialPortableRevocationStrict({
      ...base,
      artifact: seq1,
      bootstrapTrusts: [],
    });
    expect(rollback.ok).toBe(false);
  });

  it("issuer registry resolves trust without caller supplied public key", () => {
    const registry = loadPassportCredentialIssuerRegistry(process.env as Record<string, string>);
    expect(registry.length).toBeGreaterThan(0);
    expect(registry[0].issuer_id).toBe(BUILD_566_CREDENTIAL_ISSUER);
  });
});
