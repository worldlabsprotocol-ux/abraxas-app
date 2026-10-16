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
import { FileReceiptConsumptionStore } from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { verifySignedDecisionReceipt } from "@/lib/institutionalVerification";
import {
  externalVerificationFullyAuthorized,
  buildExternalVerificationProofRecord,
} from "@/lib/partner/build592/externalVerificationProof";
import { assessSandboxExecutionResources } from "@/lib/partner/build592/sandboxExecutionAssessment";
import { runExternalRelyingPartyVerification } from "@/lib/partner/build592/runExternalRelyingPartyVerification";

describe("Build #592 external verification evidence", () => {
  let env: Record<string, string>;
  let consumptionDir: string;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.startsWith("BUILD592_") || key.startsWith("RP_")) {
        delete process.env[key];
      }
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
    consumptionDir = mkdtempSync(join(tmpdir(), "abx-592-rp-"));
  });

  afterEach(() => {
    rmSync(consumptionDir, { recursive: true, force: true });
  });

  it("assessment marks holder session and receipt as blocked without operator env", () => {
    const assessment = assessSandboxExecutionResources({});
    expect(assessment.external_verification_possible).toBe(false);
    expect(assessment.resources.find((r) => r.id === "holder_session")?.status).toBe(
      "requires_holder_session",
    );
  });

  it("produces external proof on authorized verify and distinguishes telemetry", async () => {
    const proof = await runExternalRelyingPartyVerification({
      signedRecord: build546SampleRecord(),
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      requestId: "req_592_proof",
      trustEnv: env,
      consumptionStoreDir: consumptionDir,
      revocationSource: { available: true, status: "active" },
      executionEnvironment: "ci",
      sandbox: {
        application_id: "app_test",
        public_slug: "test-app",
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        policy_version: 1,
        environment: "sandbox",
      },
      trustDigestPin: null,
      now: BUILD_546_FIXTURE_NOW,
    });

    expect(proof.abraxas_integration_telemetry.proves_external_verification).toBe(false);
    expect(externalVerificationFullyAuthorized(proof)).toBe(true);
    expect(proof.verification.authorize).toBe(true);
    expect(proof.verification.durable_consumption_recorded).toBe(true);
  });

  it("replay second authorize fails closed with replay_detected", async () => {
    const record = build546SampleRecord();
    const store = new FileReceiptConsumptionStore(consumptionDir);
    const base = {
      signed_record: record,
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      trust_env: env,
      consumption_store: store,
      revocation_source: { available: true, status: "active" } as const,
      now: BUILD_546_FIXTURE_NOW,
    };
    const first = await verifySignedDecisionReceipt({ ...base, request_id: "req_592_a" });
    expect(first.authorize).toBe(true);

    const second = await verifySignedDecisionReceipt({ ...base, request_id: "req_592_b" });
    const proof = buildExternalVerificationProofRecord({
      result: second,
      verifiedAt: new Date().toISOString(),
      executionEnvironment: "ci",
      sandbox: {
        application_id: null,
        public_slug: null,
        partner_id: BUILD_546_PARTNER_ID,
        policy_id: BUILD_546_POLICY_ID,
        policy_version: null,
        environment: "sandbox",
      },
      receiptId: record.id,
      requestId: "req_592_b",
      trustDigestPin: null,
      sdkPackage: "@abraxas/institutional-verification",
      evidenceSource: "test",
      operatorCommand: "vitest",
      durableConsumptionRecorded: false,
      replayDetected: true,
    });

    expect(second.rejection_reasons).toContain("replay_detected");
    expect(externalVerificationFullyAuthorized(proof)).toBe(false);
  });
});
