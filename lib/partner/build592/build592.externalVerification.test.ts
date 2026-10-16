// FILE: lib/partner/build592/build592.externalVerification.test.ts

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import {
  activePortableRevocationSnapshotForReceipt,
  createProofFirstPortableRevocationTestContext,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import {
  build546PortableRevocationIssuerTrust,
  buildSyntheticPortableRevocationSnapshot,
} from "@/lib/protocol/portableRevocation";
import {
  externalVerificationFullyAuthorized,
  isolatedFixtureCryptographicSuccess,
} from "@/lib/partner/build592/externalVerificationProof";
import {
  buildExternalVerificationExecutionReport,
} from "@/lib/partner/build592/externalVerificationExecutionStatus";
import { assessSandboxExecutionResources } from "@/lib/partner/build592/sandboxExecutionAssessment";
import {
  resolveProductionTrustEnvFromProcess,
  runIsolatedFixtureExternalVerification,
  runLightweightRevocationFixtureProbe,
  runProductionExternalVerification,
} from "@/lib/partner/build592/runExternalRelyingPartyVerification";
import { digestReceiptVerificationKeyDocument } from "@/lib/institutionalVerification/trustMaterial";
import { buildReceiptVerificationKeyDocument } from "@/lib/decisionReceipts/verificationKeyLifecycle";

describe("Build #592 external verification integrity", () => {
  let env: Record<string, string>;
  let consumptionDir: string;
  let portableCtx: ReturnType<typeof createProofFirstPortableRevocationTestContext>;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.startsWith("BUILD592_") || key.startsWith("RP_")) {
        delete process.env[key];
      }
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
    consumptionDir = mkdtempSync(join(tmpdir(), "abx-592-rp-"));
    portableCtx = createProofFirstPortableRevocationTestContext();
  });

  afterEach(() => {
    rmSync(consumptionDir, { recursive: true, force: true });
  });

  function portableBundleFor(record = build546SampleRecord()) {
    const snapshot = activePortableRevocationSnapshotForReceipt(record.id);
    portableCtx.registerBootstrapForSnapshot(snapshot);
    return {
      snapshot,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      bootstrapTrusts: portableCtx.bootstrapTrusts,
    };
  }

  it("missing operator credentials produce blocked live HTTP acceptance", () => {
    const assessment = assessSandboxExecutionResources({});
    expect(assessment.live_http_journey_possible).toBe(false);
    const execution = buildExternalVerificationExecutionReport({
      syntheticSecurityPassed: true,
      liveHttpSteps: [{ status: "blocked" }],
      holderAuthorizationConfirmed: false,
      holderAuthorizationEvidenceRef: null,
      receiptProvenance: "not_supplied",
      externalVerifierRan: false,
      externalAuthorizationGranted: false,
      externalProofGenerated: false,
      securityDetail: "ok",
    });
    expect(execution.overall_acceptance_completed).not.toBe("passed");
    expect(execution.live_sandbox_http).toBe("blocked");
  });

  it("synthetic security pass cannot complete overall live acceptance", () => {
    const execution = buildExternalVerificationExecutionReport({
      syntheticSecurityPassed: true,
      liveHttpSteps: [{ status: "blocked" }],
      holderAuthorizationConfirmed: false,
      holderAuthorizationEvidenceRef: null,
      receiptProvenance: "operator_supplied_file",
      externalVerifierRan: false,
      externalAuthorizationGranted: false,
      externalProofGenerated: false,
      securityDetail: "matrix ok",
    });
    expect(execution.synthetic_security_tests).toBe("passed");
    expect(execution.overall_acceptance_completed).not.toBe("passed");
  });

  it("receipt file path alone does not establish holder authorization", () => {
    const execution = buildExternalVerificationExecutionReport({
      syntheticSecurityPassed: true,
      liveHttpSteps: [{ status: "pass" }],
      holderAuthorizationConfirmed: false,
      holderAuthorizationEvidenceRef: null,
      receiptProvenance: "operator_supplied_file",
      externalVerifierRan: true,
      externalAuthorizationGranted: false,
      externalProofGenerated: true,
      securityDetail: null,
    });
    expect(execution.holder_authorization_completed).toBe("not_attempted");
    expect(execution.authentic_signed_sandbox_receipt_obtained).toBe("not_attempted");
    expect(execution.overall_acceptance_completed).not.toBe("passed");
  });

  it("isolated SDK fixture may cryptographically succeed but cannot fully authorize production acceptance", async () => {
    const record = build546SampleRecord();
    const portable = portableBundleFor(record);
    const proof = await runIsolatedFixtureExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_fixture",
      trustEnv: env,
      consumptionStoreDir: consumptionDir,
      revocationSource: { available: true, status: "active" },
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      trustDigestPin: null,
      now: BUILD_546_FIXTURE_NOW,
    });

    expect(proof.evidence_mode).toBe("isolated_sdk_fixture");
    expect(isolatedFixtureCryptographicSuccess(proof)).toBe(true);
    expect(externalVerificationFullyAuthorized(proof)).toBe(false);
  });

  it("lightweight active revocation status alone cannot establish production authorization", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const probe = await runLightweightRevocationFixtureProbe({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_lightweight",
      trustEnv: env,
      consumptionStoreDir: consumptionDir,
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(probe.authorize).toBe(true);

    const receiptDoc = buildReceiptVerificationKeyDocument(env);
    if ("ok" in receiptDoc) throw new Error("expected doc");
    const digest = digestReceiptVerificationKeyDocument(receiptDoc);
    const portable = portableBundleFor(record);

    const production = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_prod_portable",
      trustEnv: env,
      trustDigestPin: digest,
      consumptionStoreDir: consumptionDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      sandbox: {
        application_id: "app",
        public_slug: "slug",
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        policy_version: 1,
        environment: "sandbox",
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(production.ok).toBe(true);
    if (production.ok) {
      expect(production.proof.revocation.mechanism).toBe("portable_revocation_snapshot");
      expect(production.proof.revocation.portable_revocation_authenticated).toBe(true);
      expect(externalVerificationFullyAuthorized(production.proof)).toBe(false);
    }
  });

  it("stale portable revocation snapshot fails closed", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const fresh = activePortableRevocationSnapshotForReceipt(record.id);
    const stale = buildSyntheticPortableRevocationSnapshot({
      receiptId: record.id,
      sequence: Math.max(0, (fresh.payload.snapshot_sequence ?? 1) - 1),
    });
    portableCtx.registerBootstrapForSnapshot(fresh);
    const receiptDoc = buildReceiptVerificationKeyDocument(env);
    if ("ok" in receiptDoc) throw new Error("expected doc");
    const digest = digestReceiptVerificationKeyDocument(receiptDoc);

    const outcome = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_stale",
      trustEnv: env,
      trustDigestPin: digest,
      consumptionStoreDir: consumptionDir,
      portableRevocationSnapshot: stale,
      portableRevocationIssuerTrust: build546PortableRevocationIssuerTrust(),
      portableRevocationBootstrapTrusts: portableCtx.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "live_sandbox_holder_flow",
      sandbox: {
        application_id: "app",
        public_slug: "slug",
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        policy_version: 1,
        environment: "sandbox",
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.proof.verification.authorize).toBe(false);
      expect(outcome.proof.authorization_checks.authenticated_revocation_ok).toBe("failed");
      expect(externalVerificationFullyAuthorized(outcome.proof)).toBe(false);
    }
  });

  it("missing trust digest pin blocks production trust resolution when using network origin", async () => {
    const withoutRegistry = { ...process.env };
    delete withoutRegistry.ABRAXAS_RECEIPT_VERIFICATION_REGISTRY;
    withoutRegistry.ABRAXAS_TRUST_ORIGIN = "https://example.com";
    const resolved = await resolveProductionTrustEnvFromProcess(withoutRegistry);
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.code).toBe("pin_required");
  });

  it("production live holder attestation with portable revocation satisfies full external authorization in fixtures", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const portable = portableBundleFor(record);
    const receiptDoc = buildReceiptVerificationKeyDocument(env);
    if ("ok" in receiptDoc) throw new Error("expected doc");
    const digest = digestReceiptVerificationKeyDocument(receiptDoc);

    const outcome = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_live_ok",
      trustEnv: env,
      trustDigestPin: digest,
      consumptionStoreDir: consumptionDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "live_sandbox_holder_flow",
      sandbox: {
        application_id: "app",
        public_slug: "slug",
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        policy_version: 1,
        environment: "sandbox",
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.proof.evidence_mode).toBe("production_portable_revocation");
      expect(externalVerificationFullyAuthorized(outcome.proof)).toBe(true);
    }
  });

  it("production path requires digest pin even with offline registry for full authorization", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const portable = portableBundleFor(record);
    const blocked = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_no_pin",
      trustEnv: env,
      trustDigestPin: null,
      consumptionStoreDir: consumptionDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "live_sandbox_holder_flow",
      sandbox: {
        application_id: "app",
        public_slug: "slug",
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        policy_version: 1,
        environment: "sandbox",
      },
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("trust_digest_pin_required");
  });
});
