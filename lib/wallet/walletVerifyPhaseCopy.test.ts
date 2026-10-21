// FILE: lib/wallet/walletVerifyPhaseCopy.test.ts

import { describe, expect, it } from "vitest";
import { walletVerifyPhaseHeadline, walletVerifyPhaseIcon } from "./walletVerifyPhaseCopy";

describe("walletVerifyPhaseCopy", () => {
  it("uses warning icon for error phase", () => {
    const icon = walletVerifyPhaseIcon("error");
    expect(icon.glyph).toBe("!");
    expect(icon.color).not.toBe("#14F195");
  });

  it("does not label error as interrupted success", () => {
    expect(walletVerifyPhaseHeadline("error", "Phantom")).toContain("could not complete");
  });
});
