// FILE: lib/wallet/connectSelectedSolanaWallet.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  WalletReadyState,
  type WalletAdapter,
  type WalletName,
} from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import {
  connectSelectedSolanaWallet,
  waitForAdapterConnectReady,
  waitForWalletSelectionCommitted,
} from "./connectSelectedSolanaWallet";

function mockAdapter(name: string, readyState: WalletReadyState): WalletAdapter {
  const listeners = new Map<string, Set<() => void>>();
  return {
    name,
    url: "https://example.com",
    icon: "",
    readyState,
    publicKey: null,
    connected: false,
    connecting: false,
    supportedTransactionVersions: null,
    on(event: string, handler: () => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },
    off(event: string, handler: () => void) {
      listeners.get(event)?.delete(handler);
    },
    emit(event: string) {
      listeners.get(event)?.forEach((h) => h());
    },
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    sendTransaction: vi.fn(),
  } as unknown as WalletAdapter;
}

function mockWallet(adapter: WalletAdapter): Wallet {
  return { adapter, readyState: adapter.readyState };
}

describe("connectSelectedSolanaWallet", () => {
  it("waits for selection commit before invoking connect", async () => {
    const adapter = mockAdapter("Phantom", WalletReadyState.Installed);
    const wallets = [mockWallet(adapter)];
    let selected: Wallet | null = null;
    const connect = vi.fn(async () => {
      expect(selected?.adapter.name).toBe("Phantom");
    });

    const promise = connectSelectedSolanaWallet({
      walletId: "Phantom",
      wallets,
      select: () => {},
      connect,
      getSelectedWallet: () => selected,
      getPublicKey: () => ({ toBase58: () => "abc" }),
      isContextConnected: () => true,
      commitSelection: () => {
        selected = wallets[0]!;
      },
    });

    await promise;
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("rejects when wallet never appears in context after select", async () => {
    const adapter = mockAdapter("Phantom", WalletReadyState.Installed);
    const wallets = [mockWallet(adapter)];

    await expect(
      connectSelectedSolanaWallet({
        walletId: "Phantom",
        wallets,
        select: () => {},
        connect: vi.fn(),
        getSelectedWallet: () => null,
        getPublicKey: () => null,
        isContextConnected: () => false,
        commitSelection: () => {},
      }),
    ).rejects.toMatchObject({ message: "wallet_selection_not_committed" });
  });
});

describe("waitForAdapterConnectReady", () => {
  it("resolves when readyState transitions to Installed", async () => {
    let state = WalletReadyState.NotDetected;
    const adapter = mockAdapter("Phantom", state);
    Object.defineProperty(adapter, "readyState", {
      get: () => state,
      configurable: true,
    });
    const promise = waitForAdapterConnectReady({
      adapter,
      walletId: "Phantom",
      maxWaitMs: 500,
    });
    state = WalletReadyState.Installed;
    (adapter as { emit: (e: string) => void }).emit("readyStateChange");
    await promise;
  });
});

describe("waitForWalletSelectionCommitted", () => {
  it("resolves when selected wallet matches", async () => {
    const adapter = mockAdapter("Phantom", WalletReadyState.Installed);
    const wallet = mockWallet(adapter);
    await waitForWalletSelectionCommitted({
      walletId: "Phantom",
      getSelectedWallet: () => wallet,
      maxWaitMs: 100,
    });
  });
});
