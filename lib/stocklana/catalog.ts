// FILE: lib/stocklana/catalog.ts
// Curated Solana tokenized pre-IPO assets — public mint addresses only, no invented quotes.

export type StocklanaAssetSource = "prestocks_product_page" | "public_market_listing";

export interface StocklanaAsset {
  id: string;
  symbol: string;
  name: string;
  company: string;
  mint: string;
  tokenProgram: "token-2022";
  prestocksProductUrl: string;
  source: StocklanaAssetSource;
  /** Third-party listing used only to cross-check the mint string — not a live price feed. */
  publicListingUrl?: string;
  description: string;
}

/** Static catalog — mint strings verified on-chain in tests and optional API verify path. */
export const STOCKLANA_ASSET_CATALOG: readonly StocklanaAsset[] = [
  {
    id: "openai-prestocks",
    symbol: "OPENAI",
    name: "OpenAI (curated SPL mint)",
    company: "OpenAI",
    mint: "PreweJYECqtQwBtpxHL171nL2K6umo692gTm7Q3rpgF",
    tokenProgram: "token-2022",
    prestocksProductUrl: "https://prestocks.com/openai",
    publicListingUrl: "https://coinmarketcap.com/currencies/openai-tokenized-stock-prestocks/",
    source: "public_market_listing",
    description:
      "Curated Solana SPL mint associated with OpenAI in public listings. On-chain verification checks Token-2022 program ownership only.",
  },
  {
    id: "spacex-prestocks",
    symbol: "SPACEX",
    name: "SpaceX (curated SPL mint)",
    company: "SpaceX",
    mint: "PreANxuXjsy2pvisWWMNB6YaJNzr7681wJJr2rHsfTh",
    tokenProgram: "token-2022",
    prestocksProductUrl: "https://prestocks.com/spacex",
    publicListingUrl: "https://coinmarketcap.com/currencies/spacex-tokenized-stock-prestocks/",
    source: "public_market_listing",
    description:
      "Curated Solana SPL mint associated with SpaceX in public listings. On-chain verification checks Token-2022 program ownership only.",
  },
] as const;

export function getStocklanaAsset(assetId: string): StocklanaAsset | null {
  return STOCKLANA_ASSET_CATALOG.find((asset) => asset.id === assetId) ?? null;
}
