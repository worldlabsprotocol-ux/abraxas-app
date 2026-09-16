// FILE: lib/stocklana/catalog.test.ts

import { describe, expect, it } from "vitest";
import { STOCKLANA_ASSET_CATALOG, getStocklanaAsset } from "@/lib/stocklana/catalog";
describe("Stocklana asset catalog", () => {
  it("lists only public PreStocks-style mint addresses with product URLs", () => {
    expect(STOCKLANA_ASSET_CATALOG.length).toBeGreaterThanOrEqual(2);
    for (const asset of STOCKLANA_ASSET_CATALOG) {
      expect(asset.mint).toMatch(/^Pre[a-zA-Z0-9]{30,44}$/);
      expect(asset.prestocksProductUrl).toMatch(/^https:\/\/prestocks\.com\//);
      expect(asset.tokenProgram).toBe("token-2022");
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
