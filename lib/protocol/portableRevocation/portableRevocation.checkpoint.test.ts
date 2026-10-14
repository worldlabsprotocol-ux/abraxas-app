// FILE: lib/protocol/portableRevocation/portableRevocation.checkpoint.test.ts

import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import {
  bootstrapTrustFromArtifact,
  build546PortableRevocationIssuerTrust,
  buildSyntheticPortableRevocationSnapshot,
  FilesystemPortableRevocationCheckpointStore,
  InMemoryPortableRevocationCheckpointStore,
  PORTABLE_REVOCATION_TEST_ISSUER_ID,
  verifyPortableRevocationAtRelyingParty,
} from "@/lib/protocol/portableRevocation";

describe("Build #564 checkpoint compare-and-advance", () => {
  let env: Record<string, string>;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  function presentation(receiptId: string) {
    const signed = build546SampleRecord(undefined, { id: receiptId });
    return composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
  }

  it("concurrent adjacent updates — only monotonic high-water survives", async () => {
    const store = new InMemoryPortableRevocationCheckpointStore();
    const presentationA = presentation("dr_concurrent_a");
    const seq1 = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_concurrent_a", sequence: 1 });
    const seq2 = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_concurrent_a",
      sequence: 2,
      previousSnapshot: seq1,
    });
    const bootstrap = [bootstrapTrustFromArtifact({ artifact: seq1 })];
    const base = {
      receipt: presentationA.signed_decision_receipt,
      now: BUILD_546_FIXTURE_NOW,
      env,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore: store,
      bootstrapTrusts: bootstrap,
    };

    await verifyPortableRevocationAtRelyingParty({ artifact: seq1, ...base });
    const parallel = await Promise.all([
      verifyPortableRevocationAtRelyingParty({ artifact: seq2, ...base, bootstrapTrusts: [] }),
      verifyPortableRevocationAtRelyingParty({ artifact: seq2, ...base, bootstrapTrusts: [] }),
    ]);
    expect(parallel.every((row) => row.verification.ok)).toBe(true);
    const rollback = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1,
      ...base,
      bootstrapTrusts: [],
    });
    expect(rollback.verification.ok).toBe(false);
    expect(rollback.verification.codes).toContain("rollback_against_checkpoint");
    const checkpoint = await store.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID);
    expect(checkpoint?.highest_sequence).toBe(2);
  });

  it("identical sequence conflicting hashes — rejected", async () => {
    const store = new InMemoryPortableRevocationCheckpointStore();
    const seq1a = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_conflict", sequence: 1 });
    const seq1b = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_conflict_other",
      sequence: 1,
    });
    const presentationB = presentation("dr_conflict_other");
    const base = {
      receipt: presentationB.signed_decision_receipt,
      now: BUILD_546_FIXTURE_NOW,
      env,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore: store,
    };
    store.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: seq1a.payload_hash,
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const conflict = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1b,
      ...base,
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: seq1b })],
    });
    expect(conflict.verification.ok).toBe(false);
    expect(conflict.verification.codes).toContain("hash_conflict_at_sequence");
  });

  it("bootstrap cannot bypass existing higher checkpoint", async () => {
    const store = new InMemoryPortableRevocationCheckpointStore();
    const seq5 = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_bypass", sequence: 5 });
    store.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 5,
      last_payload_hash: seq5.payload_hash,
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const seq1 = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_bypass", sequence: 1 });
    const result = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1,
      receipt: presentation("dr_bypass").signed_decision_receipt,
      now: BUILD_546_FIXTURE_NOW,
      env,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore: store,
      bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: seq1 })],
    });
    expect(result.verification.ok).toBe(false);
    expect(result.verification.codes).toContain("bootstrap_bypass_rejected");
  });

  it("filesystem checkpoint survives restart and blocks rollback", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abraxas-rp-checkpoint-"));
    try {
      const storeA = await FilesystemPortableRevocationCheckpointStore.open(dir);
      const presentationR = presentation("dr_restart");
      const seq1 = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_restart", sequence: 1 });
      const seq2 = buildSyntheticPortableRevocationSnapshot({
        receiptId: "dr_restart",
        sequence: 2,
        previousSnapshot: seq1,
      });
      const base = {
        receipt: presentationR.signed_decision_receipt,
        now: BUILD_546_FIXTURE_NOW,
        env,
        issuerTrust: build546PortableRevocationIssuerTrust(),
        bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: seq1 })],
      };
      const first = await verifyPortableRevocationAtRelyingParty({
        artifact: seq1,
        checkpointStore: storeA,
        ...base,
      });
      expect(first.verification.ok).toBe(true);
      const advanced = await verifyPortableRevocationAtRelyingParty({
        artifact: seq2,
        checkpointStore: storeA,
        ...base,
        bootstrapTrusts: [],
      });
      if (!advanced.verification.ok) {
        throw new Error(`seq2 failed: ${advanced.verification.codes.join(",")}`);
      }
      expect(advanced.verification.ok).toBe(true);
      expect(
        (await storeA.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID))?.highest_sequence,
      ).toBe(2);

      const storeB = await FilesystemPortableRevocationCheckpointStore.open(dir);
      const rollback = await verifyPortableRevocationAtRelyingParty({
        artifact: seq1,
        checkpointStore: storeB,
        ...base,
        bootstrapTrusts: [],
      });
      expect(rollback.verification.ok).toBe(false);
      expect(rollback.verification.codes).toContain("rollback_against_checkpoint");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("corrupted checkpoint storage fails closed at proof-first RP", async () => {
    const dir = await mkdtemp(join(tmpdir(), "abraxas-rp-checkpoint-corrupt-"));
    try {
      const store = await FilesystemPortableRevocationCheckpointStore.open(dir);
      const path = join(
        dir,
        `${createHash("sha256").update(PORTABLE_REVOCATION_TEST_ISSUER_ID).digest("hex")}.checkpoint.json`,
      );
      await writeFile(path, "{not-json", "utf8");
      const presentationC = presentation("dr_corrupt");
      const snapshot = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_corrupt", sequence: 1 });
      const decision = await verifyHolderPresentationAtRelyingParty({
        presentation: presentationC,
        requestId: "req_corrupt_checkpoint",
        rp: {
          partnerId: BUILD_546_PARTNER_ID,
          policyId: BUILD_546_POLICY_ID,
          env,
          portableRevocation: {
            issuerTrust: build546PortableRevocationIssuerTrust(),
            checkpointStore: store,
            bootstrapTrusts: [bootstrapTrustFromArtifact({ artifact: snapshot })],
          },
        },
        now: BUILD_546_FIXTURE_NOW,
        portableRevocationSnapshot: snapshot,
      });
      expect(decision.outcome).toBe("blocked");
      expect(decision.portable_revocation_codes).toContain("checkpoint_storage_unavailable");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
