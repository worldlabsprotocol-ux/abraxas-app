// FILE: lib/wallet/waitForSolanaWalletAdapter.ts

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { getWallets } from "@wallet-standard/app";
import { detectInjectableWallet, type PreferredSolanaWalletId } from "./solanaWalletDiscovery";

/** Upper bound for adapter discovery (not user connection approval). */
export const WALLET_ADAPTER_DISCOVERY_WAIT_MS = 8_000;

export class WalletDiscoveryTimeoutError extends Error {
  constructor() {
    super("wallet_discovery_timeout");
    this.name = "WalletDiscoveryTimeoutError";
  }
}

export async function waitForSolanaWalletAdapter(input: {
  walletId: PreferredSolanaWalletId;
  getReadyState: () => WalletReadyState | null | undefined;
  maxWaitMs?: number;
}): Promise<"adapter_ready" | "injectable"> {
  const maxWaitMs = input.maxWaitMs ?? WALLET_ADAPTER_DISCOVERY_WAIT_MS;
  const deadline = Date.now() + maxWaitMs;

  const isReady = () => {
    const state = input.getReadyState();
    return state === WalletReadyState.Installed || state === WalletReadyState.Loadable;
  };

  const timeLeft = () => Math.max(0, deadline - Date.now());

  if (isReady()) return "adapter_ready";

  return new Promise<"adapter_ready" | "injectable">((resolve, reject) => {
    let finished = false;
    const finish = (result: "adapter_ready" | "injectable") => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      offRegister();
      resolve(result);
    };
    const fail = (error: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      offRegister();
      reject(error);
    };

    const check = () => {
      if (isReady()) {
        finish("adapter_ready");
        return true;
      }
      if (detectInjectableWallet(input.walletId)) {
        finish("injectable");
        return true;
      }
      return false;
    };

    const { on } = getWallets();
    const offRegister = on("register", () => {
      check();
    });

    const timer = setTimeout(() => {
      if (check()) return;
      if (detectInjectableWallet(input.walletId)) {
        finish("injectable");
        return;
      }
      fail(new WalletDiscoveryTimeoutError());
    }, timeLeft());

    if (document.readyState === "complete") {
      requestAnimationFrame(() => {
        check();
      });
    } else {
      window.addEventListener(
        "load",
        () => {
          requestAnimationFrame(() => check());
        },
        { once: true },
      );
    }
  });
}
