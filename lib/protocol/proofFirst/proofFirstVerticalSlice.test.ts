// FILE: lib/protocol/proofFirst/proofFirstVerticalSlice.test.ts
// Build #563 — synthetic credentials; isolated tests; no Abraxas API/DB at RP.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  BUILD_546_RETIRED_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { verifyReceiptIndependently } from "@/lib/institutionalCertification/build546/independentVerifier";
import {
  composeHolderPolicyScopedPresentation,
  assertPresentationExcludesSensitiveCustody,
  type HolderPolicyScopedPresentation,
} from "./holderPolicyPresentation";
import { verifyHolderPresentationAtRelyingParty } from "./proofFirstRelyingParty";
import {
  buildSyntheticPortableRevocationSnapshot,
  type PortableRevocationSignedArtifact,
} from "@/lib/protocol/portableRevocation";
import {
  activePortableRevocationSnapshotForReceipt,
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
  type ProofFirstPortableRevocationTestContext,
} from "./proofFirstTestRevocation";

describe("Build #563 proof-first vertical slice (synthetic, isolated)", () => {
  let env: Record<string, string>;
  let portableCtx: ProofFirstPortableRevocationTestContext;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
    portableCtx = createProofFirstPortableRevocationTestContext();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  function baseRp() {
    return { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env };
  }

  async function verifyWithPortableSnapshot(input: {
    presentation: HolderPolicyScopedPresentation;
    requestId: string;
    snapshot?: PortableRevocationSignedArtifact;
    harness?: ExternalRelyingPartyHarness;
  }) {
    const snapshot =
      input.snapshot
      ?? activePortableRevocationSnapshotForReceipt(input.presentation.signed_decision_receipt.id);
    return verifyHolderPresentationAtRelyingParty({
      presentation: input.presentation,
      requestId: input.requestId,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      rp: rpWithSnapshotBootstrap(baseRp(), portableCtx, snapshot),
      harness: input.harness,
    });
  }

  function issuerToHolderPresentation() {
    const signed = build546SampleRecord();
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    expect(assertPresentationExcludesSensitiveCustody(presentation).ok).toBe(true);
    return presentation;
  }

  it("issuer → holder presentation → independent RP grants without Abraxas infrastructure", async () => {
    const presentation = issuerToHolderPresentation();
    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_563_happy",
      harness,
    });
    expect(decision.abraxas_infrastructure_required).toBe(false);
    expect(decision.identity_database_required).toBe(false);
    expect(decision.retained_documents_required).toBe(false);
    expect(decision.outcome).toBe("granted");
    expect(decision.authorization_verified).toBe(true);
    expect(decision.verifier.cryptographically_authentic).toBe(true);
  });

  it("forged issuer signature — reject", async () => {
    const record = build546SampleRecord();
    const bad = { ...record, signature: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==" };
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: bad,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_forged_sig",
    });
    expect(decision.outcome).not.toBe("granted");
    expect(decision.verifier.failure_codes).toContain("signature_invalid");
  });

  it("unauthorized issuer key — reject", async () => {
    const record = build546SampleRecord(BUILD_546_UNKNOWN_KEY);
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_unknown_key",
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.portable_revocation_codes).toContain("issuer_authority_mismatch");
  });

  it("credential substitution — extra claim ref rejected at compose guard", () => {
    const record = build546SampleRecord();
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: BUILD_546_PARTNER_ID,
      disclosedClaimIds: ["claim-not-on-receipt"],
    });
    expect(assertPresentationExcludesSensitiveCustody(presentation).ok).toBe(false);
  });

  it("wrong audience partner — reject cross-application misuse", async () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, { partner_id: "other-partner" });
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: "other-partner",
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_wrong_audience",
    });
    expect(decision.outcome).not.toBe("granted");
    expect(decision.verifier.failure_codes).toContain("audience_mismatch");
  });

  it("wrong policy binding — reject", async () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, { policy_id: "wrong-policy" });
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_wrong_policy",
    });
    expect(decision.outcome).toBe("denied");
  });

  it("expired credential — reject", async () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, {
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_expired",
    });
    expect(decision.outcome).toBe("denied");
  });

  it("revoked credential — reject when authenticated snapshot reports revoked", async () => {
    const presentation = issuerToHolderPresentation();
    const snapshot = buildSyntheticPortableRevocationSnapshot({
      receiptId: presentation.signed_decision_receipt.id,
      state: "revoked",
    });
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_revoked",
      snapshot,
    });
    expect(decision.outcome).toBe("denied");
    expect(decision.portable_revocation_authenticated).toBe(true);
    expect(decision.verifier.failure_codes).toContain("receipt_revoked");
  });

  it("missing authenticated revocation snapshot — blocked fail-closed", async () => {
    const presentation = issuerToHolderPresentation();
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_no_revocation",
      rp: baseRp(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.verifier.verdict).toBe("blocked");
    expect(decision.portable_revocation_authenticated).toBe(false);
  });

  it("fabricated revocationSource without snapshot — blocked (unsigned hint rejected)", async () => {
    const presentation = issuerToHolderPresentation();
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_fake_revocation_hint",
      rp: baseRp(),
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.unsigned_revocation_hint_rejected).toBe(true);
    expect(decision.verifier.failure_codes).toContain("revocation_source_unavailable");
  });

  it("replayed presentation — RP replay store denies second use", async () => {
    const presentation = issuerToHolderPresentation();
    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const snapshot = activePortableRevocationSnapshotForReceipt(
      presentation.signed_decision_receipt.id,
    );
    const rp = rpWithSnapshotBootstrap(baseRp(), portableCtx, snapshot);
    const first = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_replay_1",
      rp,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      harness,
    });
    expect(first.outcome).toBe("granted");
    const second = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_replay_2",
      rp,
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      harness,
    });
    expect(second.replay_detected).toBe(true);
    expect(second.outcome).toBe("denied");
  });

  it("compromised rotated key outside window — reject", async () => {
    const record = build546SampleRecord(BUILD_546_RETIRED_KEY);
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const offline = verifyReceiptIndependently({
      signedRecord: record,
      expectations: { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      env,
      revocationSource: { available: true, status: "active" },
    });
    expect(offline.verdict).toBe("reject");
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_retired_key",
    });
    expect(decision.outcome).toBe("denied");
  });

  it("partner-visible surface excludes subject pseudonym correlation by default", async () => {
    const presentation = issuerToHolderPresentation();
    const decision = await verifyWithPortableSnapshot({
      presentation,
      requestId: "req_privacy",
    });
    const visible = JSON.stringify(decision.partner_visible);
    expect(visible).not.toContain("subject_pseudonym");
    expect(visible).not.toContain("legal_name");
  });
});
