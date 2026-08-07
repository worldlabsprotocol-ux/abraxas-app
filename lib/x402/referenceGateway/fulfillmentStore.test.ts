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
import { buildSuccessSettlementResponse } from "./x402V2Wire";

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

  it("persists records across store instances for local-demo replay only", async () => {
    const tx = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const paymentResponse = buildSuccessSettlementResponse(tx);
    const record: FulfillmentRecord = {
      idempotency_key: "key-1",
      receipt_id: "dr_test",
      payment_payload_hash: "hash-abc",
      settlement_ref: tx,
      status: "settled",
      access_grant_expires_at: new Date(Date.now() + 60_000).toISOString(),
      created_at: new Date().toISOString(),
      payment_response: paymentResponse,
    };

    await store.insertPending({ ...record, status: "pending", settlement_ref: null });
    await store.markSettled("key-1", {
      settlement_ref: tx,
      payment_response: paymentResponse,
      access_grant_expires_at: record.access_grant_expires_at,
    });

    const reloaded = new FileFulfillmentStore({ filePath: join(dir, "ledger.json") });
    const loaded = await reloaded.getByIdempotencyKey("key-1");
    expect(loaded?.status).toBe("settled");
    expect(isGrantActive(loaded!)).toBe(true);
  });

  it("documents SQL schema for production partners (not implemented)", () => {
    expect(FULFILLMENT_LEDGER_SQL_SCHEMA).toContain("idempotency_key");
    expect(FULFILLMENT_LEDGER_SQL_SCHEMA).toContain("ambiguous");
  });
});
