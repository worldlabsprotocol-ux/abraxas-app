// FILE: lib/auth/sessionErrors.test.ts
import { describe, it, expect } from "vitest";
import { mapWalletBindAuthFailure, mapBrowserSessionSetupFailure } from "@/lib/auth/sessionErrors";

describe("session error copy", () => {
  it("does not blame cross-app switching on generic 401", () => {
    const msg = mapWalletBindAuthFailure("Sign in required in this browser");
    expect(msg).not.toMatch(/Brave|MetaMask|carry over|another app/i);
    expect(msg).toMatch(/Sign in to Passport/i);
  });

  it("maps session signing unavailable distinctly", () => {
    const msg = mapBrowserSessionSetupFailure("Session signing unavailable", 503);
    expect(msg).toMatch(/temporarily unavailable/i);
  });
});
