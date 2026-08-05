import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("partner_policies query safety after multi-version PK (P1-1)", () => {
  const getPolicySource = readFileSync(
    resolve(process.cwd(), "lib/policy/getPolicy.ts"),
    "utf8",
  );
  const preflightSource = readFileSync(
    resolve(process.cwd(), "scripts/integration-preflight.ts"),
    "utf8",
  );
  const versioningSource = readFileSync(
    resolve(process.cwd(), "lib/policy/policyVersioning.ts"),
    "utf8",
  );

  it("getPartnerPolicy filters active status before maybeSingle", () => {
    expect(getPolicySource).toMatch(/\.eq\("status", "active"\)/);
    expect(getPolicySource).toMatch(/maybeSingle\(\)/);
  });

  it("getPartnerPolicyAtVersion filters exact version before maybeSingle", () => {
    expect(getPolicySource).toMatch(/\.eq\("version", version\)/);
  });

  it("integration preflight loadPolicy filters active status", () => {
    expect(preflightSource).toMatch(/from\("partner_policies"\)/);
    expect(preflightSource).toMatch(/\.eq\("status", "active"\)/);
    expect(preflightSource).toMatch(/maybeSingle\(\)/);
  });

  it("publishPolicyDraft uses atomic RPC instead of two-step updates", () => {
    expect(versioningSource).toContain('rpc("publish_partner_policy_draft"');
    expect(versioningSource).not.toMatch(/deprecateError/);
  });

  it("listPolicyVersions returns all versions for a policy id (no single())", () => {
    const fnBody = versioningSource.split("export async function listPolicyVersions")[1]
      ?.split("export async function createPolicyDraftFromActive")[0] ?? "";
    expect(fnBody).toMatch(/\.eq\("id", policyId\)/);
    expect(fnBody).toMatch(/order\("version"/);
    expect(fnBody).not.toMatch(/\.single\(/);
  });
});
