// FILE: lib/auth/passportWalletAuth/origin.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  assertPassportWalletSameOriginRequest,
  isAllowedPassportWalletOrigin,
  resolvePassportWalletRequestOrigin,
} from "./origin";

const TRUSTED = "https://demo.abraxasworld.xyz";

describe("passport wallet origin trust", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = TRUSTED;
    process.env.ABRAXAS_PASSPORT_WALLET_TRUSTED_ORIGINS = TRUSTED;
  });

  it("allows configured trusted origins only", () => {
    expect(isAllowedPassportWalletOrigin(TRUSTED)).toBe(true);
    expect(isAllowedPassportWalletOrigin("https://evil.example")).toBe(false);
  });

  it("rejects spoofed forwarded host not in trusted list", () => {
    const req = new Request("https://ignored/", {
      headers: {
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
        host: "evil.example",
      },
    });
    const origin = resolvePassportWalletRequestOrigin(req);
    expect(origin).not.toBe("https://evil.example");
  });

  it("binds POST CSRF to Origin header", () => {
    const trustedReq = new Request(TRUSTED, {
      method: "POST",
      headers: { origin: TRUSTED, host: "demo.abraxasworld.xyz" },
    });
    expect(assertPassportWalletSameOriginRequest(trustedReq, TRUSTED)).toBe(true);

    const crossReq = new Request(TRUSTED, {
      method: "POST",
      headers: { origin: "https://evil.example", host: "demo.abraxasworld.xyz" },
    });
    expect(assertPassportWalletSameOriginRequest(crossReq, TRUSTED)).toBe(false);
  });
});
