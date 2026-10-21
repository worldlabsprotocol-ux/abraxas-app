import { describe, expect, it } from "vitest";
import { normalizeHolderContinuePath } from "@/lib/auth/holderContinuePath";

describe("holderContinuePath", () => {
  it("allows Cielo verified-rate paths only", () => {
    expect(normalizeHolderContinuePath("/cielo/verified-rate")).toBe("/cielo/verified-rate");
    expect(normalizeHolderContinuePath("/cielo/verified-rate/confirmation")).toBe(
      "/cielo/verified-rate/confirmation",
    );
    expect(normalizeHolderContinuePath("https://evil.example/cielo/verified-rate")).toBeNull();
    expect(normalizeHolderContinuePath("/partner/verify?x=1")).toBeNull();
  });

  it("allows validated partner continue paths with opaque verify_request only", () => {
    expect(
      normalizeHolderContinuePath("/partner/continue?verify_request=vr_abc1234567890ab"),
    ).toBe("/partner/continue?verify_request=vr_abc1234567890ab");
    expect(
      normalizeHolderContinuePath("/partner/continue?verify_request=vr_abc&return=https://evil.example"),
    ).toBeNull();
    expect(
      normalizeHolderContinuePath("/partner/continue?verify_request=vr_abc&return_url=https://evil.example"),
    ).toBeNull();
    expect(normalizeHolderContinuePath("//evil.example/partner/continue?verify_request=vr_abc")).toBeNull();
  });

  it("maps passport verify_request entry to partner continue for OAuth return", () => {
    expect(
      normalizeHolderContinuePath("/passport?verify_request=vr_holderresume01"),
    ).toBe("/partner/continue?verify_request=vr_holderresume01");
    expect(
      normalizeHolderContinuePath("/passport?verify_request=vr_holderresume01&return=/evil"),
    ).toBeNull();
  });
});
