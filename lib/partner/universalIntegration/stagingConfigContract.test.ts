import { describe, expect, it } from "vitest";
import { REFERENCE_RP_ENV_KEYS } from "@/lib/partner/referenceRelyingPartyConfig";
import { runStagingLiveE2ePreflight } from "./stagingConfigContract";

const BASE = {
  [REFERENCE_RP_ENV_KEYS.partnerId]: "example-merchant-protocol",
  [REFERENCE_RP_ENV_KEYS.policyId]: "example-merchant-age-21-v1",
  [REFERENCE_RP_ENV_KEYS.returnUrl]: "https://app.example-merchant.test/auth/abraxas/callback",
  [REFERENCE_RP_ENV_KEYS.baseUrl]: "https://staging.abraxas.example",
};

describe("runStagingLiveE2ePreflight", () => {
  it("blocks production hosts", () => {
    const result = runStagingLiveE2ePreflight({
      ...BASE,
      [REFERENCE_RP_ENV_KEYS.baseUrl]: "https://www.abraxasworld.xyz",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("production_host"))).toBe(true);
  });

  it("passes minimal staging config", () => {
    const result = runStagingLiveE2ePreflight(BASE);
    expect(result.ok).toBe(true);
    expect(result.config?.rp.partnerId).toBe(BASE[REFERENCE_RP_ENV_KEYS.partnerId]);
  });
});
