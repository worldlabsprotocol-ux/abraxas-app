import { describe, expect, it } from "vitest";
import { resolveStudioDefaultCallbackUrl } from "@/lib/developers/studioDefaultCallbackUrl";

describe("resolveStudioDefaultCallbackUrl", () => {
  it("uses same-site HTTPS partner callback on production origins", () => {
    expect(resolveStudioDefaultCallbackUrl("https://abraxasworld.xyz")).toBe(
      "https://abraxasworld.xyz/partner/callback",
    );
  });

  it("falls back to localhost for non-HTTPS origins", () => {
    expect(resolveStudioDefaultCallbackUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/callback",
    );
  });
});
