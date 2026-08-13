// FILE: scripts/demo/lib/demoProvisionerDryRun.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  buildProvisionerDryRunReport,
  formatProvisionerDryRunReport,
} from "./demoProvisionerDryRun";
import { DEMO_DRY_RUN_PROVISION_ID } from "./demoProvisionerConfig";
import { runProvisionerCommand } from "./demoProvisionerCli";
import { generateProvisionId } from "./demoProvisionerSubject";

vi.mock("./demoProvisionerSubject", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./demoProvisionerSubject")>();
  return {
    ...actual,
    generateProvisionId: vi.fn(() => {
      throw new Error("generateProvisionId must not run during dry-run");
    }),
  };
});

const baseEnv = {
  DEMO_SUPABASE_PROJECT_REF: "ocntwbxarpjeixdnzide",
  PRODUCTION_SUPABASE_PROJECT_REF: "bztwutzprwsdrtqdpymf",
  NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
  NEXT_PUBLIC_APP_URL: "https://demo.abraxasworld.xyz",
  ABRAXAS_ISSUER_URL: "https://demo.abraxasworld.xyz",
};

describe("demoProvisionerDryRun", () => {
  it("builds an offline plan without persistence markers", () => {
    const report = buildProvisionerDryRunReport({
      demoProjectRef: "ocntwbxarpjeixdnzide",
      productionProjectRef: "bztwutzprwsdrtqdpymf",
      maskedSupabaseUrl: "https://ocnt...zide.supabase.co",
      issuer: "https://demo.abraxasworld.xyz",
    });

    expect(report.illustrativeOnly).toBe(true);
    expect(report.provisionId).toBe(DEMO_DRY_RUN_PROVISION_ID);
    expect(report.maskedSubjectId).toContain("...");
    expect(report.mutationTables).toContain("credential_claims");

    const formatted = formatProvisionerDryRunReport(report);
    expect(formatted).toContain("DRY RUN");
    expect(formatted).toContain("non-persisted");
  });

  it("default command does not call generateProvisionId or secret prompts", async () => {
    const code = await runProvisionerCommand([], { ...baseEnv });

    expect(code).toBe(0);
    expect(generateProvisionId).not.toHaveBeenCalled();
  });
});
