// FILE: lib/partner/launchpad/stagingEnvironment.test.ts

import { describe, expect, it } from "vitest";
import {
  extractSupabaseProjectRefFromConfiguredUrl,
  isLaunchpadStagingIdentityRouteAllowed,
  resolveLaunchpadStagingEnvironment,
} from "./stagingEnvironment";

describe("launchpad staging environment identity", () => {
  it("allows preview and explicit local test environments only", () => {
    expect(isLaunchpadStagingIdentityRouteAllowed({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isLaunchpadStagingIdentityRouteAllowed({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      isLaunchpadStagingIdentityRouteAllowed({
        LAUNCHPAD_STAGING_IDENTITY_LOCAL: "true",
      }),
    ).toBe(true);
  });

  it("extracts project ref from configured Supabase URL", () => {
    expect(
      extractSupabaseProjectRefFromConfiguredUrl("https://ocntwbxarpjeixdnzide.supabase.co"),
    ).toBe("ocntwbxarpjeixdnzide");
    expect(extractSupabaseProjectRefFromConfiguredUrl("not-a-url")).toBeNull();
  });

  it("resolves preview identity from server configuration", () => {
    const result = resolveLaunchpadStagingEnvironment({
      VERCEL_ENV: "preview",
      NEXT_PUBLIC_SUPABASE_URL: "https://ocntwbxarpjeixdnzide.supabase.co",
      VERCEL_GIT_COMMIT_SHA: "37aa5f077b6b8ac896a566b39bffd26d008132c7",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.deployment_environment).toBe("preview");
      expect(result.identity.supabase_project_ref).toBe("ocntwbxarpjeixdnzide");
    }
  });
});
