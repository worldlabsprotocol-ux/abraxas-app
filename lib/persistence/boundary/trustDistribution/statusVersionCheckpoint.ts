// FILE: lib/persistence/boundary/trustDistribution/statusVersionCheckpoint.ts
// Monotonic status_version for signed status statements — sovereign PG or Demo operational Postgres.

import { supabaseProjectRefFromPostgresUrl } from "@/lib/supabase/projectRefs";
import { querySovereignStagingPg } from "../sovereignStagingPg";
import pg from "pg";
import type { Pool } from "pg";
import { assertNotProductionSupabaseProject } from "../isolationGuard";
import { persistenceUsesDirectPostgres } from "@/lib/persistence/env";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";

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

export async function nextSignedStatusVersion(input: {
  receiptId: string;
  env?: Record<string, string | undefined>;
}): Promise<number | { error: string }> {
  const env = input.env ?? process.env;

  if (persistenceUsesDirectPostgres(env)) {
    try {
      const { rows } = await queryAbraxasPg<{ status_version: number }>(
        `insert into public.portable_export_status_checkpoints (receipt_id, status_version)
         values ($1, 1) on conflict (receipt_id) do update
         set status_version = public.portable_export_status_checkpoints.status_version + 1
         returning status_version`, [input.receiptId], env,
      );
      const version = rows[0]?.status_version;
      return Number.isInteger(version) && version > 0
        ? version : { error: "status_checkpoint_unavailable" };
    } catch {
      return { error: "status_checkpoint_unavailable" };
    }
  }

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

  return { error: sovereign.error ?? "status_checkpoint_unavailable" };
}

export function resetOperationalDemoPgPoolForTests(): void {
  if (operationalPool) void operationalPool.end().catch(() => undefined);
  operationalPool = null;
}
