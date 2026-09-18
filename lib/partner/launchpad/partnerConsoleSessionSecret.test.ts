// FILE: lib/partner/launchpad/partnerConsoleSessionSecret.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  isPartnerConsoleSessionConfigured,
  resolvePartnerConsoleSessionSecret,
} from "@/lib/partner/launchpad/partnerConsoleSessionSecret";
import { issuePartnerConsoleSessionToken } from "@/lib/partner/launchpad/partnerConsoleSession";

describe("partner console session secret domain separation", () => {
  beforeEach(() => {
    delete process.env.ABRAXAS_SIGNING_KEY;
    delete process.env.ABRAXAS_BROWSER_SESSION_SECRET;
  });

  it("fails closed when browser session secret is missing", () => {
    process.env.ABRAXAS_SIGNING_KEY = "receipt-signing-key-should-not-be-used";
    expect(resolvePartnerConsoleSessionSecret()).toBeNull();
    expect(isPartnerConsoleSessionConfigured()).toBe(false);
  });

  it("derives a distinct subkey from browser session secret", () => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "browser-session-secret-32chars";
    const secret = resolvePartnerConsoleSessionSecret();
    expect(secret).not.toBeNull();
    expect(secret?.length).toBe(32);
  });

  it("issues console tokens only when browser session secret is configured", async () => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "browser-session-secret-32chars";
    const token = await issuePartnerConsoleSessionToken({
      partnerId: "acme",
      apiKeyId: "key-1",
      environment: "sandbox",
    });
    expect(token).toBeTruthy();
  });
});
