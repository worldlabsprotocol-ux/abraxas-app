// FILE: lib/partner/goodTroubleOrderNowSeekerReturn.integration.test.ts
// ORDER NOW → verify (gtv) → hosted continue → Share return, with sessionStorage lost.

import { describe, expect, it } from "vitest";
import {
  GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import { mergePartnerReturnUrlHints } from "@/lib/partner/continuationReturnUrlMatch";
import { buildGoodTroublePurchaseCallbackUrlWithGtv } from "@/lib/partner/goodTroubleGtvBindingCookie";

const FLOW_TOKEN = `gtf_${"d".repeat(64)}`;

describe("Good Trouble ORDER NOW Seeker return chain (unit)", () => {
  it("merges Wix verify return_url gtv into bare allowlisted callback for Share step", () => {
    const wixVerifyReturnUrl = buildGoodTroublePurchaseCallbackUrlWithGtv(FLOW_TOKEN);
    const shareStepReturnUrl = mergePartnerReturnUrlHints(
      GOOD_TROUBLE_EXPECTED_CALLBACK_URL,
      wixVerifyReturnUrl,
    );
    expect(shareStepReturnUrl).toContain(FLOW_TOKEN);
    expect(shareStepReturnUrl.startsWith(GOOD_TROUBLE_EXPECTED_CALLBACK_URL)).toBe(true);
  });

  it("does not widen origin when attacker supplies foreign gtv hint", () => {
    const evil = `https://evil.example/age-verification-result?gtv=${FLOW_TOKEN}`;
    const merged = mergePartnerReturnUrlHints(GOOD_TROUBLE_EXPECTED_CALLBACK_URL, evil);
    expect(merged).toBe(GOOD_TROUBLE_EXPECTED_CALLBACK_URL);
  });
});
