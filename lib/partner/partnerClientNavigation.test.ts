import { describe, expect, it } from "vitest";
import { isSafePartnerHandoffRedirectUrl, navigateToPartnerHandoffRedirect } from "./partnerClientNavigation";

describe("isSafePartnerHandoffRedirectUrl", () => {
  it("allows HTTPS destinations for server-validated handoff redirects", () => {
    expect(isSafePartnerHandoffRedirectUrl("https://evil.example/callback")).toBe(true);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isSafePartnerHandoffRedirectUrl("//evil.example/callback")).toBe(false);
  });

  it("rejects javascript URLs", () => {
    expect(isSafePartnerHandoffRedirectUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data URLs", () => {
    expect(isSafePartnerHandoffRedirectUrl("data:text/html,hi")).toBe(false);
  });

  it("rejects encoded javascript bypass attempts", () => {
    expect(isSafePartnerHandoffRedirectUrl("java%09script:alert(1)")).toBe(false);
  });

  it("accepts approved partner HTTPS URLs", () => {
    expect(
      isSafePartnerHandoffRedirectUrl(
        "https://www.goodtroublecanna.com/browse-verification-result?gtb=gtb_test",
      ),
    ).toBe(true);
  });

  it("accepts valid same-origin relative paths", () => {
    expect(isSafePartnerHandoffRedirectUrl("/partner/verify")).toBe(true);
  });

  it("rejects empty destinations", () => {
    expect(isSafePartnerHandoffRedirectUrl("")).toBe(false);
    expect(isSafePartnerHandoffRedirectUrl("   ")).toBe(false);
  });

  it("does not navigate to unsafe destinations", () => {
    expect(navigateToPartnerHandoffRedirect("javascript:alert(1)")).toBe(false);
    expect(navigateToPartnerHandoffRedirect("")).toBe(false);
  });
});
