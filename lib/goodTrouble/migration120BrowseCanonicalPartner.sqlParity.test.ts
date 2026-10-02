import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATION_120 = readFileSync(
  join(process.cwd(), "supabase/migrations/120_good_trouble_browse_canonical_partner.sql"),
  "utf8",
);
const MIGRATION_121 = readFileSync(
  join(process.cwd(), "supabase/migrations/121_good_trouble_browse_canonical_partner_publish.sql"),
  "utf8",
);

describe("migration 120 Good Trouble browse canonical partner (allowlist only)", () => {
  it("does not mutate active partner_policies ownership", () => {
    expect(MIGRATION_120).not.toMatch(/UPDATE\s+public\.partner_policies/i);
    expect(MIGRATION_120.replace(/--[^\n]*/g, "")).not.toMatch(/publish_partner_policy_draft/i);
  });

  it("allowlists the canonical browse callback on good-trouble", () => {
    expect(MIGRATION_120).toContain("https://www.goodtroublecanna.com/browse-verification-result");
    expect(MIGRATION_120).toContain("'good-trouble'");
    expect(MIGRATION_120).toContain("allowed_return_urls");
  });

  it("preserves legacy good-trouble-cannabis callback compatibility", () => {
    expect(MIGRATION_120).toContain("'good-trouble-cannabis'");
  });

  it("defers policy ownership transfer to migration 121", () => {
    expect(MIGRATION_120).toMatch(/121|publish_partner_policy_draft/i);
    expect(MIGRATION_121).toContain("publish_partner_policy_draft");
  });
});

describe("migration 121 Good Trouble browse canonical partner publish", () => {
  it("uses publish_partner_policy_draft instead of mutating active policy rows", () => {
    expect(MIGRATION_121).not.toMatch(/UPDATE\s+public\.partner_policies/i);
    expect(MIGRATION_121).not.toMatch(/SET\s+partner_id/i);
    expect(MIGRATION_121).toContain("publish_partner_policy_draft");
    expect(MIGRATION_121).toContain("INSERT INTO public.partner_policies");
    expect(MIGRATION_121).toContain("status = 'draft'");
  });

  it("targets the canonical browse policy id and partner", () => {
    expect(MIGRATION_121).toContain("good-trouble-browse-v1");
    expect(MIGRATION_121).toContain("'good-trouble'");
    expect(MIGRATION_121).toContain("'good-trouble-cannabis'");
  });

  it("preserves browse L0 rules from the active legacy version", () => {
    expect(MIGRATION_121).toContain("v_active.rules_json");
    expect(MIGRATION_121).toContain("v_active.name");
  });

  it("is idempotent when canonical browse ownership is already active", () => {
    expect(MIGRATION_121).toContain("v_active.partner_id = v_canonical_partner");
    expect(MIGRATION_121).toContain("RETURN");
  });
});
