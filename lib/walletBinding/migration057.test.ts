import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/siteUrl";

const ROOT = join(__dirname, "..", "..");
const MIGRATION_PATH = join(
  ROOT,
  "supabase/migrations/057_wallet_binding_challenges_connect.sql",
);
const STALE_HOST = "abraxas-app.vercel.app";
const CANONICAL_HOST = new URL(SITE_URL).host;

describe("migration 057_wallet_binding_challenges_connect.sql", () => {
  const sql = readFileSync(MIGRATION_PATH, "utf8");

  it("does not introduce stale abraxas-app.vercel.app defaults", () => {
    expect(sql).not.toContain(STALE_HOST);
  });

  it("backfills legacy domain with canonical production host", () => {
    expect(sql).toContain(CANONICAL_HOST);
    expect(sql).toContain(`canonical_domain constant text := '${CANONICAL_HOST}'`);
  });

  it("guards mixed id + challenge_id schema before structural changes", () => {
    expect(sql).toMatch(/has_id and has_challenge_id/i);
    expect(sql).toMatch(/both id and challenge_id/i);
    expect(sql).toMatch(/raise exception/i);
  });

  it("fails closed when backfill leaves null chain or domain", () => {
    expect(sql).toMatch(/null_chain_count/i);
    expect(sql).toMatch(/null_domain_count/i);
    expect(sql).toMatch(/backfill incomplete/i);
    expect(sql).not.toMatch(/when others/i);
    expect(sql).not.toMatch(/raise notice/i);
  });

  it("preserves existing rows via update coalesce only", () => {
    expect(sql).toMatch(/update public\.wallet_binding_challenges/i);
    expect(sql).toMatch(/coalesce\(chain/i);
    expect(sql).toMatch(/coalesce\(domain/i);
    expect(sql).not.toMatch(/delete from public\.wallet_binding_challenges/i);
    expect(sql).not.toMatch(/truncate public\.wallet_binding_challenges/i);
  });
});
