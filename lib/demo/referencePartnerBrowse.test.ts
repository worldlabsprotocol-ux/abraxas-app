import { describe, expect, it } from "vitest";
import { buildReferencePartnerBrowseVerifyUrl, REFERENCE_PARTNER_BROWSE_CALLBACK_PATH } from "./referencePartnerBrowse";

describe("reference partner browse entry", () => {
  it("keeps the callback on the current Abraxas origin and binds the browse policy", () => {
    const url = new URL(buildReferencePartnerBrowseVerifyUrl("https://preview.example.com"));

    expect(url.origin).toBe("https://preview.example.com");
    expect(url.pathname).toBe("/partner/verify");
    expect(url.searchParams.get("partner_id")).toBe("good-trouble-cannabis");
    expect(url.searchParams.get("policy_id")).toBe("good-trouble-browse-v1");
    expect(url.searchParams.get("purpose")).toBe("browse");
    expect(new URL(url.searchParams.get("return_url") ?? "").pathname).toBe(REFERENCE_PARTNER_BROWSE_CALLBACK_PATH);
  });
});
