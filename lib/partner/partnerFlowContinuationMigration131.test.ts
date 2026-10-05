import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("131_partner_flow_continuation_opaque_peek migration contract", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/131_partner_flow_continuation_opaque_peek.sql"),
    "utf8",
  );

  it("exists on disk", () => {
    expect(existsSync(resolve(process.cwd(), "supabase/migrations/131_partner_flow_continuation_opaque_peek.sql"))).toBe(true);
  });

  it("adds service-role RPC peek by opaque_verify_request only", () => {
    expect(sql).toContain("partner_flow_continuation_peek_by_opaque");
    expect(sql).toContain("WHERE opaque_verify_request = btrim(p_opaque)");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.partner_flow_continuation_peek_by_opaque(text) TO service_role");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
