import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import { resetAbraxasPgPoolForTests } from "@/lib/persistence/pgPool";

const PG_URL = process.env.ABRAXAS_SOVEREIGN_PG_URL?.trim()
  || process.env.MIGRATION_136_PG_URL?.trim()
  || process.env.ABRAXAS_DATABASE_URL?.trim()
  || undefined;

const MIGRATION_140 = "140_passport_reusable_credential_state.sql";
const CLEAN_DB = `abx_m140_clean_${Date.now()}`;
const UPGRADE_DB = `abx_m140_upgrade_${Date.now()}`;

function psql(dbUrl: string, sql: string): void {
  execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
}

function adminUrl(dbName: string): string {
  const base = PG_URL!.replace(/\/[^/]+$/, `/${dbName}`);
  return base;
}

function createDb(name: string): string {
  const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
  execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `create database "${name}"`]);
  return adminUrl(name);
}

function dropDb(name: string): void {
  const admin = PG_URL!.replace(/\/[^/]+$/, "/postgres");
  execFileSync("psql", [admin, "-v", "ON_ERROR_STOP=1", "-c", `drop database if exists "${name}" with (force)`]);
}

describe("Build #567 migration 140", () => {
  if (!PG_URL) {
    it.skip("requires disposable PostgreSQL", () => {});
    return;
  }

  let cleanUrl: string;
  let upgradeUrl: string;

  beforeAll(() => {
    cleanUrl = createDb(CLEAN_DB);
    upgradeUrl = createDb(UPGRADE_DB);
  });

  afterAll(async () => {
    delete process.env.ABRAXAS_DATABASE_URL;
    delete process.env.ABRAXAS_PERSISTENCE_BACKEND;
    resetAbraxasPgPoolForTests();
    await new Promise((r) => setTimeout(r, 50));
    dropDb(CLEAN_DB);
    dropDb(UPGRADE_DB);
  });

  it("applies cleanly on an empty sovereign database", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations", MIGRATION_140), "utf8");
    psql(cleanUrl, sql);
    psql(
      cleanUrl,
      `select column_name from information_schema.columns
       where table_name = 'passport_reusable_credentials' and column_name = 'signed_credential_text';`,
    );
    expect(() =>
      psql(
        cleanUrl,
        `insert into public.passport_reusable_credentials (
          credential_id, holder_subject_id, linked_credential_jti, signed_credential_text,
          issuer_id, assurance_level, idv_method, revocation_status_id, issued_at, expires_at
        ) values ('pc_test','subj','jti','{}','issuer:abraxas','L2','manual_review','rev', now(), now() + interval '1 day');`,
      ),
    ).not.toThrow();
  });

  it("upgrades legacy signed_credential_json without data loss", async () => {
    psql(
      upgradeUrl,
      `create table public.passport_reusable_credentials (
        credential_id text primary key,
        holder_subject_id text not null,
        linked_credential_jti text not null,
        signed_credential_json jsonb not null,
        issuer_id text not null,
        assurance_level text not null,
        idv_method text not null,
        revocation_status_id text not null,
        issued_at timestamptz not null,
        expires_at timestamptz not null,
        sandbox_labeled boolean not null default false,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );`,
    );
    const payload = JSON.stringify({ media_type: "application/vnd.abraxas.passport-reusable-credential+json", payload: { credential_id: "pc_legacy" }, payload_hash: "abc", signature: "sig" });
    psql(
      upgradeUrl,
      `insert into public.passport_reusable_credentials (
        credential_id, holder_subject_id, linked_credential_jti, signed_credential_json,
        issuer_id, assurance_level, idv_method, revocation_status_id, issued_at, expires_at
      ) values ('pc_legacy','subj','jti', '${payload.replace(/'/g, "''")}'::jsonb,
        'issuer:abraxas','L2','manual_review','rev', now(), now() + interval '1 day');`,
    );

    const sql = readFileSync(join(process.cwd(), "supabase/migrations", MIGRATION_140), "utf8");
    psql(upgradeUrl, sql);

    process.env.ABRAXAS_DATABASE_URL = upgradeUrl;
    process.env.ABRAXAS_PERSISTENCE_BACKEND = "postgres_direct";
    resetAbraxasPgPoolForTests();

    const { rows: legacyRows } = await queryAbraxasPg<{ signed_credential_text: string }>(
      `select signed_credential_text from public.passport_reusable_credentials where credential_id = 'pc_legacy'`,
    );
    expect(legacyRows[0]?.signed_credential_text).toContain("pc_legacy");
    const { rows: colRows } = await queryAbraxasPg<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_name = 'passport_reusable_credentials' and column_name = 'signed_credential_json'`,
    );
    expect(colRows.length).toBe(0);
    resetAbraxasPgPoolForTests();
  });
});
