// FILE: lib/nav/solanaSignInDialogState.test.ts

import { describe, expect, it } from "vitest";
import {
  activeSignInStepIndex,
  mapSignInFailure,
  mapWalletConnectFailure,
  signInModalTitle,
  signInStatusMessage,
} from "./solanaSignInDialogState";

describe("solanaSignInDialogState", () => {
  it("advances step index through connect → review → sign → enter", () => {
    expect(activeSignInStepIndex({ phase: "idle", walletConnected: false })).toBe(0);
    expect(activeSignInStepIndex({ phase: "connecting", walletConnected: false })).toBe(0);
    expect(activeSignInStepIndex({ phase: "connected", walletConnected: true })).toBe(1);
    expect(activeSignInStepIndex({ phase: "signing", walletConnected: true })).toBe(2);
    expect(activeSignInStepIndex({ phase: "verifying", walletConnected: true })).toBe(3);
    expect(activeSignInStepIndex({ phase: "success", walletConnected: true })).toBe(3);
  });

  it("uses connect title before wallet is connected", () => {
    expect(signInModalTitle({ phase: "idle", walletConnected: false })).toBe("Connect your wallet");
    expect(signInModalTitle({ phase: "connected", walletConnected: true })).toBe(
      "Sign in with your wallet",
    );
  });

  it("maps pending phases to status copy", () => {
    expect(signInStatusMessage({ phase: "connecting", walletName: "Phantom" })).toMatch(/Opening Phantom/);
    expect(signInStatusMessage({ phase: "signing", walletName: "Solflare" })).toMatch(/Solflare/);
    expect(signInStatusMessage({ phase: "verifying", walletName: null })).toBe("Verifying signature…");
  });

  it("maps connect and sign failures to explicit recovery copy", () => {
    expect(mapWalletConnectFailure(new Error("User rejected the request"))).toMatch(/dismissed/i);
    expect(mapSignInFailure({ reason: "cancelled" })).toMatch(/dismissed/i);
    expect(mapSignInFailure({ reason: "failed", code: "expired" })).toMatch(/timed out/i);
  });
});
