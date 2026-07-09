// FILE: lib/auth/sessionErrors.test.ts
import { describe, it, expect } from "vitest";
import {
  CONNECT_SIGN_IN_PROMPT,
  mapWalletBindAuthFailure,
  mapBrowserSessionSetupFailure,
} from "@/lib/auth/sessionErrors";

describe("session error copy", () => {
  it("does not blame cross-app switching on generic 401", () => {
    const msg = mapWalletBindAuthFailure("Sign in required");
    expect(msg).not.toMatch(/Brave|MetaMask|carry over|another app/i);
    expect(msg).toBe(CONNECT_SIGN_IN_PROMPT);
  });

  it("maps session signing unavailable distinctly", () => {
    const msg = mapBrowserSessionSetupFailure("Session signing unavailable", 503);
    expect(msg).toMatch(/temporarily unavailable/i);
  });

  it("uses Connect prompt for generic session setup failure", () => {
    const msg = mapBrowserSessionSetupFailure("bad request", 400);
    expect(msg).toBe(CONNECT_SIGN_IN_PROMPT);
  });
});
