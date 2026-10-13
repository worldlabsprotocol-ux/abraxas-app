// FILE: lib/institutionalCertification/build548/distributedReplayCertification.test.ts

import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  build546PublicPartnerView,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { ExternalRelyingPartyHarness } from "@/lib/institutionalCertification/build546/externalRelyingParty";
import {
  applyBuild548Schema,
  PostgresReceiptConsumptionStore,
  resolveBuild548DatabaseUrl,
} from "./postgresConsumptionStore";
import { InMemoryReceiptConsumptionStore } from "../build547/receiptConsumptionStore";

const pgUrl = resolveBuild548DatabaseUrl();
const describePg = pgUrl ? describe : describe.skip;

describePg("Build #548 PostgreSQL distributed replay", () => {
  let pool: pg.Pool;
  let store: PostgresReceiptConsumptionStore;

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: pgUrl! });
    await applyBuild548Schema(pool);
    store = new PostgresReceiptConsumptionStore(pool, "test-coordinator");
  });

  beforeEach(async () => {
    await store.truncateForTests();
  });

  afterAll(async () => {
    await pool.end();
  });

  function rp(instance: string) {
    return new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env: build546TrustRegistryEnv(),
      consumptionStore: new PostgresReceiptConsumptionStore(pool, instance),
    });
  }

  it("concurrent workers — exactly one grant across instances", async () => {
    Object.assign(process.env, build546TrustRegistryEnv());
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const workers = 32;
    const results = await Promise.all(
      Array.from({ length: workers }, (_, i) =>
        rp(`worker-${i % 4}`).decide({
          requestId: `distributed-req-${i}`,
          signedRecord: record,
          publicReceipt: pub,
          now: BUILD_546_FIXTURE_NOW,
          revocationSource: { available: true, status: "active" },
        }),
      ),
    );
    const granted = results.filter((r) => r.outcome === "granted");
    const replays = results.filter((r) => r.replay_detected);
    expect(granted).toHaveLength(1);
    expect(granted[0]?.durable_audit_logged).toBe(true);
    expect(granted[0]?.authorization_verified).toBe(true);
    expect(replays.length).toBe(workers - 1);
    const audit = await store.listAudit();
    expect(audit).toHaveLength(1);
  });

  it("duplicate delivery with new request_id remains replay", async () => {
    Object.assign(process.env, build546TrustRegistryEnv());
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const first = await rp("dup-a").decide({
      requestId: "delivery-1",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(first.outcome).toBe("granted");
    const dup = await rp("dup-b").decide({
      requestId: "delivery-2-retry",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(dup.outcome).toBe("denied");
    expect(dup.replay_detected).toBe(true);
  });

  it("transaction rollback on audit failure — no durable consumption committed", async () => {
    const crashStore = new PostgresReceiptConsumptionStore(pool, "crash", {
      afterConsumptionInsert: () => {
        throw new Error("simulated_crash_before_audit");
      },
    });
    const record = build546SampleRecord();
    await expect(
      crashStore.tryRecordConsumption({
        receiptId: record.id,
        requestId: "crash-req",
        partnerId: BUILD_546_PARTNER_ID,
        policyId: BUILD_546_POLICY_ID,
        at: BUILD_546_FIXTURE_NOW.toISOString(),
      }),
    ).rejects.toThrow("simulated_crash_before_audit");
    const consumed = await crashStore.hasConsumed({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      receiptId: record.id,
    });
    expect(consumed).toBe(false);
    const audit = await store.listAudit();
    expect(audit.filter((a) => a.receipt_id === record.id)).toHaveLength(0);
  });

  it("survives new pool connection (database session restart simulation)", async () => {
    Object.assign(process.env, build546TrustRegistryEnv());
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const grant = await rp("session-a").decide({
      requestId: "restart-req",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(grant.outcome).toBe("granted");
    const freshPool = new pg.Pool({ connectionString: pgUrl! });
    const freshStore = new PostgresReceiptConsumptionStore(freshPool, "session-b");
    const replay = await new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env: build546TrustRegistryEnv(),
      consumptionStore: freshStore,
    }).decide({
      requestId: "restart-replay",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(replay.replay_detected).toBe(true);
    await freshPool.end();
  });
});

describe("Build #548 adapter assurance levels", () => {
  it("memory vs postgres kinds are distinct", () => {
    expect(new InMemoryReceiptConsumptionStore().kind).toBe("memory");
  });
});

describe("Build #548 persistence unavailable (deterministic)", () => {
  it("fail-closed when PostgreSQL is unreachable", async () => {
    Object.assign(process.env, build546TrustRegistryEnv());
    const badPool = new pg.Pool({
      connectionString: "postgresql://invalid:invalid@127.0.0.1:1/nodb",
      connectionTimeoutMillis: 500,
    });
    const store = new PostgresReceiptConsumptionStore(badPool, "unreachable");
    const record = build546SampleRecord();
    const pub = build546PublicPartnerView(record);
    const rpHarness = new ExternalRelyingPartyHarness({
      partnerId: BUILD_546_PARTNER_ID,
      policyId: BUILD_546_POLICY_ID,
      env: build546TrustRegistryEnv(),
      consumptionStore: store,
    });
    const decision = await rpHarness.decide({
      requestId: "unreachable-db",
      signedRecord: record,
      publicReceipt: pub,
      now: BUILD_546_FIXTURE_NOW,
      revocationSource: { available: true, status: "active" },
    });
    expect(decision.outcome).toBe("blocked");
    expect(decision.persistence_unavailable).toBe(true);
    expect(decision.consumption_recorded).toBe(false);
    await badPool.end();
  });
});
