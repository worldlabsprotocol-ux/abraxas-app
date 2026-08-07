import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  FileFulfillmentStore,
  FULFILLMENT_LEDGER_SQL_SCHEMA,
  isGrantActive,
} from "./fulfillmentStore";
import type { FulfillmentRecord } from "./types";

describe("FileFulfillmentStore", () => {
  let dir: string;
  let store: FileFulfillmentStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "x402-ledger-"));
    store = new FileFulfillmentStore({ filePath: join(dir, "ledger.json") });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("persists records across store instances (durable, not in-memory)", async () => {
    const record: FulfillmentRecord = {
      idempotency_key: "key-1",
      receipt_id: "dr_test",
      payment_payload_hash: "hash-abc",
      settlement_ref: "settle-1",
      status: "settled",
      access_grant_expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      payment_response: { x402Version: 2, success: true, settlementRef: "settle-1" },
    };

    await store.insertPending({ ...record, status: "pending", settlement_ref: null });
    await store.markSettled("key-1", {
      settlement_ref: "settle-1",
      payment_response: record.payment_response,
      access_grant_expires_at: record.access_grant_expires_at,
    });

    const reloaded = new FileFulfillmentStore({ filePath: join(dir, "ledger.json") });
    const loaded = await reloaded.getByIdempotencyKey("key-1");
    expect(loaded?.status).toBe("settled");
    expect(isGrantActive(loaded!)).toBe(true);
  });

  it("documents SQL schema for production partners", () => {
    expect(FULFILLMENT_LEDGER_SQL_SCHEMA).toContain("idempotency_key");
    expect(FULFILLMENT_LEDGER_SQL_SCHEMA).toContain("ambiguous");
  });
});
