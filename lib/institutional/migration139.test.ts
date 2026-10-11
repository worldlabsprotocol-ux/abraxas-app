import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("139_institutional_eligibility_consume_nonces migration", () => {
  it("defines atomic scoped consume RPC with unique constraint", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/139_institutional_eligibility_consume_nonces.sql"),
      "utf8",
    );
    expect(sql).toContain("institutional_eligibility_consume_nonces");
    expect(sql).toContain("institutional_eligibility_consume_nonce");
    expect(sql).toContain("unique_violation");
    expect(sql).toContain("nonce_hash");
    expect(sql).toContain("Do not auto-apply from Vercel");
  });
});
