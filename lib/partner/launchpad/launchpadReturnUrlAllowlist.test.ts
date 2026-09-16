// FILE: lib/partner/launchpad/launchpadReturnUrlAllowlist.test.ts

import { describe, expect, it } from "vitest";
import { isLaunchpadReturnUrlAllowlisted } from "@/lib/partner/launchpad/launchpadReturnUrlAllowlist";

describe("isLaunchpadReturnUrlAllowlisted", () => {
  const previewOrigin = "https://abraxas-app-git-cursor-se-67cf03-worldlabsprotocol-uxs-projects.vercel.app";
  const callbackPath = "https://app.example.com/callback";

  it("rejects extra paths when allowlist entry is origin-only", () => {
    const allowed = [previewOrigin];
    expect(isLaunchpadReturnUrlAllowlisted(allowed, previewOrigin)).toBe(true);
    expect(isLaunchpadReturnUrlAllowlisted(allowed, `${previewOrigin}/`)).toBe(true);
    expect(isLaunchpadReturnUrlAllowlisted(allowed, `${previewOrigin}/disallowed/path`)).toBe(false);
  });

  it("allows prefix paths when allowlist entry includes a callback path", () => {
    const allowed = [callbackPath];
    expect(isLaunchpadReturnUrlAllowlisted(allowed, callbackPath)).toBe(true);
    expect(isLaunchpadReturnUrlAllowlisted(allowed, `${callbackPath}/complete`)).toBe(true);
    expect(isLaunchpadReturnUrlAllowlisted(allowed, "https://app.example.com/other")).toBe(false);
  });
});
