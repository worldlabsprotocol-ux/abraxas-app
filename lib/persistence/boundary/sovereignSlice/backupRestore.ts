// FILE: lib/persistence/boundary/sovereignSlice/backupRestore.ts
// Logical slice backup/restore for sovereign drill — no Production data.

import { createHash } from "node:crypto";
import type { Pool } from "pg";
import {
  assertStagingRestoreDrillAuthorized,
} from "@/lib/sovereignRuntime/sovereignRestoreSafety";
import { assertDistinctPostgresEndpoints } from "@/lib/sovereignRuntime/pgConnectionIdentity";

export type SovereignSliceBackupPayload = {
  version: 1;
  backup_digest: string;
  partners: unknown[];
  partner_policies: unknown[];
  issuer_signing_keys: unknown[];
  decision_receipts: unknown[];
  partner_metering_events: unknown[];
  decision_receipt_supersessions: unknown[];
  sovereign_claim_status: unknown[];
  sovereign_evidence_sources: unknown[];
  sovereign_receipt_evidence_dependencies: unknown[];
};

const TABLE_ORDER = [
  "partners",
  "issuer_signing_keys",
  "partner_policies",
  "decision_receipts",
  "sovereign_claim_status",
  "sovereign_evidence_sources",
  "sovereign_receipt_evidence_dependencies",
  "decision_receipt_supersessions",
  "partner_metering_events",
] as const;

async function selectAll(pool: Pool, table: string): Promise<unknown[]> {
  const result = await pool.query(`select * from public.${table} order by 1`);
  return result.rows;
}

function digestPayload(payload: Omit<SovereignSliceBackupPayload, "backup_digest">): string {
  const canonical = JSON.stringify(payload);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

export async function exportSovereignSliceBackup(pool: Pool): Promise<SovereignSliceBackupPayload> {
  const body = {
    version: 1 as const,
    partners: await selectAll(pool, "partners"),
    partner_policies: await selectAll(pool, "partner_policies"),
    issuer_signing_keys: await selectAll(pool, "issuer_signing_keys"),
    decision_receipts: await selectAll(pool, "decision_receipts"),
    partner_metering_events: await selectAll(pool, "partner_metering_events"),
    decision_receipt_supersessions: await selectAll(pool, "decision_receipt_supersessions"),
    sovereign_claim_status: await selectAll(pool, "sovereign_claim_status"),
    sovereign_evidence_sources: await selectAll(pool, "sovereign_evidence_sources"),
    sovereign_receipt_evidence_dependencies: await selectAll(
      pool,
      "sovereign_receipt_evidence_dependencies",
    ),
  };
  return { ...body, backup_digest: digestPayload(body) };
}

export async function restoreSovereignSliceBackup(
  pool: Pool,
  payload: SovereignSliceBackupPayload,
): Promise<void> {
  const withoutDigest = {
    version: payload.version,
    partners: payload.partners,
    partner_policies: payload.partner_policies,
    issuer_signing_keys: payload.issuer_signing_keys,
    decision_receipts: payload.decision_receipts,
    partner_metering_events: payload.partner_metering_events,
    decision_receipt_supersessions: payload.decision_receipt_supersessions ?? [],
    sovereign_claim_status: payload.sovereign_claim_status ?? [],
    sovereign_evidence_sources: payload.sovereign_evidence_sources ?? [],
    sovereign_receipt_evidence_dependencies: payload.sovereign_receipt_evidence_dependencies ?? [],
  };
  const expected = digestPayload(withoutDigest);
  if (expected !== payload.backup_digest) {
    throw new Error("sovereign_backup_digest_mismatch");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const table of [...TABLE_ORDER].reverse()) {
      await client.query(`delete from public.${table}`);
    }
    for (const table of TABLE_ORDER) {
      const rows = payload[table as keyof typeof payload] as unknown[];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const columns = Object.keys(rows[0] as Record<string, unknown>);
      const colList = columns.map((c) => `"${c}"`).join(", ");
      for (const row of rows) {
        const values = columns.map((_, i) => `$${i + 1}`);
        const params = columns.map((c) => (row as Record<string, unknown>)[c]);
        await client.query(
          `insert into public.${table} (${colList}) values (${values.join(", ")})`,
          params,
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function evaluateRestoreDrillEnv(
  env: Record<string, string | undefined>,
): { ok: true } | { ok: false; code: string } {
  const authErrors = assertStagingRestoreDrillAuthorized(env);
  if (authErrors.length) {
    return { ok: false, code: authErrors[0]?.code ?? "restore_unauthorized" };
  }
  const primary = env.ABRAXAS_DATABASE_URL?.trim() ?? env.ABRAXAS_SOVEREIGN_STAGING_PG_URL?.trim();
  const restore = env.ABRAXAS_SOVEREIGN_RESTORE_PG_URL?.trim();
  if (!primary || !restore) {
    return { ok: false, code: "missing_primary_or_restore_url" };
  }
  const endpointErr = assertDistinctPostgresEndpoints(primary, restore);
  if (endpointErr) return { ok: false, code: endpointErr.code };
  return { ok: true };
}
