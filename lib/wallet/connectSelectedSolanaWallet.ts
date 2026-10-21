// FILE: lib/wallet/connectSelectedSolanaWallet.ts
// Ordered wallet selection + connection for @solana/wallet-adapter-react (no arbitrary sleeps).

import {
  WalletReadyState,
  type WalletAdapter,
  type WalletName,
} from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";
import {
  detectInjectableWallet,
  type PreferredSolanaWalletId,
  connectInjectableSolanaProvider,
} from "./solanaWalletDiscovery";

export type WalletConnectStage =
  | "resolve_listed_wallet"
  | "wait_adapter_ready"
  | "select_wallet"
  | "wait_selection_committed"
  | "invoke_connect"
  | "await_public_key";

export type WalletConnectDiagnostic = {
  walletId: PreferredSolanaWalletId;
  stage: WalletConnectStage;
  adapterName: string | null;
  adapterReadyState: WalletReadyState | null;
  selectionCommitted: boolean;
  connectInvoked: boolean;
  publicKeyReturned: boolean;
  errorName: string | null;
  errorMessage: string | null;
};

export class WalletConnectSequenceError extends Error {
  readonly diagnostic: WalletConnectDiagnostic;

  constructor(message: string, diagnostic: WalletConnectDiagnostic) {
    super(message);
    this.name = "WalletConnectSequenceError";
    this.diagnostic = diagnostic;
  }
}

export const WALLET_ADAPTER_READY_WAIT_MS = 8_000;
export const WALLET_SELECTION_COMMIT_WAIT_MS = 2_000;

function adapterIsConnectReady(state: WalletReadyState | null | undefined): boolean {
  return state === WalletReadyState.Installed || state === WalletReadyState.Loadable;
}

export function findListedWallet(
  wallets: Wallet[],
  walletId: PreferredSolanaWalletId,
): Wallet | null {
  return wallets.find((w) => w.adapter.name === walletId) ?? null;
}

/** Wait until adapter reports Installed/Loadable (e.g. after injectable-only detection). */
export function waitForAdapterConnectReady(input: {
  adapter: WalletAdapter;
  walletId: PreferredSolanaWalletId;
  maxWaitMs?: number;
}): Promise<void> {
  const maxWaitMs = input.maxWaitMs ?? WALLET_ADAPTER_READY_WAIT_MS;
  if (adapterIsConnectReady(input.adapter.readyState)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      input.adapter.off("readyStateChange", onReadyStateChange);
      if (error) reject(error);
      else resolve();
    };

    const onReadyStateChange = () => {
      if (adapterIsConnectReady(input.adapter.readyState)) {
        finish();
      }
    };

    input.adapter.on("readyStateChange", onReadyStateChange);

    const timer = setTimeout(() => {
      if (adapterIsConnectReady(input.adapter.readyState)) {
        finish();
        return;
      }
      finish(new Error("wallet_adapter_not_ready"));
    }, maxWaitMs);
  });
}

/** After select(), wait until context exposes the chosen wallet (React commit). */
export function waitForWalletSelectionCommitted(input: {
  walletId: PreferredSolanaWalletId;
  getSelectedWallet: () => Wallet | null;
  maxWaitMs?: number;
}): Promise<void> {
  const maxWaitMs = input.maxWaitMs ?? WALLET_SELECTION_COMMIT_WAIT_MS;
  const deadline = Date.now() + maxWaitMs;

  const matches = () => input.getSelectedWallet()?.adapter.name === input.walletId;

  if (matches()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    let raf = 0;
    const tick = () => {
      if (matches()) {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("wallet_selection_not_committed"));
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

export type ConnectSelectedSolanaWalletInput = {
  walletId: PreferredSolanaWalletId;
  wallets: Wallet[];
  select: (walletName: WalletName) => void;
  /** Latest connect from useWallet — must be read after selection commit. */
  connect: () => Promise<void>;
  getSelectedWallet: () => Wallet | null;
  getPublicKey: () => { toBase58(): string } | null;
  isContextConnected: () => boolean;
  commitSelection: (walletName: WalletName) => void;
  publicKeyWaitMs?: number;
};

export async function connectSelectedSolanaWallet(
  input: ConnectSelectedSolanaWalletInput,
): Promise<WalletConnectDiagnostic> {
  const diagnostic: WalletConnectDiagnostic = {
    walletId: input.walletId,
    stage: "resolve_listed_wallet",
    adapterName: null,
    adapterReadyState: null,
    selectionCommitted: false,
    connectInvoked: false,
    publicKeyReturned: false,
    errorName: null,
    errorMessage: null,
  };

  const listed = findListedWallet(input.wallets, input.walletId);
  if (!listed) {
    diagnostic.errorName = "WalletNotFoundError";
    diagnostic.errorMessage = "wallet_not_listed";
    throw new WalletConnectSequenceError("wallet_not_listed", diagnostic);
  }

  diagnostic.adapterName = listed.adapter.name;
  diagnostic.adapterReadyState = listed.readyState;

  if (input.isContextConnected() && input.getSelectedWallet()?.adapter.name === input.walletId) {
    diagnostic.selectionCommitted = true;
    diagnostic.publicKeyReturned = Boolean(input.getPublicKey());
    if (diagnostic.publicKeyReturned) return diagnostic;
  }

  diagnostic.stage = "select_wallet";
  input.commitSelection(input.walletId as WalletName);

  diagnostic.stage = "wait_selection_committed";
  try {
    await waitForWalletSelectionCommitted({
      walletId: input.walletId,
      getSelectedWallet: input.getSelectedWallet,
    });
    diagnostic.selectionCommitted = true;
  } catch (error) {
    diagnostic.errorName = error instanceof Error ? error.name : "Error";
    diagnostic.errorMessage = error instanceof Error ? error.message : String(error);
    throw new WalletConnectSequenceError("wallet_selection_not_committed", diagnostic);
  }

  diagnostic.stage = "wait_adapter_ready";
  try {
    await waitForAdapterConnectReady({
      adapter: listed.adapter,
      walletId: input.walletId,
    });
  } catch {
    if (detectInjectableWallet(input.walletId)) {
      try {
        await connectInjectableSolanaProvider(input.walletId);
        await waitForAdapterConnectReady({
          adapter: listed.adapter,
          walletId: input.walletId,
          maxWaitMs: 3_000,
        });
      } catch (error) {
        diagnostic.errorName = error instanceof Error ? error.name : "Error";
        diagnostic.errorMessage = error instanceof Error ? error.message : String(error);
        throw new WalletConnectSequenceError(
          diagnostic.errorMessage ?? "wallet_adapter_not_ready",
          diagnostic,
        );
      }
    } else {
      diagnostic.errorMessage = "wallet_adapter_not_ready";
      throw new WalletConnectSequenceError("wallet_adapter_not_ready", diagnostic);
    }
  }

  diagnostic.adapterReadyState = listed.adapter.readyState;

  diagnostic.stage = "invoke_connect";
  diagnostic.connectInvoked = true;
  try {
    await input.connect();
  } catch (error) {
    diagnostic.errorName = error instanceof Error ? error.name : "Error";
    diagnostic.errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  }

  diagnostic.stage = "await_public_key";
  const deadline = Date.now() + (input.publicKeyWaitMs ?? 8_000);
  while (Date.now() < deadline) {
    diagnostic.publicKeyReturned = Boolean(input.getPublicKey());
    if (diagnostic.publicKeyReturned || input.isContextConnected()) {
      return diagnostic;
    }
    await new Promise((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => resolve(undefined));
      } else {
        setTimeout(() => resolve(undefined), 16);
      }
    });
  }

  diagnostic.publicKeyReturned = Boolean(input.getPublicKey());
  if (!diagnostic.publicKeyReturned && !input.isContextConnected()) {
    diagnostic.errorMessage = "connect_succeeded_without_public_key";
    throw new WalletConnectSequenceError("connect_succeeded_without_public_key", diagnostic);
  }

  return diagnostic;
}
