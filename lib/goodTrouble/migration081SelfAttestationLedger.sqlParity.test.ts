// FILE: lib/goodTrouble/migration081SelfAttestationLedger.sqlParity.test.ts
// SQL parity: migration 081 self_attestation_ledger is additive and privacy-minimized.

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// @ts-expect-error pg has no bundled TypeScript declarations in this repo
import { Client } from "pg";

const MIGRATION_081_PATH = resolve(
  process.cwd(),
  "supabase/migrations/081_self_attestation_ledger.sql",
);
const MIGRATION_081 = readFileSync(MIGRATION_081_PATH, "utf8");
const PG_URL = process.env.MIGRATION_081_PG_URL;
const BROWSE_POLICY_ID = "good-trouble-browse-v1";

interface PolicyRow {
  id: string;
  partner_id: string;
  version: number;
  status: string;
  rules_json: Record<string, unknown>;
}

async function loadBrowsePolicyRows(client: Client): Promise<PolicyRow[]> {
  const { rows } = await client.query<PolicyRow>(
    `SELECT id, partner_id, version, status, rules_json
       FROM public.partner_policies
      WHERE id = $1
      ORDER BY version`,
    [BROWSE_POLICY_ID],
  );
  return rows;
}

describe("migration 081 self_attestation_ledger SQL parity", () => {
  it("creates self_attestation_ledger additively with age_band only", () => {
    expect(MIGRATION_081).toContain("create table if not exists public.self_attestation_ledger");
    expect(MIGRATION_081).toContain("age_band");
    expect(MIGRATION_081).not.toMatch(/date_of_birth|birth_year|birth_month|birth_day|dob_hash/i);
  });

  it("enables RLS and restricts to service_role", () => {
    expect(MIGRATION_081).toContain("enable row level security");
    expect(MIGRATION_081).toContain(
      "grant select, insert, update on public.self_attestation_ledger to service_role",
    );
    expect(MIGRATION_081).toContain(
      "revoke all on public.self_attestation_ledger from anon, authenticated",
    );
  });

  it("inserts browse policy without modifying good-trouble-retail-v1", () => {
    expect(MIGRATION_081).toContain("good-trouble-browse-v1");
    expect(MIGRATION_081).toContain("browse_access_only");
    expect(MIGRATION_081).not.toMatch(/'good-trouble-retail-v1'/);
  });

  it("seeds browse policy with composite-key ON CONFLICT DO NOTHING (immutable versions)", () => {
    expect(MIGRATION_081).toMatch(/on conflict\s*\(\s*id\s*,\s*version\s*\)\s*do nothing/i);
    expect(MIGRATION_081).not.toMatch(/on conflict\s*\(\s*id\s*\)/i);
    expect(MIGRATION_081).not.toMatch(/do update/i);
  });

  it("uses idempotent DDL for partial-application safety", () => {
    expect(MIGRATION_081).toContain("create table if not exists public.self_attestation_ledger");
    expect(MIGRATION_081).toMatch(/create index if not exists/gi);
    expect(MIGRATION_081).not.toMatch(/drop table|truncate table/i);
  });

  it("migration parity script applies 055 before 081 and runs 081 twice", () => {
    const script = readFileSync(
      resolve(process.cwd(), "scripts/ci/run-migration-081-sql-parity.sh"),
      "utf8",
    );
    const idx055 = script.indexOf("055_policy_immutable_versions.sql");
    const idx081First = script.indexOf("081_self_attestation_ledger.sql");
    const idx081Second = script.indexOf("081_self_attestation_ledger.sql", idx081First + 1);
    expect(idx055).toBeGreaterThan(-1);
    expect(idx081First).toBeGreaterThan(idx055);
    expect(idx081Second).toBeGreaterThan(idx081First);
  });
});

describe("migration 081 SQL parity (requires MIGRATION_081_PG_URL)", () => {
  if (!PG_URL) {
    it.skip(
      "requires MIGRATION_081_PG_URL (database parity runs via scripts/ci/run-migration-081-sql-parity.sh)",
      () => {},
    );
    return;
  }

  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: PG_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
  });

  it("partner_policies uses composite primary key (id, version)", async () => {
    const { rows } = await client.query<{ column_name: string }>(
      `SELECT a.attname AS column_name
         FROM pg_index i
         JOIN pg_attribute a
           ON a.attrelid = i.indrelid
          AND a.attnum = ANY(i.indkey)
         JOIN pg_class c ON c.oid = i.indrelid
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE i.indisprimary
          AND n.nspname = 'public'
          AND c.relname = 'partner_policies'
        ORDER BY array_position(i.indkey, a.attnum)`,
    );
    expect(rows.map((r) => r.column_name)).toEqual(["id", "version"]);
  });

  it("creates self_attestation_ledger and browse policy after bootstrap", async () => {
    const { rows: tableRows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'self_attestation_ledger'
       ) AS exists`,
    );
    expect(tableRows[0]?.exists).toBe(true);

    const browseRows = await loadBrowsePolicyRows(client);
    expect(browseRows).toHaveLength(1);
    expect(browseRows[0]!.version).toBe(1);
    expect(browseRows[0]!.status).toBe("active");
    expect(browseRows[0]!.rules_json.browse_access_only).toBe(true);
  });

  it("is idempotent when migration 081 is applied a second time", async () => {
    const beforeBrowse = await loadBrowsePolicyRows(client);
    const { rows: beforeIndexes } = await client.query<{ indexname: string }>(
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'self_attestation_ledger'
        ORDER BY indexname`,
    );

    await client.query(MIGRATION_081);

    const afterBrowse = await loadBrowsePolicyRows(client);
    const { rows: afterIndexes } = await client.query<{ indexname: string }>(
      `SELECT indexname
         FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'self_attestation_ledger'
        ORDER BY indexname`,
    );

    expect(afterBrowse).toHaveLength(beforeBrowse.length);
    expect(afterBrowse.map((r) => `${r.version}:${r.status}`)).toEqual(
      beforeBrowse.map((r) => `${r.version}:${r.status}`),
    );
    expect(JSON.stringify(afterBrowse[0]!.rules_json)).toBe(
      JSON.stringify(beforeBrowse[0]!.rules_json),
    );
    expect(afterIndexes.map((r) => r.indexname)).toEqual(
      beforeIndexes.map((r) => r.indexname),
    );
  });

  it("recovers from partial application where ledger DDL succeeded but policy seed failed", async () => {
    const browseRows = await loadBrowsePolicyRows(client);
    expect(browseRows).toHaveLength(1);

    const { rows: tableRows } = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'self_attestation_ledger'
       ) AS exists`,
    );
    expect(tableRows[0]?.exists).toBe(true);

    await client.query(MIGRATION_081);

    const after = await loadBrowsePolicyRows(client);
    expect(after).toHaveLength(1);
    expect(after[0]!.rules_json.allowed_purposes).toEqual(["browse"]);
  });
});
