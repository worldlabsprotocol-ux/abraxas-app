import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("130_partner_flow_continuations_opaque_verify_request migration contract", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/130_partner_flow_continuations_opaque_verify_request.sql"),
    "utf8",
  );

  it("adds opaque_verify_request without converting verify_request_id uuid", () => {
    expect(sql).toContain("ADD COLUMN IF NOT EXISTS opaque_verify_request text");
    expect(sql).not.toMatch(/alter column verify_request_id/i);
    expect(sql).toContain("idx_partner_flow_continuations_opaque_verify_request");
  });

  it("documents verify_request_id as verification_requests.id only", () => {
    expect(sql.toLowerCase()).toContain("verification_requests.id");
    expect(sql).toContain("vr_*");
  });
});
