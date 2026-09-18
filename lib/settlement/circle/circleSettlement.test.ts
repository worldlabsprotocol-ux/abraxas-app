import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { parseAmountMinor, formatUsdcFromMinor, parseUsdcStringToMinor } from "@/lib/settlement/circle/amount";
import {
  applyCircleProviderResult,
  rejectClientProvidedSettlementProof,
} from "@/lib/settlement/circle/execute";
import { isCircleAuthenticatedResult, sealCircleAuthenticatedResult } from "@/lib/settlement/circle/authenticated.server";
import {
  credentialsReady,
  readCircleCredentialProbe,
  toPublicCircleAvailability,
} from "@/lib/settlement/circle/availability";
import { CIRCLE_PUBLIC_CODES } from "@/lib/settlement/circle/codes";
import {
  circleEvidenceConformanceFixture,
  validateCircleSafeEvidence,
} from "@/lib/settlement/circle/evidence";
import type { SettlementIntentRow } from "@/lib/settlement/circle/store";
import { CIRCLE_CURRENCY, CIRCLE_NETWORK } from "@/lib/settlement/circle/constants";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function intent(overrides: Partial<SettlementIntentRow> = {}): SettlementIntentRow {
  return {
    id: "intent-1",
    application_id: "app-1",
    partner_id: "acme",
    idempotency_key: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    state: "pending",
    network: CIRCLE_NETWORK,
    currency: CIRCLE_CURRENCY,
    amount_minor: 10_000,
    receipt_id: "receipt-1",
    policy_id: "policy-1",
    policy_version: 1,
    provider_request_ref: null,
    circle_transaction_id: null,
    provider_state: null,
    provider_occurred_at: null,
    infrastructure_label: "DEMO/testnet settlement wallet — test infrastructure only",
    created_at: "2026-09-18T00:00:00.000Z",
    updated_at: "2026-09-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("Circle integer USDC amounts", () => {
  it("parses integer minor units and rejects floats", () => {
    expect(parseAmountMinor(10_000)).toBe(10_000);
    expect(parseAmountMinor("10000")).toBe(10_000);
    expect(parseAmountMinor(0.01)).toBeNull();
    expect(parseAmountMinor("1e4")).toBeNull();
    expect(parseAmountMinor(2_000_000)).toBeNull();
  });

  it("formats and parses USDC strings without floats", () => {
    expect(formatUsdcFromMinor(10_000)).toBe("0.01");
    expect(parseUsdcStringToMinor("0.01")).toBe(10_000);
    expect(parseUsdcStringToMinor("1")).toBe(1_000_000);
    expect(parseUsdcStringToMinor("0.0100001")).toBeNull();
  });
});

describe("Circle credential probe and public availability", () => {
  const keys = [
    "CIRCLE_API_KEY",
    "CIRCLE_ENTITY_SECRET",
    "CIRCLE_WALLET_SET_ID",
    "CIRCLE_DEMO_SOURCE_WALLET_ID",
    "CIRCLE_DEMO_DESTINATION_WALLET_ID",
    "CIRCLE_ARC_TESTNET_ENABLED",
    "VERCEL_ENV",
    "ABRAXAS_RUNTIME_ENV",
  ] as const;
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) previous[key] = process.env[key];
    for (const key of keys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  function readySecrets() {
    process.env.CIRCLE_API_KEY = "TEST_API_KEY:not-a-real-key";
    process.env.CIRCLE_ENTITY_SECRET = "aa".repeat(32);
    process.env.CIRCLE_WALLET_SET_ID = "wallet-set";
    process.env.CIRCLE_DEMO_SOURCE_WALLET_ID = "source";
    process.env.CIRCLE_DEMO_DESTINATION_WALLET_ID = "dest";
  }

  it("is unavailable without credentials", () => {
    const probe = readCircleCredentialProbe();
    expect(credentialsReady(probe)).toBe(false);
    const publicAvailability = toPublicCircleAvailability({ schemaReady: true, credentials: probe });
    expect(publicAvailability.credentials_status).toBe("unavailable");
    expect(JSON.stringify(publicAvailability)).not.toContain("api_key");
    expect(JSON.stringify(publicAvailability)).not.toContain("entity_secret");
    expect(JSON.stringify(publicAvailability)).not.toContain("wallet_set");
  });

  it("blocks live Circle API keys", () => {
    process.env.CIRCLE_API_KEY = "LIVE_API_KEY:not-a-real-key";
    process.env.CIRCLE_ENTITY_SECRET = "aa".repeat(32);
    process.env.CIRCLE_WALLET_SET_ID = "wallet-set";
    process.env.CIRCLE_DEMO_SOURCE_WALLET_ID = "source";
    process.env.CIRCLE_DEMO_DESTINATION_WALLET_ID = "dest";
    process.env.CIRCLE_ARC_TESTNET_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    const probe = readCircleCredentialProbe();
    expect(probe.live_key_blocked).toBe(true);
    expect(credentialsReady(probe)).toBe(false);
  });

  it("blocks Production runtime even with the testnet flag", () => {
    readySecrets();
    process.env.CIRCLE_ARC_TESTNET_ENABLED = "true";
    process.env.VERCEL_ENV = "production";
    const probe = readCircleCredentialProbe();
    expect(probe.production_env_blocked).toBe(true);
    expect(credentialsReady(probe)).toBe(false);
    expect(toPublicCircleAvailability({ schemaReady: true, credentials: probe }).code)
      .toBe("circle_production_blocked");
  });

  it("blocks local and staging unless explicitly allowlisted for DEMO testnet", () => {
    readySecrets();
    process.env.VERCEL_ENV = "staging";
    const blocked = readCircleCredentialProbe();
    expect(blocked.environment_blocked).toBe(true);
    expect(credentialsReady(blocked)).toBe(false);
    expect(toPublicCircleAvailability({ schemaReady: true, credentials: blocked }).code)
      .toBe("circle_environment_blocked");

    process.env.CIRCLE_ARC_TESTNET_ENABLED = "true";
    process.env.ABRAXAS_RUNTIME_ENV = "demo";
    delete process.env.VERCEL_ENV;
    const allowed = readCircleCredentialProbe();
    expect(allowed.environment_blocked).toBe(false);
    expect(credentialsReady(allowed)).toBe(true);
    expect(toPublicCircleAvailability({ schemaReady: true, credentials: allowed }).credentials_status)
      .toBe("configured");
  });
});

describe("Circle authenticated provider results", () => {
  it("does not settle from an unsealed mock object", () => {
    const fake = {
      providerRequestRef: "req-1",
      circleTransactionId: "tx-1",
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
      amountMinor: 10_000,
      providerState: "COMPLETE" as const,
      occurredAt: "2026-09-18T00:00:00.000Z",
    };
    expect(isCircleAuthenticatedResult(fake)).toBe(false);
    const applied = applyCircleProviderResult(intent(), fake);
    expect(applied.ok).toBe(false);
    if (!applied.ok) expect(applied.code).toBe(CIRCLE_PUBLIC_CODES.unauthenticated_result);
  });

  it("settles only from a sealed Circle result with COMPLETE", () => {
    const sealed = sealCircleAuthenticatedResult({
      providerRequestRef: "req-1",
      circleTransactionId: "tx-1",
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
      amountMinor: 10_000,
      providerState: "COMPLETE",
      occurredAt: "2026-09-18T00:00:00.000Z",
    });
    const applied = applyCircleProviderResult(intent(), sealed);
    expect(applied.ok).toBe(true);
    if (applied.ok) expect(applied.state).toBe("settled");
  });

  it("keeps queued authenticated results as submitted, not settled", () => {
    const sealed = sealCircleAuthenticatedResult({
      providerRequestRef: "req-1",
      circleTransactionId: "tx-1",
      network: CIRCLE_NETWORK,
      currency: CIRCLE_CURRENCY,
      amountMinor: 10_000,
      providerState: "QUEUED",
      occurredAt: "2026-09-18T00:00:00.000Z",
    });
    const applied = applyCircleProviderResult(intent(), sealed);
    expect(applied.ok).toBe(true);
    if (applied.ok) expect(applied.state).toBe("submitted");
  });
});

describe("client-supplied settlement proof", () => {
  it("rejects browser hashes, callback parameters, and wallet addresses", () => {
    expect(rejectClientProvidedSettlementProof({ transaction_hash: "0xabc" }))
      .toBe(CIRCLE_PUBLIC_CODES.client_hash_rejected);
    expect(rejectClientProvidedSettlementProof({ tx_digest: "digest" }))
      .toBe(CIRCLE_PUBLIC_CODES.client_hash_rejected);
    expect(rejectClientProvidedSettlementProof({ wallet_address: "0xabc" }))
      .toBe(CIRCLE_PUBLIC_CODES.client_hash_rejected);
    expect(rejectClientProvidedSettlementProof({ receipt_id: "r1", idempotency_key: "demo-arc-settlement-1" }))
      .toBeNull();
  });
});

describe("Circle safe evidence and public module boundary", () => {
  it("accepts the DEMO fixture and rejects secrets or production activation", () => {
    expect(validateCircleSafeEvidence(circleEvidenceConformanceFixture()).ok).toBe(true);
    expect(validateCircleSafeEvidence({
      ...circleEvidenceConformanceFixture(),
      api_key: "TEST_API_KEY:leaked",
    }).ok).toBe(false);
    expect(validateCircleSafeEvidence({
      ...circleEvidenceConformanceFixture(),
      activates_production: true,
    }).ok).toBe(false);
    expect(validateCircleSafeEvidence({
      ...circleEvidenceConformanceFixture(),
      idempotency_key: "demo-arc-settlement-1",
    }).ok).toBe(false);
  });

  it("does not export test sealing helpers from the public production module", () => {
    const index = readFileSync(resolve(process.cwd(), "lib/settlement/circle/index.ts"), "utf8");
    const execute = readFileSync(resolve(process.cwd(), "lib/settlement/circle/execute.ts"), "utf8");
    expect(index).not.toContain("sealCircleAuthenticatedResult");
    expect(execute).not.toContain("port?:");
    expect(execute).toContain("createCircleWalletsPortFromEnv()");
  });
});
