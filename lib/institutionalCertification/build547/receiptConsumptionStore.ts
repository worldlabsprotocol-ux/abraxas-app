// FILE: lib/institutionalCertification/build547/receiptConsumptionStore.ts
// Durable single-use receipt consumption — filesystem atomic create (no Supabase).

import { mkdir, appendFile, writeFile, readFile, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export type ConsumptionAttemptResult =
  | { status: "recorded"; consumption_id: string }
  | {
      status: "audit_append_failed";
      consumption_id: string;
      audit_error: string;
    }
  | { status: "replay"; consumption_id: string | null };

export interface ConsumptionAuditEntry {
  consumption_id: string;
  receipt_id: string;
  request_id: string;
  partner_id: string;
  recorded_at: string;
  instance_id: string;
}

export interface ReceiptConsumptionStore {
  readonly kind: "memory" | "filesystem";
  tryRecordConsumption(input: {
    receiptId: string;
    requestId: string;
    partnerId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult>;
  hasConsumed(receiptId: string): Promise<boolean>;
  listAudit(limit?: number): Promise<ConsumptionAuditEntry[]>;
  /** Filesystem certification store only — backfill audit.jsonl from wx markers. */
  reconcileAuditFromMarkers?(): Promise<{ backfilled: number; skipped: number }>;
}

function consumptionId(receiptId: string, requestId: string): string {
  return createHash("sha256").update(`${receiptId}:${requestId}`).digest("hex").slice(0, 24);
}

function safeReceiptKey(receiptId: string): string {
  return createHash("sha256").update(receiptId).digest("hex");
}

/** Build #546-compatible in-memory store (not institutional persistence). */
export class InMemoryReceiptConsumptionStore implements ReceiptConsumptionStore {
  readonly kind = "memory" as const;
  private readonly consumed = new Set<string>();
  private readonly audit: ConsumptionAuditEntry[] = [];

  async tryRecordConsumption(input: {
    receiptId: string;
    requestId: string;
    partnerId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult> {
    if (this.consumed.has(input.receiptId)) {
      return { status: "replay", consumption_id: null };
    }
    this.consumed.add(input.receiptId);
    const id = consumptionId(input.receiptId, input.requestId);
    this.audit.push({
      consumption_id: id,
      receipt_id: input.receiptId,
      request_id: input.requestId,
      partner_id: input.partnerId,
      recorded_at: input.at,
      instance_id: "memory",
    });
    return { status: "recorded", consumption_id: id };
  }

  async hasConsumed(receiptId: string): Promise<boolean> {
    return this.consumed.has(receiptId);
  }

  async listAudit(limit = 100): Promise<ConsumptionAuditEntry[]> {
    return this.audit.slice(-limit);
  }
}

export type FileReceiptConsumptionStoreOptions = {
  /** Certification test hook — simulates crash after marker create. */
  appendAudit?: (auditPath: string, line: string) => Promise<void>;
};

/** Atomic `wx` marker files + append-only audit log — certification-scoped durability only. */
export class FileReceiptConsumptionStore implements ReceiptConsumptionStore {
  readonly kind = "filesystem" as const;
  private readonly consumedDir: string;
  private readonly auditPath: string;
  private readonly instanceId: string;
  private readonly appendAudit: (auditPath: string, line: string) => Promise<void>;

  constructor(
    baseDir: string,
    instanceId = `inst-${process.pid}`,
    options?: FileReceiptConsumptionStoreOptions,
  ) {
    this.consumedDir = join(baseDir, "consumed");
    this.auditPath = join(baseDir, "consumption-audit.jsonl");
    this.instanceId = instanceId;
    this.appendAudit =
      options?.appendAudit
      ?? ((path, line) => appendFile(path, line, "utf8"));
  }

  async init(): Promise<void> {
    await mkdir(this.consumedDir, { recursive: true });
  }

  async tryRecordConsumption(input: {
    receiptId: string;
    requestId: string;
    partnerId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult> {
    await this.init();
    const marker = join(this.consumedDir, `${safeReceiptKey(input.receiptId)}.json`);
    const id = consumptionId(input.receiptId, input.requestId);
    const payload = JSON.stringify({
      consumption_id: id,
      receipt_id: input.receiptId,
      request_id: input.requestId,
      partner_id: input.partnerId,
      recorded_at: input.at,
      instance_id: this.instanceId,
    });

    try {
      await writeFile(marker, payload, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      if (code === "EEXIST") {
        return { status: "replay", consumption_id: null };
      }
      throw error;
    }

    const auditLine = `${payload}\n`;
    try {
      await this.appendAudit(this.auditPath, auditLine);
    } catch (error) {
      const audit_error = error instanceof Error ? error.message : "audit_append_failed";
      return { status: "audit_append_failed", consumption_id: id, audit_error };
    }
    return { status: "recorded", consumption_id: id };
  }

  async reconcileAuditFromMarkers(): Promise<{ backfilled: number; skipped: number }> {
    await this.init();
    let backfilled = 0;
    let skipped = 0;
    const existing = await this.listAudit(10_000);
    const loggedReceipts = new Set(existing.map((e) => e.receipt_id));
    let names: string[] = [];
    try {
      names = await readdir(this.consumedDir);
    } catch {
      return { backfilled: 0, skipped: 0 };
    }
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const raw = await readFile(join(this.consumedDir, name), "utf8");
      const entry = JSON.parse(raw) as ConsumptionAuditEntry;
      if (loggedReceipts.has(entry.receipt_id)) {
        skipped += 1;
        continue;
      }
      await this.appendAudit(this.auditPath, `${raw.trim()}\n`);
      loggedReceipts.add(entry.receipt_id);
      backfilled += 1;
    }
    return { backfilled, skipped };
  }

  async hasConsumed(receiptId: string): Promise<boolean> {
    const marker = join(this.consumedDir, `${safeReceiptKey(receiptId)}.json`);
    try {
      await access(marker, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async listAudit(limit = 200): Promise<ConsumptionAuditEntry[]> {
    try {
      const raw = await readFile(this.auditPath, "utf8");
      const lines = raw.trim().split("\n").filter(Boolean);
      return lines.slice(-limit).map((line) => JSON.parse(line) as ConsumptionAuditEntry);
    } catch {
      return [];
    }
  }
}
