// FILE: lib/stocklana/vercelBypass.test.ts

import { afterEach, describe, expect, it } from "vitest";
import { buildVercelBypassHeaders, readVercelProtectionBypass } from "@/lib/stocklana/vercelBypass";

describe("Stocklana Vercel bypass helpers", () => {
  const original = process.env.VERCEL_PROTECTION_BYPASS;

  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL_PROTECTION_BYPASS;
    else process.env.VERCEL_PROTECTION_BYPASS = original;
  });

  it("reads bypass from runtime env", () => {
    process.env.VERCEL_PROTECTION_BYPASS = "test-bypass-token";
    expect(readVercelProtectionBypass()).toBe("test-bypass-token");
  });

  it("sets bypass and cookie headers for Playwright", () => {
    const headers = buildVercelBypassHeaders("secret");
    expect(headers["x-vercel-protection-bypass"]).toBe("secret");
    expect(headers["x-vercel-set-bypass-cookie"]).toBe("true");
  });
});
