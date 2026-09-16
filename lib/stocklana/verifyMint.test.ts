// FILE: lib/stocklana/verifyMint.test.ts

import { describe, expect, it } from "vitest";
import { verifyStocklanaMintOnChain } from "@/lib/stocklana/verifyMint";

describe("Stocklana on-chain mint verification", () => {
  it("verifies OpenAI PreStocks mint on Solana mainnet", async () => {
    const result = await verifyStocklanaMintOnChain({
      mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
      assetId: "openai-prestocks",
    });
    expect(result.ok).toBe(true);
    expect(result.detail).toBe("token_2022_mint_verified");
    expect(result.matchesCatalog).toBe(true);
  }, 30_000);

  it("rejects catalog mint mismatch", async () => {
    const result = await verifyStocklanaMintOnChain({
      mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
      assetId: "openai-prestocks",
    });
    expect(result.ok).toBe(false);
    expect(result.detail).toBe("mint_catalog_mismatch");
  });
});
