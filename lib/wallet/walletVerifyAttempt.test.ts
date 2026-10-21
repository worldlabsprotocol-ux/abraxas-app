// FILE: lib/wallet/walletVerifyAttempt.test.ts

import { describe, expect, it } from "vitest";
import { createWalletVerifyAttempt, invalidateAllWalletVerifyAttempts } from "./walletVerifyAttempt";

describe("walletVerifyAttempt", () => {
  it("marks prior attempts stale when a new attempt is created", () => {
    const first = createWalletVerifyAttempt();
    const second = createWalletVerifyAttempt();
    expect(first.isStale()).toBe(true);
    expect(second.isStale()).toBe(false);
  });

  it("invalidates the active attempt globally", () => {
    const attempt = createWalletVerifyAttempt();
    invalidateAllWalletVerifyAttempts();
    expect(attempt.isStale()).toBe(true);
  });
});
