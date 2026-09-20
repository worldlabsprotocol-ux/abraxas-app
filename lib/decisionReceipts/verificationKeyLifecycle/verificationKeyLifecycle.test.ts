// FILE: lib/decisionReceipts/verificationKeyLifecycle/verificationKeyLifecycle.test.ts

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { DECISION_RECEIPT_SCHEMA_VERSION, type DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
} from "@/lib/decisionReceipts/signing";
import { verifyRecordSignature } from "@/lib/decisionReceipts/views";
import { GET as verificationKeysGet } from "@/app/api/receipts/verification-keys/route";
import {
  RECEIPT_VERIFICATION_REGISTRY_ENV,
  assertNoPrivateReceiptKeyMaterial,
  buildReceiptVerificationKeyDocument,
  resolveIssuanceSigningKey,
  resolveVerificationKey,
  verifyRecordSignatureWithRegistry,
} from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { permitProtocolAction } from "@/lib/partner/integrationKit";
import { PORTABLE_ACTION_CLIENT_VISIBLE_KEYS } from "@/lib/partner/portableActionContract/contract";
import { TRADING_VENUE_CLIENT_VISIBLE_KEYS } from "@/lib/partner/tradingVenue/contract";
import { PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS } from "@/lib/partner/paymentAuthorization/contract";
import { EVM_PARTNER_CLIENT_VISIBLE_KEYS } from "@/lib/partner/evm/contract";

const PRIMARY = generateTestSigningKeyPair();
process.env.ABRAXAS_SIGNING_KEY_ID = PRIMARY.signingKeyId;
process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(PRIMARY.publicKeyJwk);
process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(PRIMARY.privateKeyJwk);

function registryEntry(input: {
  key?: ReturnType<typeof generateTestSigningKeyPair>;
  status?: string;
  environment?: string;
  not_before?: string;
  expires_at?: string | null;
  schema_versions?: string[];
  allow_historical_verification?: boolean;
  historical_verify_until?: string | null;
  reason_class?: string;
  extra?: Record<string, unknown>;
}) {
  const key = input.key ?? PRIMARY;
  return {
    key_id: key.signingKeyId,
    algorithm: "Ed25519",
    environment: input.environment ?? "demo",
    status: input.status ?? "active",
    public_jwk: { kty: "OKP", crv: "Ed25519", x: key.publicKeyJwk.x },
    issued_at: "2024-01-01T00:00:00.000Z",
    not_before: input.not_before ?? "2024-01-01T00:00:00.000Z",
    expires_at: input.expires_at === undefined ? "2099-01-01T00:00:00.000Z" : input.expires_at,
    schema_versions: input.schema_versions ?? [DECISION_RECEIPT_SCHEMA_VERSION],
    allow_historical_verification: input.allow_historical_verification,
    historical_verify_until: input.historical_verify_until,
    reason_class: input.reason_class,
    issuer_label: "Abraxas",
    ...input.extra,
  };
}

function sampleRecord(key = PRIMARY, overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  const payload = buildCanonicalPayload({
    receipt_id: "dr_key_lifecycle",
    decision_id: "00000000-0000-4000-8000-000000000099",
    policy_id: "abraxas-booking-v1",
    policy_version: 1,
    partner_id: "abraxas",
    subject_pseudonym_id: "ps_test",
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: [],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "production",
    evaluated_at: "2026-06-01T12:00:00.000Z",
    expires_at: "2026-07-01T12:00:00.000Z",
  });
  const { payloadHash, signature } = signReceiptPayload(payload, key.privateKeyJwk);
  return {
    id: payload.receipt_id,
    verification_decision_id: payload.decision_id,
    consent_receipt_id: payload.consent_receipt_id,
    partner_id: payload.partner_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    wallet_binding_ref: payload.wallet_binding_ref,
    decision_result: payload.decision_result,
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    revoked_at: null,
    status: "active",
    schema_version: payload.schema_version,
    payload_hash: payloadHash,
    signature,
    signing_key_id: key.signingKeyId,
    anchor_reference: null,
    idempotency_key: payload.decision_id,
    created_at: payload.evaluated_at,
    ...overrides,
  };
}

describe("receipt verification key lifecycle", () => {
  beforeEach(() => {
    process.env.ABRAXAS_SIGNING_KEY_ID = PRIMARY.signingKeyId;
    process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(PRIMARY.publicKeyJwk);
    process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(PRIMARY.privateKeyJwk);
    delete process.env[RECEIPT_VERIFICATION_REGISTRY_ENV];
    delete process.env.ABRAXAS_RUNTIME_ENV;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    delete process.env[RECEIPT_VERIFICATION_REGISTRY_ENV];
  });

  it("issues only with an active in-window key for this environment and schema", () => {
    const issued = resolveIssuanceSigningKey({ schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.key_id).toBe(PRIMARY.signingKeyId);
    expect(issued.privateKeyJwk.kty).toBe("OKP");
  });

  it("rejects unknown key IDs", () => {
    const record = sampleRecord(PRIMARY, { signing_key_id: "unknown-key" });
    expect(verifyRecordSignatureWithRegistry(record)).toBe(false);
    expect(resolveVerificationKey({
      keyId: "unknown-key",
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    }).ok).toBe(false);
  });

  it("rejects wrong environment keys", () => {
    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ environment: "production" }),
    ]);
    const resolved = resolveVerificationKey({
      keyId: PRIMARY.signingKeyId,
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
      runtimeEnvironment: "demo",
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.reason).toBe("wrong_environment");
  });

  it("rejects not-before and expiry for active keys", () => {
    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ not_before: "2090-01-01T00:00:00.000Z" }),
    ]);
    expect(resolveVerificationKey({
      keyId: PRIMARY.signingKeyId,
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
      now: new Date("2026-01-01T00:00:00.000Z"),
    }).ok).toBe(false);

    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ expires_at: "2020-01-01T00:00:00.000Z" }),
    ]);
    const expired = resolveVerificationKey({
      keyId: PRIMARY.signingKeyId,
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(expired.ok).toBe(false);
    if (expired.ok) return;
    expect(expired.reason).toBe("expired");
  });

  it("permits historical verification for retiring and retired keys when allowed", () => {
    const old = generateTestSigningKeyPair("retired-historical-key");
    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ status: "retiring", key: old, allow_historical_verification: true, expires_at: "2020-01-01T00:00:00.000Z" }),
    ]);
    const record = sampleRecord(old);
    expect(verifyRecordSignatureWithRegistry(record)).toBe(true);

    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ status: "retired", key: old, allow_historical_verification: true }),
    ]);
    expect(verifyRecordSignatureWithRegistry(record)).toBe(true);
  });

  it("rejects revoked keys and schema mismatches", () => {
    const old = generateTestSigningKeyPair("revoked-historical-key");
    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ status: "revoked", key: old, reason_class: "compromise" }),
    ]);
    expect(verifyRecordSignatureWithRegistry(sampleRecord(old))).toBe(false);

    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ schema_versions: ["9.9.9"] }),
    ]);
    const mismatch = resolveVerificationKey({
      keyId: PRIMARY.signingKeyId,
      schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    });
    expect(mismatch.ok).toBe(false);
    if (mismatch.ok) return;
    expect(mismatch.reason).toBe("schema_mismatch");
  });

  it("serializes a public trust document without private material", async () => {
    const document = buildReceiptVerificationKeyDocument();
    expect("ok" in document && document.ok === false).toBe(false);
    expect(assertNoPrivateReceiptKeyMaterial(document)).toEqual([]);
    expect(JSON.stringify(document)).not.toContain('"d"');
    expect(JSON.stringify(document).toLowerCase()).not.toContain("abraxas_signing_key");

    const ok = await verificationKeysGet(new NextRequest("http://localhost/api/receipts/verification-keys"));
    expect(ok.status).toBe(200);
    const json = await ok.json();
    expect(json.document).toBe("abraxas_receipt_verification_keys");
    expect(json.notice).toMatch(/re-fetch a current public receipt/i);
    expect(assertNoPrivateReceiptKeyMaterial(json)).toEqual([]);
  });

  it("rejects client key-selection overrides and keeps DEMO/Production material separate", async () => {
    const blocked = await verificationKeysGet(new NextRequest(
      "http://localhost/api/receipts/verification-keys?signing_key_id=attacker&environment=production",
    ));
    expect(blocked.status).toBe(400);

    process.env.ABRAXAS_RUNTIME_ENV = "demo";
    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ environment: "production" }),
    ]);
    const demoDoc = buildReceiptVerificationKeyDocument();
    if ("ok" in demoDoc && demoDoc.ok === false) {
      expect(demoDoc.status).toMatch(/unavailable|inconsistent/);
    } else {
      expect(demoDoc.keys.every((key) => key.environment === "demo")).toBe(true);
    }
  });

  it("does not leak private keys in docs, kits, or adapters and keeps existing contracts", () => {
    const src = [
      readFileSync(join(process.cwd(), "lib/decisionReceipts/verificationKeyLifecycle/examples.ts"), "utf8"),
      readFileSync(join(process.cwd(), "app/docs/receipt-key-lifecycle/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "lib/partner/starterKit/files.ts"), "utf8"),
    ].join("\n");
    expect(src).not.toMatch(/"d":\s*"/);
    expect(src).toContain("verification-keys");
    expect(typeof permitProtocolAction).toBe("function");
    expect(PORTABLE_ACTION_CLIENT_VISIBLE_KEYS).toContain("allowed");
    expect(TRADING_VENUE_CLIENT_VISIBLE_KEYS).toContain("allowed");
    expect(PAYMENT_AUTHORIZATION_CLIENT_VISIBLE_KEYS).toContain("allowed");
    expect(EVM_PARTNER_CLIENT_VISIBLE_KEYS).toContain("allowed");
    expect(verifyRecordSignature(sampleRecord())).toBe(true);
  });

  it("fails closed when the registry JSON is inconsistent or unavailable", () => {
    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = "{not-json";
    expect(resolveIssuanceSigningKey({ schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION }).ok).toBe(false);

    process.env[RECEIPT_VERIFICATION_REGISTRY_ENV] = JSON.stringify([
      registryEntry({ extra: { d: "should-never-be-accepted" } }),
    ]);
    expect(resolveIssuanceSigningKey({ schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION }).ok).toBe(false);
  });
});
