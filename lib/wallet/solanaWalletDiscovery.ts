// FILE: lib/wallet/solanaWalletDiscovery.ts
// Client-side Solana wallet discovery — do not equate "not connected" with "not installed".

import { WalletReadyState } from "@solana/wallet-adapter-base";

export type PreferredSolanaWalletId = "Phantom" | "Solflare";

export const WALLET_INSTALL_URLS: Record<PreferredSolanaWalletId, string> = {
  Phantom: "https://phantom.app/download",
  Solflare: "https://solflare.com/download",
};

type InjectableWindow = Window & {
  phantom?: { solana?: { isPhantom?: boolean; connect?: () => Promise<unknown> } };
  solana?: { isPhantom?: boolean; isSolflare?: boolean; connect?: () => Promise<unknown> };
};

export function detectPhantomInjectable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as InjectableWindow;
  if (w.phantom?.solana?.isPhantom) return true;
  if (w.solana?.isPhantom) return true;
  // Brave / delayed injection: provider object may exist before isPhantom flag is set.
  if (w.phantom?.solana && typeof w.phantom.solana.connect === "function") return true;
  return false;
}

export function detectSolflareInjectable(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as InjectableWindow;
  if (w.solana?.isSolflare) return true;
  const provider = (w as { solflare?: { isSolflare?: boolean } }).solflare;
  if (provider?.isSolflare) return true;
  return false;
}

export function detectInjectableWallet(walletId: PreferredSolanaWalletId): boolean {
  return walletId === "Phantom" ? detectPhantomInjectable() : detectSolflareInjectable();
}

export type WalletOfferStatus = "discovering" | "available" | "unavailable";

export function resolveWalletOfferStatus(input: {
  walletId: PreferredSolanaWalletId;
  adapterReadyState: WalletReadyState | null;
  adapterListed: boolean;
  injectable: boolean;
  discoverySettled: boolean;
}): WalletOfferStatus {
  const ready = input.adapterReadyState;
  if (ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable) {
    return "available";
  }
  if (input.injectable) {
    return "available";
  }
  if (!input.discoverySettled) {
    return "discovering";
  }
  if (input.adapterListed && ready === WalletReadyState.NotDetected) {
    return "unavailable";
  }
  return input.discoverySettled ? "unavailable" : "discovering";
}

export function walletOfferMeta(status: WalletOfferStatus): {
  actionLabel: string;
  detail: string;
  showInstall: boolean;
} {
  switch (status) {
    case "discovering":
      return {
        actionLabel: "Detecting…",
        detail: "Checking for extension",
        showInstall: false,
      };
    case "available":
      return {
        actionLabel: "Connect",
        detail: "Extension detected",
        showInstall: false,
      };
    default:
      return {
        actionLabel: "Not detected",
        detail: "Extension not detected",
        showInstall: true,
      };
  }
}

export function mapWalletNotReadyMessage(walletId: PreferredSolanaWalletId): string {
  return walletId === "Phantom"
    ? "Unlock Phantom in your browser toolbar, then click Connect Phantom again."
    : "Unlock Solflare in your browser toolbar, then click Connect Solflare again.";
}
