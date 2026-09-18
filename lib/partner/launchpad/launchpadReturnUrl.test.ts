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

  it("rejects wildcard and private-network callback hosts", () => {
    for (const url of [
      "https://*.example.com/callback",
      "https://10.0.0.1/callback",
      "https://192.168.1.10/callback",
      "https://172.16.0.10/callback",
      "https://169.254.169.254/callback",
      "https://[fc00::1]/callback",
      "https://0.0.0.0/callback",
      "https://localhost/callback",
    ]) expect(validateLaunchpadReturnUrl(url).ok).toBe(false);
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
      production_api_key_id: null,
      production_key_revealed_at: null,
      status: "active",
      idempotency_key: null,
      created_at: "",
      updated_at: "",
    };
    expect(validateLaunchpadHostedReturnUrl(app, "https://evil.example/callback")).toBe(false);
    expect(validateLaunchpadHostedReturnUrl(app, "https://app.example.com/callback/complete")).toBe(true);
  });
});
