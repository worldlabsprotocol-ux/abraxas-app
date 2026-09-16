// FILE: lib/stocklana/partnerIntegration.test.ts

import { describe, expect, it } from "vitest";
import { stocklanaReturnUrl, stocklanaVerifyUrl } from "@/lib/stocklana/partnerIntegration";
import {
  STOCKLANA_CALLBACK_PATH,
  STOCKLANA_ELIGIBILITY_POLICY_ID,
  STOCKLANA_PARTNER_ID,
} from "@/lib/stocklana/constants";

describe("Stocklana partner integration URLs", () => {
  const origin = "https://demo.example";

  it("builds hosted verify URL with partner, policy, and return_url", () => {
    const url = new URL(stocklanaVerifyUrl(origin, "openai-prestocks"));
    expect(url.pathname).toBe("/partner/verify");
    expect(url.searchParams.get("partner_id")).toBe(STOCKLANA_PARTNER_ID);
    expect(url.searchParams.get("policy_id")).toBe(STOCKLANA_ELIGIBILITY_POLICY_ID);
    expect(url.searchParams.get("return_url")).toBe(
      `${origin}${STOCKLANA_CALLBACK_PATH}?asset=openai-prestocks`,
    );
  });

  it("builds callback return URL with asset context", () => {
    expect(stocklanaReturnUrl(origin, "spacex-prestocks")).toBe(
      `${origin}${STOCKLANA_CALLBACK_PATH}?asset=spacex-prestocks`,
    );
  });
});
