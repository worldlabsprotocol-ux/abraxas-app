// FILE: lib/partner/build583.localAutomated.test.ts

import { describe, expect, it } from "vitest";
import { INSTITUTIONAL_SANDBOX_STUDIO_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";

describe("Build #583 local automated contracts", () => {
  it("exposes canonical institutional studio entry with policy fit parameters", () => {
    expect(INSTITUTIONAL_SANDBOX_STUDIO_HREF).toContain("sandbox_institutional_protocol_access");
    expect(INSTITUTIONAL_SANDBOX_STUDIO_HREF).toContain("org_protocol_access");
    expect(INSTITUTIONAL_SANDBOX_STUDIO_HREF).toContain("institutional_eligibility");
  });
});
