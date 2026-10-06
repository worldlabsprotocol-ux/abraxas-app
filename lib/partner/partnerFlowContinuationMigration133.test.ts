import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const FUNCTION_SIGNATURE =
  "text, text, text, text, integer, text, timestamptz, timestamptz, text, text, text, text";

describe("133_partner_flow_continuation_atomic_rpc_disambiguation migration contract", () => {
  const path = resolve(
    process.cwd(),
    "supabase/migrations/133_partner_flow_continuation_atomic_rpc_disambiguation.sql",
  );
  const sql = readFileSync(path, "utf8");

  it("exists on disk", () => {
    expect(existsSync(path)).toBe(true);
  });

  it("keeps function name and 12 input argument contract unchanged", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.ensure_partner_flow_continuation_by_opaque(");
    expect(sql).toContain("p_opaque text");
    expect(sql).toContain("p_jti text");
    expect(sql).toContain("p_partner_id text");
    expect(sql).toContain("p_policy_id text");
    expect(sql).toContain("p_policy_version integer");
    expect(sql).toContain("p_return_url text");
    expect(sql).toContain("p_expires_at timestamptz");
    expect(sql).toContain("p_created_at timestamptz");
    expect(sql).toContain("p_permission text DEFAULT NULL");
    expect(sql).toContain("p_permission_version text DEFAULT NULL");
    expect(sql).toContain("p_purpose text DEFAULT NULL");
    expect(sql).toContain("p_app_slug text DEFAULT NULL");
  });

  it("preserves external return field names for application mapRow compatibility", () => {
    expect(sql).toContain("was_created boolean");
    expect(sql).toContain("opaque_verify_request text");
    expect(sql).toContain("verify_request_id uuid");
    expect(sql).toContain("v_row.opaque_verify_request");
  });

  it("disambiguates migration-132 ON CONFLICT inference for partial unique index", () => {
    const fnBody = sql.slice(sql.indexOf("AS $$"), sql.lastIndexOf("$$;") + 3);
    expect(fnBody).toContain("#variable_conflict use_column");
    expect(fnBody).toContain("ON CONFLICT (opaque_verify_request) WHERE opaque_verify_request IS NOT NULL");
    expect(fnBody).toContain("DO NOTHING");
    expect(fnBody).not.toContain("DO UPDATE");
    expect(fnBody).not.toContain("ON CONFLICT ON CONSTRAINT");
  });

  it("preserves separate INSERT and winner SELECT with bounded retry", () => {
    expect(sql).toContain("INSERT INTO public.partner_flow_continuations");
    expect(sql).toContain("RETURNING * INTO v_row");
    expect(sql).toContain("SELECT * INTO v_row");
    expect(sql).toContain("FROM public.partner_flow_continuations c");
    expect(sql).toContain("WHILE v_attempt < v_max_attempts");
    expect(sql).not.toMatch(/WITH inserted AS/i);
    expect(sql).not.toContain("UNION ALL");
  });

  it("preserves was_created true/false semantics without overwriting winner", () => {
    expect(sql).toContain("true,\n        v_row.jti");
    expect(sql).toContain("false,\n        v_row.jti");
    expect(sql).not.toContain("DO UPDATE");
  });

  it("hardens SECURITY DEFINER, search_path, and least-privilege EXECUTE", () => {
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = pg_catalog, public");
    expect(sql).toContain(`REVOKE ALL ON FUNCTION public.ensure_partner_flow_continuation_by_opaque(\n  ${FUNCTION_SIGNATURE}\n) FROM PUBLIC, anon, authenticated`);
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.ensure_partner_flow_continuation_by_opaque(\n  ${FUNCTION_SIGNATURE}\n) TO service_role`);
    expect(sql).not.toMatch(/GRANT EXECUTE[\s\S]*TO anon/);
    expect(sql).not.toMatch(/GRANT EXECUTE[\s\S]*TO authenticated/);
    expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
  });

  it("preserves partial unique-index conflict target from migration 130", () => {
    const fnBody = sql.slice(sql.indexOf("AS $$"), sql.lastIndexOf("$$;") + 3);
    expect(fnBody).toContain("ON CONFLICT (opaque_verify_request) WHERE opaque_verify_request IS NOT NULL");
  });
});
