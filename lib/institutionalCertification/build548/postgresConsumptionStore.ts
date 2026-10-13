// FILE: lib/institutionalCertification/build548/postgresConsumptionStore.ts

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";
import type {
  ConsumptionAttemptResult,
  ConsumptionAuditEntry,
  ReceiptConsumptionStore,
} from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import {
  buildCanonicalReplayKey,
  consumptionIdForAttempt,
  type ReplayConsumptionScope,
} from "./replayKey";

export function resolveBuild548DatabaseUrl(): string | null {
  return (
    process.env.BUILD_548_PG_URL?.trim()
    || process.env.INSTITUTIONAL_REPLAY_TEST_DATABASE_URL?.trim()
    || null
  );
}

export async function applyBuild548Schema(pool: pg.Pool): Promise<void> {
  const sqlPath = join(
    process.cwd(),
    "lib/institutionalCertification/build548/schema/receipt_consumption.sql",
  );
  const ddl = await readFile(sqlPath, "utf8");
  await pool.query(ddl);
}

export type PostgresConsumptionStoreOptions = {
  instanceId?: string;
  /** Test hook — throw after consumption insert to simulate crash before audit commit. */
  afterConsumptionInsert?: () => void;
};

export class PostgresReceiptConsumptionStore implements ReceiptConsumptionStore {
  readonly kind = "postgres" as const;
  private readonly instanceId: string;
  private readonly afterConsumptionInsert?: () => void;

  constructor(
    private readonly pool: pg.Pool,
    instanceId?: string,
    options?: PostgresConsumptionStoreOptions,
  ) {
    this.instanceId = instanceId ?? options?.instanceId ?? `pg-${process.pid}`;
    this.afterConsumptionInsert = options?.afterConsumptionInsert;
  }

  private scopeFromInput(input: {
    receiptId: string;
    partnerId: string;
    policyId: string;
  }): ReplayConsumptionScope {
    return {
      partnerId: input.partnerId,
      policyId: input.policyId,
      receiptId: input.receiptId,
    };
  }

  async tryRecordConsumption(input: {
    receiptId: string;
    requestId: string;
    partnerId: string;
    policyId: string;
    at: string;
  }): Promise<ConsumptionAttemptResult> {
    const scope = this.scopeFromInput(input);
    const replayKey = buildCanonicalReplayKey(scope);
    const consumptionId = consumptionIdForAttempt(scope, input.requestId);
    let client: pg.PoolClient;
    try {
      client = await this.pool.connect();
    } catch (error) {
      if (isPostgresUnavailable(error)) {
        return {
          status: "persistence_unavailable",
          error: error instanceof Error ? error.message : "persistence_unavailable",
        };
      }
      throw error;
    }
    try {
      await client.query("BEGIN");
      const insertConsumption = await client.query<{ consumption_id: string }>(
        `INSERT INTO build548_consumption.receipt_consumption (
          replay_key, consumption_id, receipt_id, partner_id, policy_id, request_id, recorded_at, instance_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (replay_key) DO NOTHING
        RETURNING consumption_id`,
        [
          replayKey,
          consumptionId,
          input.receiptId,
          input.partnerId,
          input.policyId,
          input.requestId,
          input.at,
          this.instanceId,
        ],
      );
      if (insertConsumption.rowCount === 0) {
        await client.query("ROLLBACK");
        return { status: "replay", consumption_id: null };
      }

      this.afterConsumptionInsert?.();

      await client.query(
        `INSERT INTO build548_consumption.receipt_consumption_audit (
          replay_key, consumption_id, receipt_id, partner_id, policy_id, request_id, recorded_at, instance_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          replayKey,
          consumptionId,
          input.receiptId,
          input.partnerId,
          input.policyId,
          input.requestId,
          input.at,
          this.instanceId,
        ],
      );
      await client.query("COMMIT");
      return { status: "recorded", consumption_id: consumptionId };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* pool may be broken */
      }
      if (isPostgresUnavailable(error)) {
        return {
          status: "persistence_unavailable",
          error: error instanceof Error ? error.message : "persistence_unavailable",
        };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async hasConsumed(scope: ReplayConsumptionScope): Promise<boolean> {
    const replayKey = buildCanonicalReplayKey(scope);
    try {
      const result = await this.pool.query(
        `SELECT 1 FROM build548_consumption.receipt_consumption WHERE replay_key = $1 LIMIT 1`,
        [replayKey],
      );
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      if (isPostgresUnavailable(error)) return false;
      throw error;
    }
  }

  async hasConsumedReceipt(receiptId: string, partnerId: string, policyId: string): Promise<boolean> {
    return this.hasConsumed({ partnerId, policyId, receiptId });
  }

  async listAudit(limit = 200): Promise<ConsumptionAuditEntry[]> {
    const result = await this.pool.query<{
      consumption_id: string;
      receipt_id: string;
      request_id: string;
      partner_id: string;
      recorded_at: Date;
      instance_id: string;
    }>(
      `SELECT consumption_id, receipt_id, request_id, partner_id, recorded_at, instance_id
       FROM build548_consumption.receipt_consumption_audit
       ORDER BY audit_id DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      consumption_id: row.consumption_id,
      receipt_id: row.receipt_id,
      request_id: row.request_id,
      partner_id: row.partner_id,
      recorded_at: row.recorded_at.toISOString(),
      instance_id: row.instance_id,
    }));
  }

  async truncateForTests(): Promise<void> {
    await this.pool.query("TRUNCATE build548_consumption.receipt_consumption_audit CASCADE");
    await this.pool.query("TRUNCATE build548_consumption.receipt_consumption CASCADE");
  }
}

function isPostgresUnavailable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as NodeJS.ErrnoException & { code?: string }).code;
  return (
    code === "ECONNREFUSED"
    || code === "ENOTFOUND"
    || code === "ETIMEDOUT"
    || code === "57P01"
    || code === "53300"
    || error.message.includes("Connection terminated")
  );
}
