import { describe, expect, it } from "vitest";
import {
  buildCanonicalPayload,
  hashCanonicalPayload,
} from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "@/lib/passport/productionMigrationRelease";
import { resolvePersistenceBoundaryConfig, SHADOW_PERSISTENCE_COMPARE_ENV } from "./config";
import {
  assertSovereignStagingWriteAllowed,
  evaluateShadowPersistenceIsolation,
} from "./isolationGuard";
import {
  compareMeteringAttributionInvariants,
  compareReceiptProvenanceInvariants,
} from "./invariants/compareVerticalSlice";
import { runFixtureParityFromSnapshots } from "./shadow/runVerticalSliceParity";
import { receiptProvenanceFromRecord } from "./verticalSlice/receiptProvenance";

const TEST_KEY = generateTestSigningKeyPair();

function sampleRecord(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_shadow814",
    decision_id: "00000000-0000-4000-8000-000000008814",
    policy_id: "policy-shadow",
    policy_version: 2,
    partner_id: "partner-shadow",
    subject_pseudonym_id: subjectPseudonymId("wallet-shadow"),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["ok"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2026-07-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: null,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: TEST_KEY.signingKeyId,
    anchor_reference: null,
    idempotency_key: null,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

describe("persistence boundary config", () => {
  it("keeps Production as legacy authority by default", () => {
    const cfg = resolvePersistenceBoundaryConfig({ NODE_ENV: "production" });
    expect(cfg.authorityRole).toBe("production_legacy");
    expect(cfg.shadowMode).toBe("off");
  });

  it("enters shadow observer when compare flag set on staging", () => {
    const cfg = resolvePersistenceBoundaryConfig({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
      [SHADOW_PERSISTENCE_COMPARE_ENV]: "true",
      ABRAXAS_DATABASE_URL: "postgresql://u:p@127.0.0.1:5432/abraxas_sovereign_staging",
    });
    expect(cfg.authorityRole).toBe("shadow_observer");
    expect(cfg.shadowMode).toBe("compare");
  });
});

describe("sovereign staging isolation", () => {
  it("forbids Production Supabase project ref", () => {
    const url = `postgresql://postgres:pw@db.${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;
    const isolation = evaluateShadowPersistenceIsolation({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
      [SHADOW_PERSISTENCE_COMPARE_ENV]: "true",
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: url,
      DATABASE_URL: url,
    });
    expect(isolation.ok).toBe(false);
    if (isolation.ok) return;
    expect(isolation.issues.some((i) => i.code === "production_supabase_ref_forbidden")).toBe(true);
  });

  it("forbids shadow compare with staging writes flag", () => {
    const isolation = evaluateShadowPersistenceIsolation({
      ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
      [SHADOW_PERSISTENCE_COMPARE_ENV]: "compare",
      ABRAXAS_SOVEREIGN_STAGING_WRITES: "true",
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: "postgresql://u:p@127.0.0.1:5432/abraxas_sovereign_staging",
    });
    expect(isolation.ok).toBe(false);
  });

  it("blocks sovereign writes under shadow compare", () => {
    expect(() =>
      assertSovereignStagingWriteAllowed({
        ABRAXAS_SOVEREIGN_ENV_CLASS: "staging",
        [SHADOW_PERSISTENCE_COMPARE_ENV]: "true",
      }),
    ).toThrow(/shadow_compare_read_only/);
  });
});

describe("vertical slice invariants", () => {
  it("passes when legacy and sovereign snapshots match security fields", () => {
    const record = sampleRecord();
    const legacy = receiptProvenanceFromRecord(record);
    const sovereign = receiptProvenanceFromRecord({ ...record });
    expect(compareReceiptProvenanceInvariants(legacy, sovereign)).toEqual([]);
  });

  it("fails on policy mismatch (not row-count parity)", () => {
    const legacy = receiptProvenanceFromRecord(sampleRecord());
    const sovereign = receiptProvenanceFromRecord(sampleRecord({ policy_version: 99 }));
    const mismatches = compareReceiptProvenanceInvariants(legacy, sovereign);
    expect(mismatches.some((m) => m.invariant === "policy_version_binding")).toBe(true);
  });

  it("detects corrupted signature on sovereign side", () => {
    const legacy = receiptProvenanceFromRecord(sampleRecord());
    const bad = sampleRecord({ signature: legacy.signature.slice(0, -4) + "xxxx" });
    const sovereign = receiptProvenanceFromRecord(bad);
    expect(sovereign.signatureValid).toBe(false);
    expect(compareReceiptProvenanceInvariants(legacy, sovereign).length).toBeGreaterThan(0);
  });

  it("detects duplicate metering attribution divergence", () => {
    const key = "meter:pf_receipt:dr_shadow814";
    const legacy = {
      idempotencyKey: key,
      partnerId: "p1",
      eventType: "partner_flow_receipt_issued",
      receiptId: "dr_shadow814",
      present: true,
    };
    const sovereign = { ...legacy, partnerId: "p2" };
    expect(compareMeteringAttributionInvariants(legacy, sovereign).some((m) => m.invariant === "metering_tenant")).toBe(
      true,
    );
  });

  it("proves offline signature verify without any database", () => {
    const record = sampleRecord();
    const payload = buildCanonicalPayload({
      receipt_id: record.id,
      decision_id: record.verification_decision_id,
      policy_id: record.policy_id,
      policy_version: record.policy_version,
      partner_id: record.partner_id,
      subject_pseudonym_id: record.subject_pseudonym_id,
      wallet_binding_ref: record.wallet_binding_ref,
      consent_receipt_id: record.consent_receipt_id,
      decision_result: record.decision_result,
      reason_codes: record.reason_codes,
      evaluated_claim_refs: record.evaluated_claim_refs,
      issuer_refs: record.issuer_refs,
      decision_context: record.decision_context,
      evaluated_at: record.evaluated_at,
      expires_at: record.expires_at,
    });
    expect(hashCanonicalPayload(payload)).toBe(record.payload_hash);
    expect(
      verifyReceiptSignature(payload, record.signature, TEST_KEY.publicKeyJwk),
    ).toBe(true);
  });
});

describe("sovereign freshness layers (fixture)", () => {
  it("does not treat signature-only validity as current authorization when expired", async () => {
    const { evaluateReceiptFreshnessFromSovereignPg } = await import("./verticalSlice/freshnessEvaluation");
    const payload = buildCanonicalPayload({
      receipt_id: "dr_expired815",
      decision_id: "00000000-0000-4000-8000-000000008815",
      policy_id: "policy-shadow",
      policy_version: 2,
      partner_id: "partner-shadow",
      subject_pseudonym_id: subjectPseudonymId("wallet-shadow"),
      wallet_binding_ref: null,
      consent_receipt_id: null,
      decision_result: "approved",
      reason_codes: ["ok"],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2019-06-01T12:00:00.000Z",
      expires_at: "2020-01-01T00:00:00.000Z",
    });
    const { payloadHash, signature } = signReceiptPayload(payload, TEST_KEY.privateKeyJwk);
    const record: DecisionReceiptRecord = {
      id: payload.receipt_id,
      verification_decision_id: payload.decision_id,
      consent_receipt_id: null,
      partner_id: payload.partner_id,
      policy_id: payload.policy_id,
      policy_version: payload.policy_version,
      subject_pseudonym_id: payload.subject_pseudonym_id,
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: payload.reason_codes,
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: payload.evaluated_at,
      expires_at: payload.expires_at,
      revoked_at: null,
      status: "expired",
      schema_version: payload.schema_version,
      payload_hash: payloadHash,
      signature,
      signing_key_id: TEST_KEY.signingKeyId,
      anchor_reference: null,
      idempotency_key: null,
      created_at: payload.evaluated_at,
    };
    const env = {
      ABRAXAS_SOVEREIGN_ENV_CLASS: "disposable",
      ABRAXAS_SOVEREIGN_STAGING_PG_URL: "postgresql://unused:5432/unreachable",
    };
    const result = await evaluateReceiptFreshnessFromSovereignPg({
      record,
      issuerPublicJwk: TEST_KEY.publicKeyJwk,
      env,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(result.signature_authentic).toBe(true);
    expect(result.currently_acceptable).toBe(false);
    expect(result.invalidation_reasons).toContain("receipt_expired");
  });
});

describe("fixture parity runner", () => {
  it("reports ok when snapshots align", () => {
    const record = sampleRecord();
    const report = runFixtureParityFromSnapshots({
      legacyReceipt: record,
      sovereignReceipt: record,
      idempotencyKey: "meter:pf_receipt:dr_shadow814",
      legacyMeteringRow: {
        idempotency_key: "meter:pf_receipt:dr_shadow814",
        partner_id: "partner-shadow",
        event_type: "partner_flow_receipt_issued",
        receipt_id: "dr_shadow814",
      },
      sovereignMeteringRow: {
        idempotency_key: "meter:pf_receipt:dr_shadow814",
        partner_id: "partner-shadow",
        event_type: "partner_flow_receipt_issued",
        receipt_id: "dr_shadow814",
      },
    });
    expect(report.ok).toBe(true);
  });
});
