// FILE: lib/institutionalCertification/build547/receiptConsumptionStore.ts
// Receipt consumption adapters — memory/filesystem (Build #547) + postgres (Build #548).

import { mkdir, appendFile, writeFile, readFile, access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import {
  buildCanonicalReplayKey,
  consumptionIdForAttempt,
  type ReplayConsumptionScope,
} from "@/lib/institutionalCertification/build548/replayKey";

export type ReceiptConsumptionStoreKind = "memory" | "filesystem" | "postgres";

export type ConsumptionAttemptResult =
  | { status: "recorded"; consumption_id: string }
  | {
      status: "audit_append_failed";
      consumption_id: string;
      audit_error: string;
    }
  | { status: "replay"; consumption_id: string | null }
  | { status: "persistence_unavailable"; error: string };

export interface ConsumptionAuditEntry {
  consumption_id: string;
  receipt_id: string;
  request_id: string;
  partner_id: string;
  policy_id?: string;
  recorded_at: string;
  instance_id: string;
}

export interface ReceiptConsumptionStore {
  readonly kind: ReceiptConsumptionStoreKind;
  tryRecordConsumption(input: {
    receiptId: string;
    requestId: string;
    partnerId: string;
    policyId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult>;
  hasConsumed(scope: ReplayConsumptionScope): Promise<boolean>;
  listAudit(limit?: number): Promise<ConsumptionAuditEntry[]>;
  /** Filesystem certification store only — backfill audit.jsonl from wx markers. */
  reconcileAuditFromMarkers?(): Promise<{ backfilled: number; skipped: number }>;
}

function markerFileName(scope: ReplayConsumptionScope): string {
  return `${buildCanonicalReplayKey(scope)}.json`;
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
    policyId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult> {
    const scope: ReplayConsumptionScope = {
      partnerId: input.partnerId,
      policyId: input.policyId,
      receiptId: input.receiptId,
    };
    const replayKey = buildCanonicalReplayKey(scope);
    if (this.consumed.has(replayKey)) {
      return { status: "replay", consumption_id: null };
    }
    this.consumed.add(replayKey);
    const id = consumptionIdForAttempt(scope, input.requestId);
    this.audit.push({
      consumption_id: id,
      receipt_id: input.receiptId,
      request_id: input.requestId,
      partner_id: input.partnerId,
      policy_id: input.policyId,
      recorded_at: input.at,
      instance_id: "memory",
    });
    return { status: "recorded", consumption_id: id };
  }

  async hasConsumed(scope: ReplayConsumptionScope): Promise<boolean> {
    return this.consumed.has(buildCanonicalReplayKey(scope));
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
    policyId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult> {
    await this.init();
    const scope: ReplayConsumptionScope = {
      partnerId: input.partnerId,
      policyId: input.policyId,
      receiptId: input.receiptId,
    };
    const marker = join(this.consumedDir, markerFileName(scope));
    const id = consumptionIdForAttempt(scope, input.requestId);
    const payload = JSON.stringify({
      consumption_id: id,
      receipt_id: input.receiptId,
      request_id: input.requestId,
      partner_id: input.partnerId,
      policy_id: input.policyId,
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
    const loggedKeys = new Set(
      existing.map((e) =>
        buildCanonicalReplayKey({
          partnerId: e.partner_id,
          policyId: e.policy_id ?? "",
          receiptId: e.receipt_id,
        }),
      ),
    );
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
      const key = buildCanonicalReplayKey({
        partnerId: entry.partner_id,
        policyId: entry.policy_id ?? "",
        receiptId: entry.receipt_id,
      });
      if (loggedKeys.has(key)) {
        skipped += 1;
        continue;
      }
      await this.appendAudit(this.auditPath, `${raw.trim()}\n`);
      loggedKeys.add(key);
      backfilled += 1;
    }
    return { backfilled, skipped };
  }

  async hasConsumed(scope: ReplayConsumptionScope): Promise<boolean> {
    const marker = join(this.consumedDir, markerFileName(scope));
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
