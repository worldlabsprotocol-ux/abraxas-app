import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/siteUrl";
import {
  GOOD_TROUBLE_PARTNER_ID,
  GOOD_TROUBLE_RETAIL_POLICY_ID,
  GOOD_TROUBLE_ENTER_PATH,
} from "@/lib/goodTrouble/constants";
import {
  goodTroubleProductionReturnUrl,
  goodTroubleProductionVerifyUrl,
} from "@/lib/goodTrouble/partnerIntegration";

const CANONICAL_RETURN = `${SITE_URL}${GOOD_TROUBLE_ENTER_PATH}`;

describe("Good Trouble retail checkout entry", () => {
  it("production verify CTA targets canonical partner/verify on abraxasworld.xyz", () => {
    const url = goodTroubleProductionVerifyUrl();
    const parsed = new URL(url);

    expect(parsed.origin).toBe(SITE_URL);
    expect(parsed.pathname).toBe("/partner/verify");
    expect(parsed.searchParams.get("partner_id")).toBe(GOOD_TROUBLE_PARTNER_ID);
    expect(parsed.searchParams.get("policy_id")).toBe(GOOD_TROUBLE_RETAIL_POLICY_ID);
    expect(parsed.searchParams.get("return_url")).toBe(CANONICAL_RETURN);
    expect(url).not.toContain("abraxas-app.vercel.app");
  });

  it("production return URL is the canonical Good Trouble enter callback", () => {
    expect(goodTroubleProductionReturnUrl()).toBe(CANONICAL_RETURN);
  });
});
