// FILE: lib/wallet/solanaWalletDiscovery.test.ts

import { describe, expect, it } from "vitest";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  resolveWalletOfferStatus,
  walletOfferMeta,
  mapWalletNotReadyMessage,
} from "./solanaWalletDiscovery";

describe("solanaWalletDiscovery", () => {
  it("marks wallet available when injectable even if adapter is NotDetected", () => {
    const status = resolveWalletOfferStatus({
      walletId: "Phantom",
      adapterReadyState: WalletReadyState.NotDetected,
      adapterListed: false,
      injectable: true,
      discoverySettled: true,
    });
    expect(status).toBe("available");
  });

  it("does not show install while discovery is in progress", () => {
    const status = resolveWalletOfferStatus({
      walletId: "Phantom",
      adapterReadyState: null,
      adapterListed: false,
      injectable: false,
      discoverySettled: false,
    });
    expect(status).toBe("discovering");
    expect(walletOfferMeta(status).showInstall).toBe(false);
  });

  it("shows install only when settled and not injectable", () => {
    const status = resolveWalletOfferStatus({
      walletId: "Phantom",
      adapterReadyState: WalletReadyState.NotDetected,
      adapterListed: true,
      injectable: false,
      discoverySettled: true,
    });
    expect(status).toBe("unavailable");
    expect(walletOfferMeta(status).showInstall).toBe(true);
  });

  it("maps locked wallet guidance", () => {
    expect(mapWalletNotReadyMessage("Phantom")).toMatch(/Unlock Phantom/i);
  });
});
