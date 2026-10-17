// FILE: lib/partner/launchpad/institutionalApplicationResolution.test.ts

import { describe, expect, it } from "vitest";
import { resolveInstitutionalWorkspaceApplications } from "@/lib/partner/launchpad/institutionalApplicationResolution";

describe("resolveInstitutionalWorkspaceApplications", () => {
  it("recognizes institutional sandbox apps for workspace selection", () => {
    const resolution = resolveInstitutionalWorkspaceApplications({
      applications: [
        {
          id: "inst-1",
          display_name: "Abraxas Sandbox",
          environment: "sandbox",
          policy_template_id: "sandbox_institutional_protocol_access",
        },
        {
          id: "retail-1",
          display_name: "Retail app",
          environment: "sandbox",
          policy_template_id: "age_21_retail",
        },
      ],
    });
    expect(resolution.institutionalApps.map((a) => a.id)).toEqual(["inst-1"]);
    expect(resolution.selectedInstitutionalAppId).toBe("inst-1");
    expect(resolution.mismatch).toBeNull();
  });

  it("explains when only non-institutional sandbox apps exist", () => {
    const resolution = resolveInstitutionalWorkspaceApplications({
      applications: [
        {
          id: "retail-1",
          display_name: "Abraxas Sandbox",
          environment: "sandbox",
          policy_template_id: "age_21_retail",
        },
      ],
    });
    expect(resolution.institutionalApps).toHaveLength(0);
    expect(resolution.mismatch?.kind).toBe("sandbox_apps_without_institutional_template");
    expect(resolution.mismatch?.message).toContain("Abraxas Sandbox");
    expect(resolution.mismatch?.recovery_href).toContain("sandbox_institutional_protocol_access");
  });

  it("fails closed when query application is not institutional", () => {
    const resolution = resolveInstitutionalWorkspaceApplications({
      applications: [
        {
          id: "retail-1",
          display_name: "Abraxas Sandbox",
          environment: "sandbox",
          policy_template_id: "age_21_retail",
        },
      ],
      queryApplicationId: "retail-1",
    });
    expect(resolution.mismatch?.kind).toBe("query_not_institutional");
    expect(resolution.selectedInstitutionalAppId).toBeNull();
  });
});
