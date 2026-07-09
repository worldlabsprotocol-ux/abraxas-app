// FILE: lib/partner/partnerAuth.test.ts
import { describe, it, expect } from "vitest";
import { hashPartnerKey, generatePartnerKey } from "./partnerAuth";

describe("partnerAuth", () => {
  it("generates abx_test_ and abx_live_ prefixes", () => {
    const testKey = generatePartnerKey("test");
    const liveKey = generatePartnerKey("live");
    expect(testKey.raw.startsWith("abx_test_")).toBe(true);
    expect(liveKey.raw.startsWith("abx_live_")).toBe(true);
  });

  it("hashes keys consistently", () => {
    const { raw } = generatePartnerKey("test");
    expect(hashPartnerKey(raw)).toBe(hashPartnerKey(raw));
  });

  it("never exposes raw key in prefix only", () => {
    const { raw, prefix } = generatePartnerKey("live");
    expect(raw.length).toBeGreaterThan(prefix.length);
    expect(raw.startsWith(prefix.slice(0, 8))).toBe(true);
  });
});
