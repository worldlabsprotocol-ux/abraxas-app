// FILE: lib/protocol/portableRevocation/portableRevocation.security.test.ts
// Build #564 final — adversarial portable revocation feed tests.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import {
  activePortableRevocationSnapshotForReceipt,
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import {
  bootstrapTrustFromArtifact,
  build546PortableRevocationIssuerTrust,
  buildPortableRevocationPayload,
  buildSyntheticPortableRevocationSnapshot,
  InMemoryPortableRevocationCheckpointStore,
  PORTABLE_REVOCATION_TEST_ISSUER_ID,
  signPortableRevocationSnapshot,
  verifyPortableRevocationArtifact,
  verifyPortableRevocationAtRelyingParty,
} from "@/lib/protocol/portableRevocation";

describe("Build #564 portable revocation security (synthetic)", () => {
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

  function presentationForReceiptId(receiptId = "dr_build546_valid") {
    const signed = build546SampleRecord(BUILD_546_PRIMARY_KEY, { id: receiptId });
    return composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
  }

  async function verifySnapshotAtRp(input: {
    presentation: ReturnType<typeof presentationForReceiptId>;
    snapshot: ReturnType<typeof buildSyntheticPortableRevocationSnapshot>;
    bootstrap?: boolean;
    checkpointStore?: InMemoryPortableRevocationCheckpointStore;
  }) {
    const store = input.checkpointStore ?? new InMemoryPortableRevocationCheckpointStore();
    const bootstrapTrusts = input.bootstrap
      ? [bootstrapTrustFromArtifact({ artifact: input.snapshot })]
      : [];
    return verifyPortableRevocationAtRelyingParty({
      artifact: input.snapshot,
      receipt: input.presentation.signed_decision_receipt,
      now: BUILD_546_FIXTURE_NOW,
      env,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore: store,
      bootstrapTrusts,
    });
  }

  it("E2E: issuer → holder presentation → authenticated snapshot → local RP grant", async () => {
    const presentation = presentationForReceiptId();
    const snapshot = activePortableRevocationSnapshotForReceipt(presentation.signed_decision_receipt.id);
    const ctx = createProofFirstPortableRevocationTestContext();
    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_564_e2e",
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
        ctx,
        snapshot,
      ),
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      harness,
    });
    expect(decision.outcome).toBe("granted");
    expect(decision.portable_revocation_authenticated).toBe(true);
    expect(decision.abraxas_infrastructure_required).toBe(false);
  });

  it("forged feed signature — artifact verify fails", () => {
    const artifact = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_x" });
    const tampered = {
      ...artifact,
      signature: artifact.signature.slice(0, -4) + "AAAA",
    };
    const result = verifyPortableRevocationArtifact({
      artifact: tampered,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("signature_invalid");
  });

  it("unauthorized issuer — unrelated issuer_id rejected at RP bind", async () => {
    const presentation = presentationForReceiptId();
    const payload = buildPortableRevocationPayload({
      issuerId: "issuer:rogue-unrelated",
      signingKeyId: BUILD_546_PRIMARY_KEY.signingKeyId,
      snapshotSequence: 1,
      issuedAt: BUILD_546_FIXTURE_NOW.toISOString(),
      expiresAt: "2027-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 86_400,
      previousSnapshotHash: null,
      receiptStates: [
        {
          receiptId: presentation.signed_decision_receipt.id,
          state: "active",
          updatedAt: BUILD_546_FIXTURE_NOW.toISOString(),
        },
      ],
    });
    const artifact = signPortableRevocationSnapshot({ payload, signingKey: BUILD_546_PRIMARY_KEY });
    const result = await verifySnapshotAtRp({
      presentation,
      snapshot: artifact,
      bootstrap: true,
    });
    expect(result.verification.ok).toBe(false);
    expect(result.verification.codes).toContain("issuer_authority_mismatch");
  });

  it("unauthorized signing key — unknown_signing_key", () => {
    const payload = buildPortableRevocationPayload({
      issuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      signingKeyId: BUILD_546_UNKNOWN_KEY.signingKeyId,
      snapshotSequence: 1,
      issuedAt: BUILD_546_FIXTURE_NOW.toISOString(),
      expiresAt: "2027-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 86_400,
      previousSnapshotHash: null,
      receiptStates: [{ receiptId: "dr_x", state: "active", updatedAt: BUILD_546_FIXTURE_NOW.toISOString() }],
    });
    const artifact = signPortableRevocationSnapshot({ payload, signingKey: BUILD_546_UNKNOWN_KEY });
    const result = verifyPortableRevocationArtifact({
      artifact,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("unknown_signing_key");
  });

  it("valid but rolled-back snapshot rejected against RP checkpoint", async () => {
    const presentation = presentationForReceiptId("dr_rb");
    const store = new InMemoryPortableRevocationCheckpointStore();
    const seq1 = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_rb", sequence: 1 });
    const seq2 = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_rb",
      sequence: 2,
      previousSnapshot: seq1,
    });
    store.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 2,
      last_payload_hash: seq2.payload_hash,
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const rolled = await verifySnapshotAtRp({
      presentation,
      snapshot: seq1,
      checkpointStore: store,
    });
    expect(rolled.verification.ok).toBe(false);
    expect(rolled.verification.codes).toContain("rollback_against_checkpoint");
  });

  it("expired and stale snapshots rejected", async () => {
    const presentation = presentationForReceiptId("dr_exp");
    const expired = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_exp",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    const expiredResult = await verifySnapshotAtRp({
      presentation,
      snapshot: expired,
      bootstrap: true,
    });
    expect(expiredResult.verification.codes).toContain("snapshot_expired");

    const stale = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_stale",
      issuedAt: "2026-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 60,
    });
    const staleResult = await verifySnapshotAtRp({
      presentation: presentationForReceiptId("dr_stale"),
      snapshot: stale,
      bootstrap: true,
    });
    expect(staleResult.verification.codes).toContain("snapshot_stale");
  });

  it("future-dated snapshot rejected beyond clock skew", async () => {
    const presentation = presentationForReceiptId("dr_future");
    const future = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_future",
      issuedAt: "2026-06-15T13:00:00.000Z",
    });
    const result = await verifySnapshotAtRp({ presentation, snapshot: future, bootstrap: true });
    expect(result.verification.codes).toContain("snapshot_future_dated");
  });

  it("invalid chain continuity rejected", async () => {
    const presentation = presentationForReceiptId("dr_chain");
    const store = new InMemoryPortableRevocationCheckpointStore();
    const prev = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_chain", sequence: 1 });
    await verifySnapshotAtRp({ presentation, snapshot: prev, bootstrap: true, checkpointStore: store });
    const payload = buildPortableRevocationPayload({
      issuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      signingKeyId: BUILD_546_PRIMARY_KEY.signingKeyId,
      snapshotSequence: 2,
      issuedAt: BUILD_546_FIXTURE_NOW.toISOString(),
      expiresAt: "2027-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 86_400,
      previousSnapshotHash: "0".repeat(64),
      receiptStates: [
        { receiptId: "dr_chain", state: "active", updatedAt: BUILD_546_FIXTURE_NOW.toISOString() },
      ],
    });
    const badLink = signPortableRevocationSnapshot({ payload, signingKey: BUILD_546_PRIMARY_KEY });
    const result = await verifySnapshotAtRp({ presentation, snapshot: badLink, checkpointStore: store });
    expect(result.verification.codes).toContain("chain_continuity_break");
  });

  it("checkpoint unavailable without bootstrap — blocked at RP", async () => {
    const presentation = presentationForReceiptId();
    const snapshot = activePortableRevocationSnapshotForReceipt(presentation.signed_decision_receipt.id);
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_no_bootstrap",
      rp: {
        partnerId: BUILD_546_PARTNER_ID,
        policyId: BUILD_546_POLICY_ID,
        env,
        portableRevocation: {
          issuerTrust: build546PortableRevocationIssuerTrust(),
          checkpointStore: new InMemoryPortableRevocationCheckpointStore(),
          bootstrapTrusts: [],
        },
      },
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.portable_revocation_codes).toContain("checkpoint_unavailable");
  });

  it("duplicate status entries rejected", async () => {
    const presentation = presentationForReceiptId("dr_dup");
    const issuedAt = BUILD_546_FIXTURE_NOW.toISOString();
    const payload = buildPortableRevocationPayload({
      issuerId: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      signingKeyId: BUILD_546_PRIMARY_KEY.signingKeyId,
      snapshotSequence: 1,
      issuedAt,
      expiresAt: "2027-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 86_400,
      previousSnapshotHash: null,
      receiptStates: [
        { receiptId: "dr_dup", state: "active", updatedAt: issuedAt },
        { receiptId: "dr_dup", state: "revoked", updatedAt: issuedAt },
      ],
    });
    const artifact = signPortableRevocationSnapshot({ payload, signingKey: BUILD_546_PRIMARY_KEY });
    const result = await verifySnapshotAtRp({ presentation, snapshot: artifact, bootstrap: true });
    expect(result.verification.codes).toContain("duplicate_status_entry");
  });

  it("cross-issuer status substitution rejected", async () => {
    const presentation = presentationForReceiptId("dr_cross");
    const payload = buildPortableRevocationPayload({
      issuerId: "issuer:wrong-namespace",
      signingKeyId: BUILD_546_PRIMARY_KEY.signingKeyId,
      snapshotSequence: 1,
      issuedAt: BUILD_546_FIXTURE_NOW.toISOString(),
      expiresAt: "2027-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 86_400,
      previousSnapshotHash: null,
      receiptStates: [
        {
          receiptId: "dr_cross",
          state: "active",
          updatedAt: BUILD_546_FIXTURE_NOW.toISOString(),
        },
      ],
    });
    const otherIssuerSnapshot = signPortableRevocationSnapshot({
      payload,
      signingKey: BUILD_546_PRIMARY_KEY,
    });
    const result = await verifySnapshotAtRp({
      presentation,
      snapshot: otherIssuerSnapshot,
      bootstrap: true,
    });
    expect(result.verification.codes).toContain("issuer_authority_mismatch");
  });

  it("legitimate key rotation accepted when registry key signs snapshot", async () => {
    const presentation = presentationForReceiptId("dr_rot");
    const artifact = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_rot",
      signingKey: BUILD_546_PRIMARY_KEY,
    });
    const result = await verifySnapshotAtRp({ presentation, snapshot: artifact, bootstrap: true });
    expect(result.verification.ok).toBe(true);
  });

  it("first-time bootstrap with independently trusted authority", async () => {
    const presentation = presentationForReceiptId("dr_boot");
    const snapshot = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_boot", sequence: 1 });
    const store = new InMemoryPortableRevocationCheckpointStore();
    const first = await verifySnapshotAtRp({
      presentation,
      snapshot,
      bootstrap: true,
      checkpointStore: store,
    });
    expect(first.verification.ok).toBe(true);
    const checkpoint = await store.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID);
    expect(checkpoint?.highest_sequence).toBe(1);
  });

  it("advanceCheckpointOnSuccess=false — cannot authorize without checkpoint continuity validation", async () => {
    const store = new InMemoryPortableRevocationCheckpointStore();
    const presentation = presentationForReceiptId("dr_non_mutating");
    const seq1 = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_non_mutating",
      sequence: 1,
    });
    const seq2 = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_non_mutating",
      sequence: 2,
      previousSnapshot: seq1,
    });
    const seq1Alt = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_non_mutating_alt",
      sequence: 1,
    });
    const bootstrap = [bootstrapTrustFromArtifact({ artifact: seq1 })];
    const base = {
      receipt: presentation.signed_decision_receipt,
      now: BUILD_546_FIXTURE_NOW,
      env,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      checkpointStore: store,
      advanceCheckpointOnSuccess: false as const,
    };

    const readOnlyBootstrap = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1,
      bootstrapTrusts: bootstrap,
      ...base,
    });
    expect(readOnlyBootstrap.verification.ok).toBe(true);
    expect(readOnlyBootstrap.revocationSource).toEqual({ available: true, status: "active" });
    expect(readOnlyBootstrap.checkpoint_advanced).toBe(false);
    expect(await store.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID)).toBeNull();

    await verifyPortableRevocationAtRelyingParty({
      artifact: seq1,
      bootstrapTrusts: bootstrap,
      ...base,
      advanceCheckpointOnSuccess: true,
    });
    await verifyPortableRevocationAtRelyingParty({
      artifact: seq2,
      bootstrapTrusts: [],
      ...base,
      advanceCheckpointOnSuccess: true,
    });
    const rollback = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1,
      bootstrapTrusts: [],
      ...base,
    });
    expect(rollback.verification.ok).toBe(false);
    expect(rollback.verification.codes).toContain("rollback_against_checkpoint");
    expect(rollback.revocationSource.available).toBe(false);

    const emptyStore = new InMemoryPortableRevocationCheckpointStore();
    const unbootstrapped = await verifyPortableRevocationAtRelyingParty({
      artifact: buildSyntheticPortableRevocationSnapshot({
        receiptId: "dr_fresh_no_boot",
        sequence: 1,
      }),
      receipt: presentationForReceiptId("dr_fresh_no_boot").signed_decision_receipt,
      bootstrapTrusts: [],
      ...base,
      checkpointStore: emptyStore,
    });
    expect(unbootstrapped.verification.ok).toBe(false);
    expect(unbootstrapped.verification.codes).toContain("checkpoint_unavailable");

    const conflictStore = new InMemoryPortableRevocationCheckpointStore();
    conflictStore.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: seq1.payload_hash,
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const conflict = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1Alt,
      receipt: presentationForReceiptId("dr_non_mutating_alt").signed_decision_receipt,
      bootstrapTrusts: [],
      ...base,
      checkpointStore: conflictStore,
    });
    expect(conflict.verification.ok).toBe(false);
    expect(conflict.verification.codes).toContain("hash_conflict_at_sequence");

    const gapStore = new InMemoryPortableRevocationCheckpointStore();
    gapStore.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 1,
      last_payload_hash: seq1.payload_hash,
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const gap = await verifyPortableRevocationAtRelyingParty({
      artifact: seq2,
      bootstrapTrusts: [],
      ...base,
      checkpointStore: gapStore,
    });
    expect(gap.verification.ok).toBe(true);
    expect(gap.checkpoint_advanced).toBe(false);
    expect((await gapStore.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID))?.highest_sequence).toBe(1);

    const staleStore = new InMemoryPortableRevocationCheckpointStore();
    staleStore.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 2,
      last_payload_hash: seq2.payload_hash,
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const older = await verifyPortableRevocationAtRelyingParty({
      artifact: seq1,
      bootstrapTrusts: [],
      ...base,
      checkpointStore: staleStore,
    });
    expect(older.verification.ok).toBe(false);
    expect(older.verification.codes).toContain("rollback_against_checkpoint");
  });

  it("import current snapshot without predecessor via bootstrap anchor", async () => {
    const presentation = presentationForReceiptId("dr_jump");
    const jump = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_jump", sequence: 5 });
    const store = new InMemoryPortableRevocationCheckpointStore();
    store.seedForIsolatedTests({
      revocation_issuer_id: PORTABLE_REVOCATION_TEST_ISSUER_ID,
      highest_sequence: 2,
      last_payload_hash: "a".repeat(64),
      updated_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    const result = await verifySnapshotAtRp({
      presentation,
      snapshot: jump,
      bootstrap: true,
      checkpointStore: store,
    });
    expect(result.verification.ok).toBe(true);
    expect((await store.getCheckpoint(PORTABLE_REVOCATION_TEST_ISSUER_ID))?.highest_sequence).toBe(5);
  });

  it("revoked receipt in authenticated snapshot — RP denies", async () => {
    const presentation = presentationForReceiptId();
    const ctx = createProofFirstPortableRevocationTestContext();
    const snapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: presentation.signed_decision_receipt.id,
      state: "revoked",
    });
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_revoked_snap",
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
        ctx,
        snapshot,
      ),
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
    });
    expect(decision.outcome).toBe("denied");
    expect(decision.portable_revocation_authenticated).toBe(true);
    expect(decision.verifier.failure_codes).toContain("receipt_revoked");
  });

  it("cross-partner replay — second partner harness still enforces RP scope", async () => {
    const presentation = presentationForReceiptId();
    const snapshot = activePortableRevocationSnapshotForReceipt(presentation.signed_decision_receipt.id);
    const ctxA = createProofFirstPortableRevocationTestContext();
    const ctxB = createProofFirstPortableRevocationTestContext();
    const harnessA = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const harnessB = new ExternalRelyingPartyHarness({
      partnerId: "other-partner",
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const grantA = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_cross_a",
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
        ctxA,
        snapshot,
      ),
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      harness: harnessA,
    });
    expect(grantA.outcome).toBe("granted");
    const denyB = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_cross_b",
      rp: rpWithSnapshotBootstrap(
        { partnerId: "other-partner", policyId: BUILD_546_POLICY_ID, env },
        ctxB,
        snapshot,
      ),
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      harness: harnessB,
    });
    expect(denyB.outcome).not.toBe("granted");
  });

  it("status_id correlation — feed JSON excludes wallet and legal name fields", () => {
    const artifact = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_priv" });
    const serialized = JSON.stringify(artifact.payload);
    expect(serialized).not.toMatch(/wallet/i);
    expect(serialized).not.toMatch(/legal_name/i);
    expect(serialized).not.toMatch(/biometric/i);
    for (const entry of artifact.payload.status_entries) {
      expect(entry.status_id).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
