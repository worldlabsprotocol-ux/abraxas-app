// FILE: lib/passport/portableTrust/build565.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import {
  activePortableRevocationSnapshotForReceipt,
  createProofFirstPortableRevocationTestContext,
  rpWithSnapshotBootstrap,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import { verifyHolderPresentationAtRelyingParty } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import { buildSyntheticPortableRevocationSnapshot } from "@/lib/protocol/portableRevocation";
import {
  buildHolderPortableExport,
  parseHolderPortableImport,
  summarizeHolderPortableCredential,
} from "./presentationBundle";
import { verifyHolderPresentationIndependently } from "./independentVerification";
import { HOLDER_PORTABLE_EXPORT_MEDIA_TYPE } from "./contract";

describe("Build #565 passport portable trust", () => {
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

  it("E2E: issuance → holder export → two RPs (second audience fails)", async () => {
    const signed = build546SampleRecord(BUILD_546_PRIMARY_KEY, { id: "dr_565_e2e" });
    const exported = buildHolderPortableExport({ record: signed });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.bundle.media_type).toBe(HOLDER_PORTABLE_EXPORT_MEDIA_TYPE);
    expect(exported.bundle.presentation.signed_decision_receipt.signature).toBeTruthy();
    expect(JSON.stringify(exported.bundle)).not.toMatch(/private_key|"x":/);

    const snapshot = activePortableRevocationSnapshotForReceipt(signed.id);
    const partnerA = await verifyHolderPresentationIndependently({
      presentation: exported.bundle.presentation,
      portableRevocationSnapshot: snapshot,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
      requestId: "req_565_a",
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(partnerA.outcome).toBe("granted");

    const wrongAudience = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: "partner-b-independent",
    });
    const partnerB = await verifyHolderPresentationIndependently({
      presentation: wrongAudience,
      portableRevocationSnapshot: snapshot,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
      requestId: "req_565_b",
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(partnerB.outcome).not.toBe("granted");
  });

  it("security: substitution, revoked snapshot, stale revocation, import tamper", async () => {
    const signed = build546SampleRecord(undefined, { id: "dr_565_sec" });
    const exported = buildHolderPortableExport({ record: signed });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    const tampered = structuredClone(exported.bundle);
    tampered.presentation.disclosed_claim_refs = ["claim_not_in_receipt"];
    expect(parseHolderPortableImport(tampered).ok).toBe(false);

    const revokedSnap = buildSyntheticPortableRevocationSnapshot({
      receiptId: signed.id,
      state: "revoked",
    });
    const ctx = createProofFirstPortableRevocationTestContext();
    ctx.registerBootstrapForSnapshot(revokedSnap);
    const denied = await verifyHolderPresentationAtRelyingParty({
      presentation: exported.bundle.presentation,
      requestId: "req_revoked",
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: revokedSnap,
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
        ctx,
        revokedSnap,
      ),
    });
    expect(denied.outcome).toBe("denied");

    const summary = summarizeHolderPortableCredential({
      ...signed,
      status: "revoked",
      revoked_at: BUILD_546_FIXTURE_NOW.toISOString(),
    });
    expect(summary.status).toBe("revoked");
  });

  it("import round-trip preserves presentation integrity", () => {
    const signed = build546SampleRecord(undefined, { id: "dr_565_import" });
    const exported = buildHolderPortableExport({ record: signed });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    const parsed = parseHolderPortableImport(exported.bundle);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.bundle.presentation.signed_decision_receipt.id).toBe(signed.id);
  });

  it("independent harness: no Abraxas infrastructure flags", async () => {
    const signed = build546SampleRecord(undefined, { id: "dr_565_flags" });
    const presentation = composeHolderPolicyScopedPresentation({
      signedRecord: signed,
      audiencePartnerId: BUILD_546_PARTNER_ID,
    });
    const snapshot = activePortableRevocationSnapshotForReceipt(signed.id);
    const harness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env,
    });
    const ctx = createProofFirstPortableRevocationTestContext();
    const decision = await verifyHolderPresentationAtRelyingParty({
      presentation,
      requestId: "req_flags",
      now: BUILD_546_FIXTURE_NOW,
      portableRevocationSnapshot: snapshot,
      rp: rpWithSnapshotBootstrap(
        { partnerId: BUILD_546_PARTNER_ID, policyId: BUILD_546_POLICY_ID, env },
        ctx,
        snapshot,
      ),
      harness,
    });
    expect(decision.abraxas_infrastructure_required).toBe(false);
    expect(decision.identity_database_required).toBe(false);
  });
});
