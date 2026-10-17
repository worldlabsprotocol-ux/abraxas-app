// FILE: lib/partner/launchpad/launchpadConnectNavigation.test.ts

import { describe, expect, it } from "vitest";
import { resolveLaunchpadConnectPrimaryHref } from "@/lib/partner/launchpad/launchpadConnectNavigation";

describe("resolveLaunchpadConnectPrimaryHref", () => {
  it("routes institutional connect actions to the integration workspace", () => {
    const href = resolveLaunchpadConnectPrimaryHref({
      policyTemplateId: "sandbox_institutional_protocol_access",
      applicationId: "app-1",
      primaryCta: "Connect website",
      stage: "connect",
    });
    expect(href).toBe("/developers/institutional-integration?application=app-1");
  });

  it("does not route retail templates to institutional workspace", () => {
    expect(
      resolveLaunchpadConnectPrimaryHref({
        policyTemplateId: "age_21_retail",
        applicationId: "app-1",
        primaryCta: "Connect website",
        stage: "connect",
      }),
    ).toBeNull();
  });
});
