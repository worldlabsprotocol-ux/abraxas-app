// FILE: lib/preview/vercelBypass.test.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  redactBypassFromUrl,
  urlContainsBypassSecret,
  vercelBypassHeaders,
  vercelBypassSeedTarget,
} from "./vercelBypass";

describe("vercelBypass", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("never embeds bypass secret in seed target URL", () => {
    vi.stubEnv("VERCEL_PROTECTION_BYPASS", "test-bypass-secret-value");
    const target = vercelBypassSeedTarget("https://preview.example.vercel.app/");
    expect(target).toBe("https://preview.example.vercel.app");
    expect(target).not.toContain("test-bypass-secret-value");
    expect(target).not.toContain("x-vercel-protection-bypass");
  });

  it("sends bypass only via headers", () => {
    vi.stubEnv("VERCEL_PROTECTION_BYPASS", "header-only-secret");
    expect(vercelBypassHeaders()).toEqual({
      "x-vercel-protection-bypass": "header-only-secret",
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  it("redacts bypass from URLs for logs and reports", () => {
    vi.stubEnv("VERCEL_PROTECTION_BYPASS", "leaky-secret");
    const dirty = "https://preview.example/?x-vercel-protection-bypass=leaky-secret&x=1";
    expect(redactBypassFromUrl(dirty)).not.toContain("leaky-secret");
    expect(urlContainsBypassSecret(dirty)).toBe(true);
  });
});
