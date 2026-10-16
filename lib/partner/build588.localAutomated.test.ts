// FILE: lib/partner/build588.localAutomated.test.ts

import { describe, expect, it } from "vitest";
import {
  INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF,
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";

describe("Build #588 local automated contracts", () => {
  it("exposes canonical institutional integration workspace entry", () => {
    expect(INSTITUTIONAL_INTEGRATION_WORKSPACE_HREF).toBe("/developers/institutional-integration");
    expect(INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF).toContain("sandbox_institutional_protocol_access");
  });
});
