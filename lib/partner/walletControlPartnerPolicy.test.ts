import { describe, expect, it } from "vitest";
import { isWalletControlPartnerPolicy } from "./walletControlPartnerPolicy";

describe("walletControlPartnerPolicy", () => {
  it("detects wallet_control policy ids from pack slug", () => {
    expect(isWalletControlPartnerPolicy("ref-wc-postrev-5ffe-wallet_control-v1")).toBe(true);
    expect(isWalletControlPartnerPolicy("wallet_control")).toBe(true);
    expect(isWalletControlPartnerPolicy("good-trouble-retail-v1")).toBe(false);
  });
});
