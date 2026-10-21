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

  it("binds a challenge only to the active attempt generation", () => {
    const attempt = createWalletVerifyAttempt();
    attempt.bindChallenge("challenge-a");
    expect(attempt.canCommitChallenge("challenge-a")).toBe(true);
    expect(attempt.canCommitChallenge("challenge-b")).toBe(false);
    attempt.invalidate();
    expect(attempt.canCommitChallenge("challenge-a")).toBe(false);
  });

  it("rejects commit when a newer attempt supersedes", () => {
    const first = createWalletVerifyAttempt();
    first.bindChallenge("challenge-old");
    createWalletVerifyAttempt();
    expect(first.canCommitChallenge("challenge-old")).toBe(false);
  });
});
