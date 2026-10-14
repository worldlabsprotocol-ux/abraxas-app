// FILE: lib/protocol/portableRevocation/portableRevocation.security.test.ts
// Build #564 — adversarial portable revocation feed tests.

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
import { activePortableRevocationSnapshotForReceipt } from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import {
  buildPortableRevocationPayload,
  buildSyntheticPortableRevocationSnapshot,
  signPortableRevocationSnapshot,
  verifyPortableRevocationArtifact,
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

  it("E2E: issuer → holder presentation → authenticated snapshot → local RP grant", async () => {
    const presentation = presentationForReceiptId();
    const snapshot = activePortableRevocationSnapshotForReceipt(presentation.signed_decision_receipt.id);
    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_564_e2e",
      rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
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

  it("unauthorized issuer signing key — unknown_signing_key", () => {
    const payload = buildPortableRevocationPayload({
      issuerId: "issuer:rogue",
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

  it("expired snapshot — snapshot_expired", () => {
    const artifact = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_exp",
      expiresAt: "2026-01-01T00:00:00.000Z",
    });
    const result = verifyPortableRevocationArtifact({
      artifact,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("snapshot_expired");
  });

  it("stale snapshot beyond max_freshness_seconds — snapshot_stale", () => {
    const artifact = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_stale",
      issuedAt: "2026-06-01T12:00:00.000Z",
      maxFreshnessSeconds: 60,
    });
    const result = verifyPortableRevocationArtifact({
      artifact,
      now: BUILD_546_FIXTURE_NOW,
      env,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("snapshot_stale");
  });

  it("sequence rollback — blocked at artifact layer", () => {
    const prev = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_rb", sequence: 2 });
    const rollback = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_rb",
      sequence: 1,
      previousSnapshot: prev,
    });
    const result = verifyPortableRevocationArtifact({
      artifact: rollback,
      now: BUILD_546_FIXTURE_NOW,
      env,
      previousArtifact: prev,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("sequence_rollback");
  });

  it("previous hash mismatch on chained snapshot", () => {
    const prev = buildSyntheticPortableRevocationSnapshot({ receiptId: "dr_chain", sequence: 1 });
    const payload = buildPortableRevocationPayload({
      issuerId: prev.payload.issuer_id,
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
    const result = verifyPortableRevocationArtifact({
      artifact: badLink,
      now: BUILD_546_FIXTURE_NOW,
      env,
      previousArtifact: prev,
    });
    expect(result.ok).toBe(false);
    expect(result.codes).toContain("previous_hash_mismatch");
  });

  it("key rotation — snapshot signed with active registry key verifies", () => {
    const artifact = buildSyntheticPortableRevocationSnapshot({
      receiptId: "dr_rot",
      signingKey: BUILD_546_PRIMARY_KEY,
    });
    expect(
      verifyPortableRevocationArtifact({ artifact, now: BUILD_546_FIXTURE_NOW, env }).ok,
    ).toBe(true);
  });

  it("revoked receipt in authenticated snapshot — RP denies", async () => {
    const presentation = presentationForReceiptId();
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_revoked_snap",
      rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: buildSyntheticPortableRevocationSnapshot({
        receiptId: presentation.signed_decision_receipt.id,
        state: "revoked",
      }),
    });
    expect(decision.outcome).toBe("denied");
    expect(decision.portable_revocation_authenticated).toBe(true);
    expect(decision.verifier.failure_codes).toContain("receipt_revoked");
  });

  it("cross-partner replay — second partner harness still enforces RP scope", async () => {
    const presentation = presentationForReceiptId();
    const snapshot = activePortableRevocationSnapshotForReceipt(presentation.signed_decision_receipt.id);
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
      rp: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      harness: harnessA,
    });
    expect(grantA.outcome).toBe("granted");
    const denyB = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_cross_b",
      rp: { partnerId: "other-partner", policyId: BUILD_546_POLICY_ID, env },
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
