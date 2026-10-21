// FILE: lib/wallet/walletVerifyPhaseCopy.test.ts

import { describe, expect, it } from "vitest";
import { walletVerifyPhaseHeadline, walletVerifyPhaseIcon } from "./walletVerifyPhaseCopy";

describe("walletVerifyPhaseCopy", () => {
  it("uses warning icon and neutral headline on error phase", () => {
    const icon = walletVerifyPhaseIcon("error");
    expect(icon.glyph).toBe("!");
    expect(icon.color).toBe("#E8A020");
    expect(walletVerifyPhaseHeadline("error", "Phantom")).toBe("Wallet verification could not complete");
  });

  it("uses success icon only after verified phase", () => {
    const icon = walletVerifyPhaseIcon("verified");
    expect(icon.glyph).toBe("✓");
    expect(walletVerifyPhaseHeadline("verified", "Phantom")).toBe("Wallet verified");
  });
});
