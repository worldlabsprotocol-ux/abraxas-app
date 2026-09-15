// FILE: lib/partner/launchpad/launchpadReturnUrl.test.ts

import { describe, expect, it } from "vitest";
import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";
import { validateLaunchpadHostedReturnUrl } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

describe("launchpad return URL validation", () => {
  it("rejects empty and invalid URLs", () => {
    expect(validateLaunchpadReturnUrl("").ok).toBe(false);
    expect(validateLaunchpadReturnUrl("not-a-url").ok).toBe(false);
    expect(validateLaunchpadReturnUrl("http://evil.example/callback").ok).toBe(false);
  });

  it("accepts https and localhost http callbacks", () => {
    expect(validateLaunchpadReturnUrl("https://app.example.com/callback").ok).toBe(true);
    expect(validateLaunchpadReturnUrl("http://localhost:3000/callback").ok).toBe(true);
  });

  it("rejects hostile redirect hosts against allowlist", () => {
    const app: LaunchpadApplicationRow = {
      id: "app-1",
      public_slug: "demo",
      partner_id: "demo-partner",
      application_name: "Demo",
      display_name: "Demo",
      environment: "sandbox",
      policy_id: "demo-age_21_retail-v1",
      policy_version: 1,
      policy_template_id: "age_21_retail",
      allowed_return_urls: ["https://app.example.com/callback"],
      api_key_id: null,
      status: "active",
      idempotency_key: null,
      created_at: "",
      updated_at: "",
    };
    expect(validateLaunchpadHostedReturnUrl(app, "https://evil.example/callback")).toBe(false);
    expect(validateLaunchpadHostedReturnUrl(app, "https://app.example.com/callback/complete")).toBe(true);
  });
});
