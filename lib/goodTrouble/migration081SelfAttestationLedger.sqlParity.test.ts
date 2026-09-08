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

/** Authoritative migrations that must precede 050_identity_review_workflow.sql. */
export const MIGRATION_081_PREREQUISITES_BEFORE_050 = [
  "021_passport_documents_manual_idv.sql",
  "037_biometric_assessments.sql",
] as const;

/** Repository-order chain applied by scripts/ci/run-migration-081-sql-parity.sh. */
export const MIGRATION_081_PARITY_CHAIN = [
  "scripts/ci/migration-076-sequential-bootstrap.sql",
  ...MIGRATION_081_PREREQUISITES_BEFORE_050.map(
    (file) => `supabase/migrations/${file}`,
  ),
  "supabase/migrations/049_good_trouble_cannabis_pilot.sql",
  "supabase/migrations/050_good_trouble_biometric_thresholds.sql",
  "supabase/migrations/050_identity_review_workflow.sql",
  "supabase/migrations/078_age_evidence_records.sql",
  "supabase/migrations/079_identity_review_sessions.sql",
  "supabase/migrations/080_age_assurance_sessions.sql",
  "supabase/migrations/055_policy_immutable_versions.sql",
  "supabase/migrations/081_self_attestation_ledger.sql",
] as const;

function readParityHarnessMainScript(): string {
  return readFileSync(
    resolve(process.cwd(), "scripts/ci/run-migration-081-sql-parity.sh"),
    "utf8",
  );
}

function readParityHarnessPrerequisiteScript(): string {
  return readFileSync(
    resolve(process.cwd(), "scripts/ci/apply-identity-review-prerequisite-migrations.sh"),
    "utf8",
  );
}

function migrationApplyIndex(script: string, filename: string): number {
  const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`-f\\s+["']?[^"'\\n]*${escaped}`, "i"),
    new RegExp(`${escaped}\\s*\\|\\s*psql`, "i"),
  ];
  for (const pattern of patterns) {
    const match = script.match(pattern);
    if (match?.index !== undefined) return match.index;
  }
  return -1;
}

function assertMigrationChainOrder(): void {
  const main = readParityHarnessMainScript();
  const prerequisites = readParityHarnessPrerequisiteScript();

  const orderedSteps: Array<{ label: string; index: number; script: "main" | "prerequisites" }> = [
    {
      label: "scripts/ci/migration-076-sequential-bootstrap.sql",
      index: migrationApplyIndex(main, "migration-076-sequential-bootstrap.sql"),
      script: "main",
    },
    {
      label: "021_passport_documents_manual_idv.sql",
      index: migrationApplyIndex(prerequisites, "021_passport_documents_manual_idv.sql"),
      script: "prerequisites",
    },
    {
      label: "037_biometric_assessments.sql",
      index: migrationApplyIndex(prerequisites, "037_biometric_assessments.sql"),
      script: "prerequisites",
    },
    {
      label: "apply-identity-review-prerequisite-migrations.sh",
      index: main.indexOf("apply-identity-review-prerequisite-migrations.sh"),
      script: "main",
    },
    {
      label: "049_good_trouble_cannabis_pilot.sql",
      index: migrationApplyIndex(main, "049_good_trouble_cannabis_pilot.sql"),
      script: "main",
    },
    {
      label: "050_good_trouble_biometric_thresholds.sql",
      index: migrationApplyIndex(main, "050_good_trouble_biometric_thresholds.sql"),
      script: "main",
    },
    {
      label: "050_identity_review_workflow.sql",
      index: migrationApplyIndex(main, "050_identity_review_workflow.sql"),
      script: "main",
    },
    {
      label: "078_age_evidence_records.sql",
      index: migrationApplyIndex(main, "078_age_evidence_records.sql"),
      script: "main",
    },
    {
      label: "079_identity_review_sessions.sql",
      index: migrationApplyIndex(main, "079_identity_review_sessions.sql"),
      script: "main",
    },
    {
      label: "080_age_assurance_sessions.sql",
      index: migrationApplyIndex(main, "080_age_assurance_sessions.sql"),
      script: "main",
    },
    {
      label: "055_policy_immutable_versions.sql",
      index: migrationApplyIndex(main, "055_policy_immutable_versions.sql"),
      script: "main",
    },
    {
      label: "081_self_attestation_ledger.sql (first)",
      index: migrationApplyIndex(main, "081_self_attestation_ledger.sql"),
      script: "main",
    },
  ];

  for (const step of orderedSteps) {
    expect(step.index, `migration-081 parity harness must apply ${step.label}`).toBeGreaterThan(-1);
  }

  expect(
    orderedSteps.find((step) => step.label === "apply-identity-review-prerequisite-migrations.sh")!.index,
  ).toBeLessThan(
    orderedSteps.find((step) => step.label === "049_good_trouble_cannabis_pilot.sql")!.index,
  );

  for (let i = 0; i < orderedSteps.length - 1; i += 1) {
    const current = orderedSteps[i]!;
    const next = orderedSteps[i + 1]!;
    if (current.script === next.script) {
      expect(
        next.index,
        `${next.label} must run after ${current.label} in migration-081 parity harness`,
      ).toBeGreaterThan(current.index);
    }
  }
}

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

  it("migration parity script applies prerequisite chain in repository order", () => {
    const main = readParityHarnessMainScript();
    expect(main).toContain("apply-identity-review-prerequisite-migrations.sh");
    assertMigrationChainOrder();
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

  it("fails clearly when passport_documents prerequisite migration is omitted", () => {
    const main = readFileSync(
      resolve(process.cwd(), "scripts/ci/run-migration-081-sql-parity.sh"),
      "utf8",
    );
    const prerequisites = readFileSync(
      resolve(process.cwd(), "scripts/ci/apply-identity-review-prerequisite-migrations.sh"),
      "utf8",
    );
    const idx050 = main.indexOf("050_identity_review_workflow.sql");
    const idxPrereq = main.indexOf("apply-identity-review-prerequisite-migrations.sh");
    const idx021 = prerequisites.indexOf("021_passport_documents_manual_idv.sql");
    expect(idx050).toBeGreaterThan(-1);
    expect(idxPrereq).toBeGreaterThan(-1);
    expect(idxPrereq).toBeLessThan(idx050);
    expect(
      idx021,
      "apply-identity-review-prerequisite-migrations.sh must apply 021_passport_documents_manual_idv.sql",
    ).toBeGreaterThan(-1);
    expect(prerequisites).toContain("parity prerequisite missing: public.passport_documents");
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

    const { rows: browseCount } = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
         FROM public.partner_policies
        WHERE id = $1`,
      [BROWSE_POLICY_ID],
    );
    expect(Number(browseCount[0]?.count ?? 0)).toBe(1);
  });

  it("enables RLS on self_attestation_ledger and stores age_band only (no DOB columns)", async () => {
    const { rows: rlsRows } = await client.query<{ relrowsecurity: boolean }>(
      `SELECT c.relrowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'self_attestation_ledger'`,
    );
    expect(rlsRows[0]?.relrowsecurity).toBe(true);

    const { rows: columns } = await client.query<{ column_name: string }>(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'self_attestation_ledger'
        ORDER BY ordinal_position`,
    );
    const columnNames = columns.map((row) => row.column_name);
    expect(columnNames).toContain("age_band");
    for (const forbidden of [
      "date_of_birth",
      "birth_year",
      "birth_month",
      "birth_day",
      "dob_hash",
    ]) {
      expect(columnNames).not.toContain(forbidden);
    }
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
