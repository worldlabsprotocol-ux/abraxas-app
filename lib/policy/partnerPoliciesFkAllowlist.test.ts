import { describe, expect, it } from "vitest";
import { PARTNER_POLICIES_ALLOWED_INBOUND_FKS } from "@/lib/policy/partnerPoliciesFkAllowlist";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("partner_policies inbound FK allowlist (migration 055 guard)", () => {
  const migrationSql = readFileSync(
    resolve(process.cwd(), "supabase/migrations/055_policy_immutable_versions.sql"),
    "utf8",
  );

  it("lists only reviewed inbound FK constraint names", () => {
    expect(PARTNER_POLICIES_ALLOWED_INBOUND_FKS).toEqual([
      "verification_requests_policy_id_fkey",
      "partner_issuer_trust_rules_policy_id_fkey",
    ]);
  });

  it("migration 055 embeds the same allowlist and raises on unexpected FK", () => {
    for (const name of PARTNER_POLICIES_ALLOWED_INBOUND_FKS) {
      expect(migrationSql).toContain(`'${name}'`);
    }
    expect(migrationSql).toMatch(/unexpected FK % referencing partner_policies/);
    expect(migrationSql).toMatch(/^begin;/m);
    expect(migrationSql).toMatch(/^commit;/m);
  });

  it("migration 055 drops only allowlisted FK constraints before PK change", () => {
    expect(migrationSql).toContain("drop constraint if exists verification_requests_policy_id_fkey");
    expect(migrationSql).toContain("drop constraint if exists partner_issuer_trust_rules_policy_id_fkey");
    expect(migrationSql).toContain("add constraint partner_policies_pkey primary key (id, version)");
  });

  it("migration 055 runs a non-no-op immutability probe via nested exception subtransaction", () => {
    const probeBlock = migrationSql.split(
      "-- Self-contained immutability probe: attempt to mutate active rules_json",
    )[1]?.split("commit;")[0] ?? "";

    expect(migrationSql).not.toMatch(/set\s+rules_json\s*=\s*rules_json\s*(where|;)/i);
    expect(probeBlock).not.toMatch(/\bsavepoint\b/i);
    expect(probeBlock).not.toMatch(/\brollback to savepoint\b/i);
    expect(probeBlock).toMatch(
      /rules_json = rules_json \|\| jsonb_build_object\('__p1_1_immutability_probe', true\)/,
    );
    expect(probeBlock).toMatch(/exception\s+when others then/);
    expect(probeBlock).toMatch(/cannot mutate rules_json/);
    expect(probeBlock).toMatch(
      /immutability probe failed — active rules_json mutation succeeded/,
    );
  });
});
