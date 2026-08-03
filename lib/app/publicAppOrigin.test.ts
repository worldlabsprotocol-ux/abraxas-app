import { describe, expect, it } from "vitest";
import { getPublicAppOrigin, getPublicAppOriginFromRequest } from "@/lib/app/publicAppOrigin";
import {
  buildPartnerVerifyUrl,
  resolvePartnerReturnUrl,
} from "@/lib/partner/referenceIntegration";
import { GOOD_TROUBLE_INTEGRATION } from "@/lib/goodTrouble/partnerIntegration";

describe("publicAppOrigin — partner flow same-origin", () => {
  const CANONICAL = "https://abraxasworld.xyz";

  it("buildPartnerVerifyUrl keeps partner verify and return URL on the same origin", () => {
    const url = buildPartnerVerifyUrl(GOOD_TROUBLE_INTEGRATION, { origin: CANONICAL });
    const parsed = new URL(url);

    expect(parsed.origin).toBe(CANONICAL);
    expect(parsed.pathname).toBe("/partner/verify");

    const returnUrl = parsed.searchParams.get("return_url");
    expect(returnUrl).toBe(`${CANONICAL}/good-trouble/enter`);
    expect(new URL(returnUrl!).origin).toBe(CANONICAL);
  });

  it("resolvePartnerReturnUrl uses enter path on the provided origin", () => {
    expect(resolvePartnerReturnUrl(GOOD_TROUBLE_INTEGRATION, CANONICAL)).toBe(
      `${CANONICAL}/good-trouble/enter`,
    );
  });

  it("getPublicAppOriginFromRequest uses forwarded host on API requests", () => {
    const origin = getPublicAppOriginFromRequest({
      headers: new Headers({
        host: "abraxasworld.xyz",
        "x-forwarded-proto": "https",
      }),
    });
    expect(origin).toBe("https://abraxasworld.xyz");
  });
});
