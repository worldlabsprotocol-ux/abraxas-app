// FILE: lib/persistence/boundary/trustDistribution/statusVersionCheckpoint.ts
// Monotonic status_version for signed status statements — sovereign PG or Demo operational Postgres.

import { createHash } from "crypto";
import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { querySovereignStagingPg } from "../sovereignStagingPg";
import pg from "pg";
import type { Pool } from "pg";
import { assertNotProductionSupabaseProject } from "../isolationGuard";

const DEMO_OPERATIONAL_PROJECT_REF = "ocntwbxarpjeixdnzide";

let operationalPool: Pool | null = null;

function resolveOperationalDemoDatabaseUrl(
  env: Record<string, string | undefined>,
): string | null {
  const url =
    env.ABRAXAS_DATABASE_URL?.trim()
    ?? env.SUPABASE_DB_URL?.trim()
    ?? env.DATABASE_URL?.trim()
    ?? null;
  if (!url) return null;
  if (assertNotProductionSupabaseProject(url)) return null;
  const ref = supabaseProjectRefFromPostgresUrl(url);
  if (ref !== DEMO_OPERATIONAL_PROJECT_REF) return null;
  return url;
}

function getOperationalDemoPgPool(env: Record<string, string | undefined>): Pool | null {
  const url = resolveOperationalDemoDatabaseUrl(env);
  if (!url) return null;
  if (!operationalPool) {
    operationalPool = new pg.Pool({
      connectionString: url,
      max: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return operationalPool;
}

async function bumpCheckpointOnPool(
  pool: Pool,
  receiptId: string,
  table: "sovereign_receipt_status_checkpoints" | "portable_export_status_checkpoints",
): Promise<number | { error: string }> {
  try {
    const result = await pool.query<{ status_version: number }>(
      `insert into public.${table} (receipt_id, status_version)
       values ($1, 1)
       on conflict (receipt_id) do update
         set status_version = public.${table}.status_version + 1
       returning status_version`,
      [receiptId],
    );
    return result.rows[0]?.status_version ?? 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("does not exist")) {
      return { error: "status_checkpoint_table_missing" };
    }
    return { error: message };
  }
}

/** Deterministic version when checkpoint store unavailable — changes when evaluation basis changes. */
export function deriveOperationalStatusVersion(input: {
  receiptId: string;
  checkedAt: string;
  lifecycleStatus: string;
  invalidationReasons: string[];
}): number {
  const basis = [
    input.receiptId,
    input.checkedAt,
    input.lifecycleStatus,
    ...input.invalidationReasons.slice().sort(),
  ].join("|");
  const hex = createHash("sha256").update(basis, "utf8").digest("hex").slice(0, 12);
  return Math.max(1, Number.parseInt(hex, 16));
}

export async function nextSignedStatusVersion(input: {
  receiptId: string;
  env?: Record<string, string | undefined>;
  operationalFallback?: {
    checkedAt: string;
    lifecycleStatus: string;
    invalidationReasons: string[];
  };
}): Promise<number | { error: string; derived?: boolean }> {
  const env = input.env ?? process.env;

  const sovereign = await querySovereignStagingPg<{ status_version: number }>(
    `insert into public.sovereign_receipt_status_checkpoints (receipt_id, status_version)
     values ($1, 1)
     on conflict (receipt_id) do update
       set status_version = public.sovereign_receipt_status_checkpoints.status_version + 1
     returning status_version`,
    [input.receiptId],
    env,
  );
  if (!("error" in sovereign)) {
    return sovereign.rows[0]?.status_version ?? 1;
  }

  const demoPool = getOperationalDemoPgPool(env);
  if (demoPool) {
    let bumped = await bumpCheckpointOnPool(
      demoPool,
      input.receiptId,
      "portable_export_status_checkpoints",
    );
    if (typeof bumped !== "number" && bumped.error === "status_checkpoint_table_missing") {
      bumped = await bumpCheckpointOnPool(
        demoPool,
        input.receiptId,
        "sovereign_receipt_status_checkpoints",
      );
    }
    if (typeof bumped === "number") return bumped;
    if (bumped.error !== "status_checkpoint_table_missing") {
      return { error: bumped.error };
    }
  }

  if (input.operationalFallback) {
    return deriveOperationalStatusVersion({
      receiptId: input.receiptId,
      checkedAt: input.operationalFallback.checkedAt,
      lifecycleStatus: input.operationalFallback.lifecycleStatus,
      invalidationReasons: input.operationalFallback.invalidationReasons,
    });
  }

  return { error: sovereign.error };
}

export function resetOperationalDemoPgPoolForTests(): void {
  if (operationalPool) void operationalPool.end().catch(() => undefined);
  operationalPool = null;
}
