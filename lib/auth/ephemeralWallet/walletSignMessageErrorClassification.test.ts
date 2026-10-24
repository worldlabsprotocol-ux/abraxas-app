// FILE: lib/auth/ephemeralWallet/walletSignMessageErrorClassification.test.ts

import { describe, expect, it } from "vitest";
import {
  classifyWalletSignMessageError,
  isExplicitWalletSignCancellation,
} from "./walletSignMessageErrorClassification";

describe("walletSignMessageErrorClassification", () => {
  it("treats explicit user rejection as cancellation", () => {
    expect(isExplicitWalletSignCancellation(new Error("User rejected the request"))).toBe(true);
    expect(classifyWalletSignMessageError(new Error("User rejected the request"))).toBe("cancelled");
  });

  it("treats wallet standard code 4001 as cancellation", () => {
    const err = { name: "WalletSignMessageError", message: "Error", error: { code: 4001 } };
    expect(classifyWalletSignMessageError(err)).toBe("cancelled");
  });

  it("does not treat unknown adapter failures as cancellation", () => {
    expect(classifyWalletSignMessageError(new Error("Unexpected failure"))).toBe("wallet_error");
    expect(classifyWalletSignMessageError({ name: "WalletSignMessageError", message: "" })).toBe(
      "wallet_error",
    );
  });

  it("classifies disconnect and not-ready as wallet_error", () => {
    expect(
      classifyWalletSignMessageError({ name: "WalletNotConnectedError", message: "Wallet not connected" }),
    ).toBe("wallet_error");
    expect(classifyWalletSignMessageError({ name: "WalletNotReadyError", message: "Not ready" })).toBe(
      "wallet_error",
    );
  });

  it("classifies popup blocked as wallet_error", () => {
    expect(
      classifyWalletSignMessageError({ name: "WalletWindowBlockedError", message: "Popup blocked" }),
    ).toBe("wallet_error");
  });
});
