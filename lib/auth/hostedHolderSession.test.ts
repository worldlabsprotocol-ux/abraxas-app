// FILE: lib/auth/hostedHolderSession.test.ts

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  deriveHostedSuiAddress,
  hostedOAuthSub,
  isHostedHolderProvider,
} from "./hostedHolderSession";

describe("hostedHolderSession", () => {
  const originalSecret = process.env.ABRAXAS_BROWSER_SESSION_SECRET;

  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "test-hosted-secret";
  });

  afterEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = originalSecret;
  });

  it("derives stable sui addresses for a session id", () => {
    const sessionId = "11111111-1111-4111-8111-111111111111";
    const first = deriveHostedSuiAddress(sessionId);
    const second = deriveHostedSuiAddress(sessionId);
    expect(first).toBe(second);
    expect(first).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("uses hosted oauth sub namespace", () => {
    expect(hostedOAuthSub("abc")).toBe("hosted:abc");
  });

  it("recognizes hosted provider", () => {
    expect(isHostedHolderProvider("abraxas_hosted")).toBe(true);
    expect(isHostedHolderProvider("google")).toBe(false);
  });
});
