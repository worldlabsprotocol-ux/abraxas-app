import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("Partner Onboarding Console structure", () => {
  it("uses checkAdminAccess on onboarding APIs", () => {
    expect(read("app/api/admin/partners/onboarding/route.ts")).toContain("checkAdminAccess");
    expect(read("app/api/admin/partners/onboarding/return-urls/route.ts")).toContain("checkAdminAccess");
    expect(read("app/api/admin/partners/onboarding/policies/route.ts")).toContain("checkAdminAccess");
  });

  it("publishes via immutable policy RPC only", () => {
    const policies = read("app/api/admin/partners/onboarding/policies/route.ts");
    expect(policies).toContain("publishPolicyDraft");
    expect(policies).toContain("createInitialPolicyDraft");
    expect(policies).not.toMatch(/update\([^)]*rules_json/);
  });

  it("exposes onboarding console UI under /admin/partners", () => {
    const page = read("app/admin/partners/page.tsx");
    expect(page).toContain("PartnerOnboardingConsole");
    expect(page).toContain("Partner Onboarding Console");
  });

  it("documents no migration required", () => {
    const doc = read("docs/PARTNER_ONBOARDING_CONSOLE.md");
    expect(doc).toMatch(/no additive migration required/i);
  });
});
