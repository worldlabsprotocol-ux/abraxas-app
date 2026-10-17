// FILE: lib/partner/launchpad/institutionalVerificationRequirements.test.ts

import { describe, expect, it } from "vitest";
import { listInstitutionalVerificationRequirements } from "@/lib/partner/launchpad/institutionalVerificationRequirements";

describe("institutionalVerificationRequirements", () => {
  it("marks organization protocol access as selected for institutional template", () => {
    const rows = listInstitutionalVerificationRequirements({
      selectedPolicyTemplateId: "sandbox_institutional_protocol_access",
    });
    const primary = rows.find((r) => r.id === "organization_protocol_access_sandbox");
    expect(primary?.availability).toBe("selected");
  });

  it("does not mark age eligibility as selectable on institutional path", () => {
    const rows = listInstitutionalVerificationRequirements({
      selectedPolicyTemplateId: "sandbox_institutional_protocol_access",
    });
    const age = rows.find((r) => r.id === "age_eligibility");
    expect(age?.availability).toBe("unavailable");
    expect(age?.unavailable_reason).toMatch(/Partner Flow/i);
  });
});
