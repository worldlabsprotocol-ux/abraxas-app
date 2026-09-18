// FILE: lib/partner/launchpad/launchpadHostileReturnUrl.test.ts

import { describe, expect, it } from "vitest";
import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";
import { validateLaunchpadHostedReturnUrl } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

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

describe("hostile return URL matrix", () => {
  const invalidFormat = [
    "javascript:alert(1)",
    "data:text/html,hi",
    "//evil.example/callback",
    "https%3A%2F%2Fevil.example%2Fcallback",
    "",
  ];

  const allowedFormatButNotAllowlisted = [
    "https://app.example.com.evil.com/callback",
    "https://evil-app.example.com/callback",
    "https://app.example.com/other",
    "http://app.example.com/callback",
  ];

  it("rejects hostile URLs at format validation", () => {
    for (const url of invalidFormat) {
      expect(validateLaunchpadReturnUrl(url).ok).toBe(false);
    }
  });

  it("rejects allowed format URLs that are not on the application allowlist", () => {
    for (const url of allowedFormatButNotAllowlisted) {
      expect(validateLaunchpadHostedReturnUrl(app, url)).toBe(false);
    }
  });

  it("rejects unapproved hosts against allowlist", () => {
    expect(validateLaunchpadHostedReturnUrl(app, "https://evil.example/callback")).toBe(false);
    expect(validateLaunchpadHostedReturnUrl(app, "https://app.example.com/other")).toBe(false);
  });

  it("accepts approved exact and prefix paths", () => {
    expect(validateLaunchpadHostedReturnUrl(app, "https://app.example.com/callback")).toBe(true);
    expect(validateLaunchpadHostedReturnUrl(app, "https://app.example.com/callback/complete")).toBe(true);
  });

  it("rejects disallowed paths when allowlist entry is origin-only", () => {
    const originOnlyApp: LaunchpadApplicationRow = {
      ...app,
      allowed_return_urls: ["https://preview.example.com"],
    };
    expect(validateLaunchpadHostedReturnUrl(originOnlyApp, "https://preview.example.com")).toBe(true);
    expect(validateLaunchpadHostedReturnUrl(originOnlyApp, "https://preview.example.com/disallowed/path")).toBe(false);
  });
});
