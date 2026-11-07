import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const schemaPath = join(root, "lib/persistence/boundary/sovereignSlice/schema.sql");
const migrationsDir = join(root, "database/sovereign/migrations");

const unrelatedToSandboxTrustExecution = [
  "000_sovereign_bootstrap.sql",
  "001_native_account_core.sql",
  "002_native_account_solana_auth.sql",
  "003_native_account_sessions.sql",
  "004_native_account_webauthn_hardening.sql",
];

function sqlWithoutComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

describe("sandbox trust-execution schema contract", () => {
  const schema = readFileSync(schemaPath, "utf8");
  const schemaBody = sqlWithoutComments(schema).toLowerCase();
  const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();

  it("defines the execution tables, uniqueness rules, and consume function in the slice schema", () => {
    expect(schemaBody).toContain("create table if not exists public.wallet_scoped_trust_challenges");
    expect(schemaBody).toContain("constraint wallet_scoped_trust_challenges_nonce_uq unique (nonce)");
    expect(schemaBody).toContain("create or replace function public.abraxas_consume_wallet_scoped_trust_challenge_atomic");
    expect(schemaBody).toContain("create table if not exists public.wallet_scoped_trust_execution_outcomes");
    expect(schemaBody).toMatch(/authorization_ref\s+text\s+primary\s+key/);
    expect(schemaBody).toMatch(/correlation_id\s+text\s+not\s+null\s+unique/);
    expect(schemaBody).toContain("create table if not exists public.sovereign_receipt_status_checkpoints");
    expect(schemaBody).toContain("create table if not exists public.wallet_scoped_trust_authoritative_evidence");
    expect(schemaBody).toContain("authority_source_revision timestamptz");
    expect(schemaBody).toContain("add column if not exists authority_source_revision");
    expect(schemaBody).not.toMatch(/\bdrop\s+table\b/);
    expect(schemaBody).not.toMatch(/\btruncate\b/);
    expect(schemaBody).not.toMatch(/\bdelete\s+from\b/);
  });

  it("keeps account, session, and passkey migrations out of the sandbox execution schema", () => {
    for (const name of unrelatedToSandboxTrustExecution) {
      expect(migrations).toContain(name);
      const body = sqlWithoutComments(readFileSync(join(migrationsDir, name), "utf8")).toLowerCase();
      expect(body).not.toMatch(/\bdrop\s+table\b/);
      expect(body).not.toMatch(/\btruncate\b/);
      expect(body).not.toMatch(/\bdelete\s+from\b/);
    }
    expect(schema).not.toContain("abraxas_account_sessions");
    expect(schema).not.toContain("abraxas_account_passkeys");
    expect(readFileSync(join(root, "lib/persistence/boundary/sovereignSlice/bootstrap.ts"), "utf8"))
      .toContain("sovereignSlice/schema.sql");
  });

  it("does not treat migration 005 as interchangeable with the execution slice", () => {
    const migration = readFileSync(join(migrationsDir, "005_sovereign_developer_sandbox.sql"), "utf8");
    expect(sqlWithoutComments(migration).toLowerCase()).toContain("company text not null");
    expect(schemaBody).not.toContain("company text not null");
    const challenges = readFileSync(join(migrationsDir, "008_wallet_scoped_trust_challenges.sql"), "utf8");
    expect(challenges).toContain("create or replace function public.abraxas_consume_wallet_scoped_trust_challenge_atomic");
    expect(schema).toContain("create or replace function public.abraxas_consume_wallet_scoped_trust_challenge_atomic");
  });
});
