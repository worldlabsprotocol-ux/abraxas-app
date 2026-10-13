import { describe, expect, it } from "vitest";
import {
  filterSuiCompatibleWallets,
  walletHasStandardConnect,
  walletSupportsSuiChain,
} from "./discoverSuiWallets";
import type { Wallet } from "@wallet-standard/base";
import { StandardConnect } from "@wallet-standard/features";

function mockWallet(partial: Partial<Wallet> & Pick<Wallet, "name">): Wallet {
  return {
    version: "1.0.0",
    icon: "data:image/png;base64,",
    chains: [],
    accounts: [],
    features: {},
    ...partial,
  } as Wallet;
}

describe("discoverSuiWallets", () => {
  it("accepts wallets with sui chain and standard connect", () => {
    const w = mockWallet({
      name: "Example",
      chains: ["sui:devnet"],
      features: {
        [StandardConnect]: { version: "1.0.0", connect: async () => ({ accounts: [] }) },
      },
    });
    expect(walletSupportsSuiChain(w)).toBe(true);
    expect(walletHasStandardConnect(w)).toBe(true);
    expect(filterSuiCompatibleWallets([w])).toHaveLength(1);
  });

  it("rejects non-Sui wallets", () => {
    const w = mockWallet({
      name: "Solana only",
      chains: ["solana:mainnet"],
      features: {
        [StandardConnect]: { version: "1.0.0", connect: async () => ({ accounts: [] }) },
      },
    });
    expect(filterSuiCompatibleWallets([w])).toHaveLength(0);
  });
});
