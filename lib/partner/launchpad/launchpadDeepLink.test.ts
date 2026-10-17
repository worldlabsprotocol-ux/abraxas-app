// FILE: lib/partner/launchpad/launchpadDeepLink.test.ts

import { describe, expect, it } from "vitest";
import {
  buildInstitutionalLaunchpadHref,
  parseLaunchpadApplicationIdFromSearch,
  parseLaunchpadStageFromSearch,
} from "@/lib/partner/launchpad/launchpadDeepLink";

describe("launchpadDeepLink", () => {
  it("reads stage from view or step query params", () => {
    expect(parseLaunchpadStageFromSearch("?view=connect")).toBe("connect");
    expect(parseLaunchpadStageFromSearch("?step=connect")).toBe("connect");
    expect(parseLaunchpadStageFromSearch("?step=test&view=verify")).toBe("verify");
  });

  it("reads application id from application or app query params", () => {
    expect(parseLaunchpadApplicationIdFromSearch("?application=app-1")).toBe("app-1");
    expect(parseLaunchpadApplicationIdFromSearch("?app=app-2")).toBe("app-2");
    expect(parseLaunchpadApplicationIdFromSearch("?application=app-1&app=ignored")).toBe("app-1");
  });

  it("builds institutional launchpad href with mirrored stage params", () => {
    const href = buildInstitutionalLaunchpadHref({ applicationId: "abc", stage: "connect" });
    expect(href).toContain("template=sandbox_institutional_protocol_access");
    expect(href).toContain("application=abc");
    expect(href).toContain("view=connect");
    expect(href).toContain("step=connect");
  });
});
