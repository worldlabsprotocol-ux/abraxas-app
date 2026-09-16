// FILE: lib/stocklana/catalog.test.ts

import { describe, expect, it } from "vitest";
import { STOCKLANA_ASSET_CATALOG, getStocklanaAsset } from "@/lib/stocklana/catalog";
describe("Stocklana asset catalog", () => {
  it("lists curated Solana mints with reference URLs (issuer not attested on-chain)", () => {
    expect(STOCKLANA_ASSET_CATALOG.length).toBeGreaterThanOrEqual(2);
    for (const asset of STOCKLANA_ASSET_CATALOG) {
      expect(asset.mint.length).toBeGreaterThan(30);
      expect(asset.prestocksProductUrl).toMatch(/^https:\/\//);
      expect(asset.tokenProgram).toBe("token-2022");
      expect(asset.description).toMatch(/issuer not attested|Token-2022/i);
    }
  });

  it("resolves assets by id", () => {
    const asset = getStocklanaAsset("openai-prestocks");
    expect(asset?.symbol).toBe("OPENAI");
    expect(asset?.mint).toBe("PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF");
  });

  it("does not embed live prices or invented market metrics", () => {
    const serialized = JSON.stringify(STOCKLANA_ASSET_CATALOG);
    expect(serialized).not.toMatch(/"price"|"market_cap"|"volume"/i);
  });
});
