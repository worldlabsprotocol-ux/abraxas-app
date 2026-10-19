// FILE: lib/wallet/waitForSolanaWalletAdapter.ts

import { WalletReadyState } from "@solana/wallet-adapter-base";
import { getWallets } from "@wallet-standard/app";
import { detectInjectableWallet, type PreferredSolanaWalletId } from "./solanaWalletDiscovery";

export async function waitForSolanaWalletAdapter(input: {
  walletId: PreferredSolanaWalletId;
  getReadyState: () => WalletReadyState | null | undefined;
}): Promise<"adapter_ready" | "injectable"> {
  const isReady = () => {
    const state = input.getReadyState();
    return state === WalletReadyState.Installed || state === WalletReadyState.Loadable;
  };

  if (isReady()) return "adapter_ready";
  if (detectInjectableWallet(input.walletId)) {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        offRegister();
        resolve();
      };
      const { on } = getWallets();
      const offRegister = on("register", () => {
        if (isReady()) done();
      });
      if (isReady()) {
        done();
        return;
      }
      requestAnimationFrame(() => {
        if (isReady()) done();
        else requestAnimationFrame(done);
      });
    });
    if (isReady()) return "adapter_ready";
    return "injectable";
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      offRegister();
      resolve();
    };
    const { on } = getWallets();
    const offRegister = on("register", done);
    if (document.readyState === "complete") {
      requestAnimationFrame(done);
    } else {
      window.addEventListener("load", done, { once: true });
    }
  });

  if (isReady()) return "adapter_ready";
  if (detectInjectableWallet(input.walletId)) return "injectable";
  throw new Error("wallet_adapter_unavailable");
}
