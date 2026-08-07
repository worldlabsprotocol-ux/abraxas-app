// FILE: lib/x402/referenceGateway/fulfillmentStore.ts
// Fulfillment ledger interfaces — FileFulfillmentStore is LOCAL-DEMO ONLY (not durable).

import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "fs";
import { dirname } from "path";
import type { FulfillmentRecord, FulfillmentStatus, SettleResponse } from "./types";

export interface FulfillmentStore {
  getByIdempotencyKey(key: string): Promise<FulfillmentRecord | null>;
  insertPending(record: FulfillmentRecord): Promise<"inserted" | "conflict">;
  markSettled(
    key: string,
    update: { settlement_ref: string; payment_response: SettleResponse; access_grant_expires_at: string },
  ): Promise<"updated" | "missing" | "conflict">;
  markFailed(key: string, payment_response: SettleResponse): Promise<void>;
  markAmbiguous(key: string, payment_response: SettleResponse): Promise<void>;
}

/** Brand for adapters backed by a real durable store (Postgres, DynamoDB, etc.). */
export const DURABLE_FULFILLMENT_STORE_BRAND = Symbol("DurableFulfillmentStore");

export interface DurableFulfillmentStore extends FulfillmentStore {
  readonly [DURABLE_FULFILLMENT_STORE_BRAND]: true;
}

export function isDurableFulfillmentStore(store: FulfillmentStore): store is DurableFulfillmentStore {
  return DURABLE_FULFILLMENT_STORE_BRAND in store;
}

/** Read-only stub — used when only 402 PAYMENT-REQUIRED is served (no settlement). */
export class NoOpFulfillmentStore implements FulfillmentStore {
  async getByIdempotencyKey(): Promise<FulfillmentRecord | null> {
    return null;
  }

  async insertPending(): Promise<"inserted" | "conflict"> {
    throw new Error("noop_fulfillment_store_write");
  }

  async markSettled(): Promise<"updated" | "missing" | "conflict"> {
    throw new Error("noop_fulfillment_store_write");
  }

  async markFailed(): Promise<void> {
    throw new Error("noop_fulfillment_store_write");
  }

  async markAmbiguous(): Promise<void> {
    throw new Error("noop_fulfillment_store_write");
  }
}

export interface FileFulfillmentStoreOptions {
  filePath: string;
}

type LedgerFile = {
  version: 1;
  records: Record<string, FulfillmentRecord>;
};

function readLedger(filePath: string): LedgerFile {
  if (!existsSync(filePath)) {
    return { version: 1, records: {} };
  }
  const raw = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as LedgerFile;
  if (parsed?.version !== 1 || typeof parsed.records !== "object") {
    throw new Error("fulfillment_ledger_corrupt");
  }
  return parsed;
}

function writeLedger(filePath: string, ledger: LedgerFile): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
  renameSync(tmp, filePath);
}

/**
 * Local-demo file-backed ledger for developer workstations only.
 * NOT durable across serverless instances, NOT safe for production or Vercel.
 */
export class FileFulfillmentStore implements FulfillmentStore {
  private readonly filePath: string;

  constructor(options: FileFulfillmentStoreOptions) {
    this.filePath = options.filePath;
  }

  private withLedger<T>(fn: (ledger: LedgerFile) => T): T {
    const ledger = readLedger(this.filePath);
    const result = fn(ledger);
    writeLedger(this.filePath, ledger);
    return result;
  }

  async getByIdempotencyKey(key: string): Promise<FulfillmentRecord | null> {
    const ledger = readLedger(this.filePath);
    return ledger.records[key] ?? null;
  }

  async insertPending(record: FulfillmentRecord): Promise<"inserted" | "conflict"> {
    return this.withLedger((ledger) => {
      if (ledger.records[record.idempotency_key]) return "conflict";
      ledger.records[record.idempotency_key] = record;
      return "inserted";
    });
  }

  async markSettled(
    key: string,
    update: { settlement_ref: string; payment_response: SettleResponse; access_grant_expires_at: string },
  ): Promise<"updated" | "missing" | "conflict"> {
    return this.withLedger((ledger) => {
      const existing = ledger.records[key];
      if (!existing) return "missing";
      if (existing.status === "settled") return "conflict";
      ledger.records[key] = {
        ...existing,
        status: "settled",
        settlement_ref: update.settlement_ref,
        payment_response: update.payment_response,
        access_grant_expires_at: update.access_grant_expires_at,
      };
      return "updated";
    });
  }

  async markFailed(key: string, payment_response: SettleResponse): Promise<void> {
    this.withLedger((ledger) => {
      const existing = ledger.records[key];
      if (!existing) return;
      ledger.records[key] = { ...existing, status: "failed", payment_response };
    });
  }

  async markAmbiguous(key: string, payment_response: SettleResponse): Promise<void> {
    this.withLedger((ledger) => {
      const existing = ledger.records[key];
      if (!existing) return;
      ledger.records[key] = { ...existing, status: "ambiguous", payment_response };
    });
  }
}

/**
 * SQL schema partners must implement for a durable fulfillment ledger.
 * NOT applied or implemented by Abraxas — documentation only.
 */
export const FULFILLMENT_LEDGER_SQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS x402_fulfillment_ledger (
  idempotency_key TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL,
  payment_payload_hash TEXT NOT NULL,
  settlement_ref TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'settled', 'failed', 'ambiguous')),
  access_grant_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_response_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_x402_fulfillment_receipt ON x402_fulfillment_ledger (receipt_id);
`.trim();

export function isGrantActive(record: FulfillmentRecord, now = new Date()): boolean {
  if (record.status !== "settled") return false;
  return new Date(record.access_grant_expires_at).getTime() > now.getTime();
}

export function isTerminalFailureStatus(status: FulfillmentStatus): boolean {
  return status === "failed" || status === "ambiguous";
}
