import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

describe("101_chain_attestation_nonces", () => {
  const sql = readFileSync(resolve(MIGRATIONS_DIR, "101_chain_attestation_nonces.sql"), "utf8");

  it("is the next numbered migration after 100", () => {
    expect(existsSync(resolve(MIGRATIONS_DIR, "100_receipt_lifecycle_outbox_events.sql"))).toBe(true);
    const collisions = readdirSync(MIGRATIONS_DIR).filter((name) => name.startsWith("101_"));
    expect(collisions).toEqual(["101_chain_attestation_nonces.sql"]);
  });

  it("keeps chain attestation replay durable and separate from venue nonces", () => {
    expect(sql).toContain("create table if not exists public.chain_attestation_nonces");
    expect(sql).toContain("chain_attestation_consume_nonce");
    expect(sql).toContain("partner_id, network_id, nonce_hash");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on table public.chain_attestation_nonces from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.chain_attestation_consume_nonce");
    expect(sql).not.toContain("partner_venue_action_nonces");
    expect(sql).not.toMatch(/in[- ]memory|demo fallback/i);
  });
});
