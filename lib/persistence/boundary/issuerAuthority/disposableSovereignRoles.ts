// Disposable Postgres role provisioning for sovereign proofs. Not for Production.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "pg";

export type DisposableSovereignRoleUrls = {
  adminUrl: string;
  runtimeUrl: string;
  operatorUrl: string;
};

async function adminQueryWithRetry(admin: Pool, sql: string, retries = 8): Promise<void> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await admin.query(sql);
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("concurrently updated") && attempt + 1 < retries) {
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function applyGovernanceTrustPinMigration(admin: Pool): Promise<void> {
  const sql = readFileSync(
    join(process.cwd(), "database/sovereign/migrations/012_issuer_governance_trust_pin.sql"),
    "utf8",
  );
  await admin.query(sql);
}

export async function provisionDisposableSovereignRoleUrls(input: {
  databaseName: string;
  adminPool: Pool;
  runtimePassword?: string;
  operatorPassword?: string;
}): Promise<DisposableSovereignRoleUrls> {
  const runtimePassword = input.runtimePassword ?? "abraxas-runtime-test";
  const operatorPassword = input.operatorPassword ?? "abraxas-governance-operator-test";
  const host = "127.0.0.1";
  const port = "5432";
  const adminUrl = `postgresql://postgres:postgres@${host}:${port}/${input.databaseName}`;

  await input.adminPool.query(
    `do $$ begin create role abraxas_runtime login password '${runtimePassword}' nosuperuser nocreatedb nocreaterole noinherit; exception when duplicate_object then null; end $$`,
  );
  await input.adminPool.query(
    `do $$ begin create role abraxas_governance_operator login password '${operatorPassword}' nosuperuser nocreatedb nocreaterole noinherit; exception when duplicate_object then null; end $$`,
  );
  await adminQueryWithRetry(
    input.adminPool,
    `alter role abraxas_runtime with password '${runtimePassword}'`,
  );
  await adminQueryWithRetry(
    input.adminPool,
    `alter role abraxas_governance_operator with password '${operatorPassword}'`,
  );

  await applyGovernanceTrustPinMigration(input.adminPool);

  await input.adminPool.query(`grant usage on schema public to abraxas_runtime, abraxas_governance_operator`);
  await input.adminPool.query(`grant select, insert, update, delete on all tables in schema public to abraxas_runtime`);
  await input.adminPool.query(`grant usage, select on all sequences in schema public to abraxas_runtime`);
  await input.adminPool.query(`revoke insert, update, delete on table public.issuer_governance_trust_pin from abraxas_runtime`);
  await input.adminPool.query(`revoke insert, update, delete on table public.issuer_governance_trust_events from abraxas_runtime`);
  await input.adminPool.query(`revoke abraxas_governance_operator from abraxas_runtime`);
  await input.adminPool.query(`revoke abraxas_runtime from abraxas_governance_operator`);

  return {
    adminUrl,
    runtimeUrl: `postgresql://abraxas_runtime:${encodeURIComponent(runtimePassword)}@${host}:${port}/${input.databaseName}`,
    operatorUrl: `postgresql://abraxas_governance_operator:${encodeURIComponent(operatorPassword)}@${host}:${port}/${input.databaseName}`,
  };
}
