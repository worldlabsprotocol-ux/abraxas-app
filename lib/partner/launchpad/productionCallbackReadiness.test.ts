import { describe, expect, it } from "vitest";
import { hasProductionLaunchpadCallback, isProductionLaunchpadCallback } from "./productionCallbackReadiness";

describe("production Launchpad callback readiness", () => {
  it("requires an HTTPS callback that is not localhost", () => {
    expect(isProductionLaunchpadCallback("http://localhost:3000/callback")).toBe(false);
    expect(isProductionLaunchpadCallback("https://localhost/callback")).toBe(false);
    expect(isProductionLaunchpadCallback("https://127.0.0.1/callback")).toBe(false);
    expect(isProductionLaunchpadCallback("https://partner.example.com/auth/abraxas/callback")).toBe(true);
  });

  it("accepts promotion when a real callback exists alongside local development URLs", () => {
    expect(hasProductionLaunchpadCallback([
      "http://localhost:3000/callback",
      "https://partner.example.com/auth/abraxas/callback",
    ])).toBe(true);
    expect(hasProductionLaunchpadCallback(["http://localhost:3000/callback"])).toBe(false);
  });
});
