import { describe, expect, it } from "vitest";
import { resolvePartnerConsoleSessionKeyId } from "./partnerConsoleSession";

describe("resolvePartnerConsoleSessionKeyId", () => {
  it("uses api key id for api_key sessions", () => {
    expect(
      resolvePartnerConsoleSessionKeyId({
        partnerId: "p1",
        environment: "sandbox",
        authKind: "api_key",
        apiKeyId: "key-abc",
      }),
    ).toBe("key-abc");
  });

  it("uses namespaced account id for native account sessions", () => {
    expect(
      resolvePartnerConsoleSessionKeyId({
        partnerId: "p1",
        environment: "sandbox",
        authKind: "account",
        accountId: "abx_ac_test123",
        membershipRole: "owner",
      }),
    ).toBe("native_account:abx_ac_test123");
  });

  it("returns null when api key session lacks key id", () => {
    expect(
      resolvePartnerConsoleSessionKeyId({
        partnerId: "p1",
        environment: "sandbox",
        authKind: "api_key",
      }),
    ).toBeNull();
  });

  it("returns null when account session lacks account id", () => {
    expect(
      resolvePartnerConsoleSessionKeyId({
        partnerId: "p1",
        environment: "sandbox",
        authKind: "account",
      }),
    ).toBeNull();
  });
});
