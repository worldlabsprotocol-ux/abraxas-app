// FILE: lib/wallet/useSolanaWalletDiscovery.ts
"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { getWallets } from "@wallet-standard/app";
import {
  detectInjectableWallet,
  type PreferredSolanaWalletId,
  resolveWalletOfferStatus,
  type WalletOfferStatus,
} from "./solanaWalletDiscovery";

const PREFERRED: PreferredSolanaWalletId[] = ["Phantom", "Solflare"];

/** After this, show install links only if still no injectable and no adapter. */
export const WALLET_DISCOVERY_UI_SETTLE_MS = 4_000;

function findAdapterWallet(wallets: ReturnType<typeof useWallet>["wallets"], name: PreferredSolanaWalletId) {
  return wallets.find((w) => w.adapter.name === name) ?? null;
}

export function useSolanaWalletDiscovery(active: boolean): {
  discoverySettled: boolean;
  offers: Record<
    PreferredSolanaWalletId,
    { status: WalletOfferStatus; readyState: WalletReadyState | null; listed: boolean }
  >;
} {
  const { wallets } = useWallet();
  const [discoveryTick, setDiscoveryTick] = useState(0);
  const [discoverySettled, setDiscoverySettled] = useState(false);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    let cancelled = false;
    const bump = () => {
      if (!cancelled) setDiscoveryTick((t) => t + 1);
    };

    const { get, on } = getWallets();
    if (get().length > 0) bump();

    const offRegister = on("register", () => bump());
    const offUnregister = on("unregister", () => bump());

    const onLoad = () => bump();
    if (document.readyState === "complete") {
      bump();
    } else {
      window.addEventListener("load", onLoad, { once: true });
    }

    const settle = () => {
      if (!cancelled) setDiscoverySettled(true);
    };
    const maxSettleTimer = window.setTimeout(settle, WALLET_DISCOVERY_UI_SETTLE_MS);
    if (document.readyState === "complete") {
      requestAnimationFrame(() => settle());
    } else {
      window.addEventListener("load", () => requestAnimationFrame(settle), { once: true });
    }

    return () => {
      cancelled = true;
      clearTimeout(maxSettleTimer);
      offRegister();
      offUnregister();
      window.removeEventListener("load", onLoad);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    for (const walletId of PREFERRED) {
      const listed = findAdapterWallet(wallets, walletId);
      if (
        listed?.readyState === WalletReadyState.Installed
        || listed?.readyState === WalletReadyState.Loadable
        || detectInjectableWallet(walletId)
      ) {
        setDiscoverySettled(true);
        break;
      }
    }
  }, [active, wallets, discoveryTick]);

  const offers = PREFERRED.reduce(
    (acc, walletId) => {
      const listed = findAdapterWallet(wallets, walletId);
      const injectable = detectInjectableWallet(walletId);
      const readyState = listed?.readyState ?? null;
      acc[walletId] = {
        status: resolveWalletOfferStatus({
          walletId,
          adapterReadyState: readyState,
          adapterListed: Boolean(listed),
          injectable,
          discoverySettled,
        }),
        readyState,
        listed: Boolean(listed),
      };
      return acc;
    },
    {} as Record<
      PreferredSolanaWalletId,
      { status: WalletOfferStatus; readyState: WalletReadyState | null; listed: boolean }
    >,
  );

  void discoveryTick;

  return { discoverySettled, offers };
}

export type { PreferredSolanaWalletId };
export { PREFERRED as PREFERRED_SOLANA_WALLETS };
