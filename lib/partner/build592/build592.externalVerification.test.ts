// FILE: lib/partner/build592/build592.externalVerification.test.ts

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
import {
  BUILD592_LIVE_RECEIPT_ARTIFACT_PATH_ENV,
  resolveHolderJourneyProvenance,
} from "@/lib/partner/build592/holderJourneyProvenance";
import { LIVE_E2E_ARTIFACT_SCHEMA_VERSION } from "@/lib/partner/universalIntegration/liveReceiptCorrelation";
import type { ResolvedHolderJourneyProvenance } from "@/lib/partner/build592/holderJourneyProvenance";

describe("Build #592 external verification integrity", () => {
  let env: Record<string, string>;
  let consumptionDir: string;
  let checkpointDir: string;
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
    checkpointDir = mkdtempSync(join(tmpdir(), "abx-592-checkpoint-"));
    portableCtx = createProofFirstPortableRevocationTestContext();
  });

  afterEach(() => {
    rmSync(consumptionDir, { recursive: true, force: true });
    rmSync(checkpointDir, { recursive: true, force: true });
  });

  function trustDigestPin() {
    const receiptDoc = buildReceiptVerificationKeyDocument(env);
    if ("ok" in receiptDoc) throw new Error("expected doc");
    return digestReceiptVerificationKeyDocument(receiptDoc);
  }

  function sandboxMeta() {
    return {
      application_id: "app",
      public_slug: "slug",
      partner_id: BUILD_546_PARTNER_ID,
      policy_id: BUILD_546_POLICY_ID,
      policy_version: 1,
      environment: "sandbox",
    };
  }

  function portableBundleFor(record = build546SampleRecord()) {
    const snapshot = activePortableRevocationSnapshotForReceipt(record.id);
    portableCtx.registerBootstrapForSnapshot(snapshot);
    return {
      snapshot,
      issuerTrust: build546PortableRevocationIssuerTrust(),
      bootstrapTrusts: portableCtx.bootstrapTrusts,
    };
  }

  function holderJourney(
    overrides: Partial<ResolvedHolderJourneyProvenance> = {},
  ): ResolvedHolderJourneyProvenance {
    return {
      kind: "unconfirmed",
      operator_evidence_ref: null,
      correlation_source: null,
      receipt_provenance: "operator_supplied_file",
      ...overrides,
    };
  }

  it("missing operator credentials produce blocked live HTTP acceptance", () => {
    const assessment = assessSandboxExecutionResources({});
    expect(assessment.live_http_journey_possible).toBe(false);
    const execution = buildExternalVerificationExecutionReport({
      syntheticSecurityPassed: true,
      liveHttpSteps: [{ status: "blocked" }],
      holderJourneyProvenance: "unconfirmed",
      operatorHolderEvidenceRef: null,
      receiptSuppliedViaFile: false,
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
      holderJourneyProvenance: "unconfirmed",
      operatorHolderEvidenceRef: null,
      receiptSuppliedViaFile: true,
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
      holderJourneyProvenance: "unconfirmed",
      operatorHolderEvidenceRef: null,
      receiptSuppliedViaFile: true,
      externalVerifierRan: true,
      externalAuthorizationGranted: false,
      externalProofGenerated: true,
      securityDetail: null,
    });
    expect(execution.holder_authorization_completed).toBe("not_attempted");
    expect(execution.authentic_signed_sandbox_receipt_obtained).toBe("blocked");
    expect(execution.overall_acceptance_completed).not.toBe("passed");
  });

  it("self-declared holder provenance blocks live acceptance steps", () => {
    const execution = buildExternalVerificationExecutionReport({
      syntheticSecurityPassed: true,
      liveHttpSteps: [{ status: "pass" }],
      holderJourneyProvenance: "operator_asserted",
      operatorHolderEvidenceRef: "operator-note-592",
      receiptSuppliedViaFile: true,
      externalVerifierRan: true,
      externalAuthorizationGranted: false,
      externalProofGenerated: true,
      securityDetail: null,
    });
    expect(execution.holder_authorization_completed).toBe("blocked");
    expect(execution.authentic_signed_sandbox_receipt_obtained).toBe("blocked");
    expect(execution.overall_acceptance_completed).not.toBe("passed");
  });

  it("isolated SDK fixture may cryptographically succeed but cannot fully authorize production acceptance", async () => {
    env.ABRAXAS_PORTABLE_REVOCATION_CHECKPOINT_MEMORY_TEST = "1";
    Object.assign(process.env, env);
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
    expect(proof.revocation.durable_checkpoint_monotonicity).toBe(false);
  });

  it("production path requires durable checkpoint directory", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const portable = portableBundleFor(record);
    const blocked = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_no_checkpoint",
      trustEnv: env,
      trustDigestPin: trustDigestPin(),
      consumptionStoreDir: consumptionDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: holderJourney(),
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.code).toBe("portable_revocation_checkpoint_unconfigured");
    }
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

    const portable = portableBundleFor(record);
    const production = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_prod_portable",
      trustEnv: env,
      trustDigestPin: trustDigestPin(),
      consumptionStoreDir: consumptionDir,
      checkpointStoreDir: checkpointDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: holderJourney(),
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(production.ok).toBe(true);
    if (production.ok) {
      expect(production.proof.revocation.durable_checkpoint_monotonicity).toBe(true);
      expect(externalVerificationFullyAuthorized(production.proof)).toBe(false);
    }
  });

  it("self-declared holder env cannot satisfy full external authorization", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const portable = portableBundleFor(record);
    const resolved = resolveHolderJourneyProvenance({
      env: {
        BUILD592_HOLDER_AUTHORIZATION_CONFIRMED: "1",
        BUILD592_HOLDER_AUTHORIZATION_EVIDENCE: "operator-journal-entry",
      },
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      receiptId: record.id,
      receiptLoadedFromFile: true,
    });
    expect(resolved.kind).toBe("operator_asserted");

    const outcome = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_self_declared",
      trustEnv: env,
      trustDigestPin: trustDigestPin(),
      consumptionStoreDir: consumptionDir,
      checkpointStoreDir: checkpointDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: resolved,
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.proof.verification.authorize).toBe(true);
      expect(outcome.proof.holder_journey.provenance).toBe("operator_asserted");
      expect(externalVerificationFullyAuthorized(outcome.proof)).toBe(false);
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

    const advance = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_advance",
      trustEnv: env,
      trustDigestPin: trustDigestPin(),
      consumptionStoreDir: consumptionDir,
      checkpointStoreDir: checkpointDir,
      portableRevocationSnapshot: fresh,
      portableRevocationIssuerTrust: build546PortableRevocationIssuerTrust(),
      portableRevocationBootstrapTrusts: portableCtx.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: holderJourney(),
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(advance.ok).toBe(true);

    const consumptionDir2 = mkdtempSync(join(tmpdir(), "abx-592-rp2-"));
    const outcome = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_stale",
      trustEnv: env,
      trustDigestPin: trustDigestPin(),
      consumptionStoreDir: consumptionDir2,
      checkpointStoreDir: checkpointDir,
      portableRevocationSnapshot: stale,
      portableRevocationIssuerTrust: build546PortableRevocationIssuerTrust(),
      portableRevocationBootstrapTrusts: portableCtx.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: holderJourney(),
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    rmSync(consumptionDir2, { recursive: true, force: true });
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

  it("tenant-correlated receipt artifact with durable checkpoint satisfies full external authorization", async () => {
    const record = build546SampleRecord(undefined, { decision_context: "sandbox" });
    const portable = portableBundleFor(record);
    const artifactPath = join(checkpointDir, "live-artifact.json");
    writeFileSync(
      artifactPath,
      `${JSON.stringify({
        schema_version: LIVE_E2E_ARTIFACT_SCHEMA_VERSION,
        captured_at: BUILD_546_FIXTURE_NOW.toISOString(),
        environment: "sandbox",
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        receipt_id: record.id,
        proof_source: "manual_callback",
      })}\n`,
    );

    const resolved = resolveHolderJourneyProvenance({
      env: {
        [BUILD592_LIVE_RECEIPT_ARTIFACT_PATH_ENV]: artifactPath,
      },
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      receiptId: record.id,
      receiptLoadedFromFile: true,
    });
    expect(resolved.kind).toBe("tenant_correlated");

    const outcome = await runProductionExternalVerification({
      signedRecord: record,
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_live_ok",
      trustEnv: env,
      trustDigestPin: trustDigestPin(),
      consumptionStoreDir: consumptionDir,
      checkpointStoreDir: checkpointDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: resolved,
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.proof.evidence_mode).toBe("production_portable_revocation");
      expect(outcome.proof.revocation.durable_checkpoint_monotonicity).toBe(true);
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
      checkpointStoreDir: checkpointDir,
      portableRevocationSnapshot: portable.snapshot,
      portableRevocationIssuerTrust: portable.issuerTrust,
      portableRevocationBootstrapTrusts: portable.bootstrapTrusts,
      executionEnvironment: "ci",
      receiptProvenance: "operator_supplied_file",
      holderJourney: holderJourney(),
      sandbox: sandboxMeta(),
      now: BUILD_546_FIXTURE_NOW,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("trust_digest_pin_required");
  });
});
