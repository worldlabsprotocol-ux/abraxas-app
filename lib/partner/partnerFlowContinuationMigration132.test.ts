import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("132_partner_flow_continuation_ensure_by_opaque migration contract", () => {
  const path = resolve(
    process.cwd(),
    "supabase/migrations/132_partner_flow_continuation_ensure_by_opaque.sql",
  );
  const sql = readFileSync(path, "utf8");

  it("exists on disk", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("uses separate INSERT and SELECT commands for READ COMMITTED conflict-loser visibility", () => {
    expect(sql).toContain("ensure_partner_flow_continuation_by_opaque");
    expect(sql).toContain("INSERT INTO public.partner_flow_continuations");
    expect(sql).toContain("ON CONFLICT (opaque_verify_request) WHERE opaque_verify_request IS NOT NULL");
    expect(sql).toContain("DO NOTHING");
    expect(sql).toContain("RETURNING * INTO v_row");
    expect(sql).toContain("SELECT * INTO v_row");
    expect(sql).toContain("FROM public.partner_flow_continuations c");
    expect(sql).toContain("WHILE v_attempt < v_max_attempts");
    expect(sql).not.toMatch(/WITH inserted AS/i);
    expect(sql).not.toContain("UNION ALL");
  });

  it("hardens SECURITY DEFINER with pg_catalog search_path and service_role grant only", () => {
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = pg_catalog, public");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.ensure_partner_flow_continuation_by_opaque");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.ensure_partner_flow_continuation_by_opaque");
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });

  it("normalizes opaque input with btrim", () => {
    expect(sql).toContain("v_opaque text := pg_catalog.btrim(p_opaque)");
    expect(sql).toContain("WHERE c.opaque_verify_request = v_opaque");
  });
});
