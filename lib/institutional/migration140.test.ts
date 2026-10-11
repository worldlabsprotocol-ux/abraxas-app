import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("140_institutional_replay_rpc_hardening migration", () => {
  it("revokes direct insert and validates RPC inputs", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/140_institutional_replay_rpc_hardening.sql"),
      "utf8",
    );
    expect(sql).toContain("revoke insert on table public.institutional_eligibility_consume_nonces from service_role");
    expect(sql).toContain("security definer");
    expect(sql).toContain("length(coalesce(p_partner_id");
  });
});
