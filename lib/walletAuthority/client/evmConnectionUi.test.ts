// FILE: lib/walletAuthority/client/evmConnectionUi.test.ts
import { describe, it, expect } from "vitest";
import { resolveEvmConnectionUiState } from "@/lib/walletAuthority/client/evmConnectionUi";

describe("resolveEvmConnectionUiState", () => {
  it("offers injected path when window.ethereum is present", () => {
    const state = resolveEvmConnectionUiState({
      hasInjectedProvider: true,
      isMobile: true,
      walletConnectConfigured: true,
    });
    expect(state.showInjected).toBe(true);
    expect(state.showWalletConnect).toBe(false);
    expect(state.blockedHint).toBeNull();
  });

  it("offers WalletConnect on mobile when no injected provider", () => {
    const state = resolveEvmConnectionUiState({
      hasInjectedProvider: false,
      isMobile: true,
      walletConnectConfigured: true,
    });
    expect(state.showInjected).toBe(false);
    expect(state.showWalletConnect).toBe(true);
    expect(state.blockedHint).toBeNull();
  });

  it("does not dead-end on mobile when WC is configured — no MetaMask-not-detected error path", () => {
    const state = resolveEvmConnectionUiState({
      hasInjectedProvider: false,
      isMobile: true,
      walletConnectConfigured: true,
    });
    expect(state.showWalletConnect).toBe(true);
    expect(state.blockedHint).toBeNull();
  });

  it("shows blocked hint on mobile without WC project id", () => {
    const state = resolveEvmConnectionUiState({
      hasInjectedProvider: false,
      isMobile: true,
      walletConnectConfigured: false,
    });
    expect(state.showWalletConnect).toBe(false);
    expect(state.blockedHint).toMatch(/in-app browser/i);
  });

  it("shows desktop hint when no extension", () => {
    const state = resolveEvmConnectionUiState({
      hasInjectedProvider: false,
      isMobile: false,
      walletConnectConfigured: false,
    });
    expect(state.blockedHint).toMatch(/extension/i);
  });

  it("includes browser session hint", () => {
    const state = resolveEvmConnectionUiState({
      hasInjectedProvider: true,
      isMobile: false,
    });
    expect(state.sessionHint).toMatch(/Sign in on this page/i);
  });
});
