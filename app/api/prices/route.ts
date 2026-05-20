// FILE: app/api/prices/route.ts
// Price proxy — CryptoRank v2 primary, CoinGecko fallback.
// Cached 60s. Never exposes API key to browser.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CRYPTORANK_KEY = process.env.CRYPTORANK_API_KEY ?? "";
const COINGECKO_IDS: Record<string, string> = {
  gold:    "gold",
  silver:  "silver",
  bitcoin: "bitcoin",
  solana:  "solana",
  oil:     "crude-oil",
};

interface PriceResult {
  symbol:    string;
  price:     number;
  change24h: number;
  source:    "cryptorank" | "coingecko" | "fallback";
}

async function fromCryptoRank(symbols: string[]): Promise<PriceResult[] | null> {
  if (!CRYPTORANK_KEY) return null;
  try {
    const slugMap: Record<string,string> = {
      gold:"gold",silver:"silver",bitcoin:"bitcoin",solana:"solana",oil:"crude-oil"
    };
    const slugs = symbols.map(s => slugMap[s] ?? s).join(",");
    const res = await fetch(
      `https://api.cryptorank.io/v2/currencies?slugs=${slugs}&fields=price,percentChange24H`,
      {
        headers: { "X-Api-Key": CRYPTORANK_KEY },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? []).map((item: Record<string,unknown>) => ({
      symbol:    (item.slug as string) ?? "",
      price:     (item.price as number) ?? 0,
      change24h: (item.percentChange24H as number) ?? 0,
      source:    "cryptorank" as const,
    }));
  } catch { return null; }
}

async function fromCoinGecko(symbols: string[]): Promise<PriceResult[]> {
  try {
    const ids = symbols.map(s => COINGECKO_IDS[s] ?? s).join(",");
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error("CoinGecko error");
    const json = await res.json();
    return symbols.map(sym => {
      const id = COINGECKO_IDS[sym] ?? sym;
      const d = json[id];
      return { symbol:sym, price:d?.usd??0, change24h:d?.usd_24h_change??0, source:"coingecko" };
    });
  } catch {
    // Static fallback — stale but never crashes
    return symbols.map(sym => ({
      symbol:sym, price:0, change24h:0, source:"fallback"
    }));
  }
}

export async function GET(req: NextRequest) {
  const symbols = (req.nextUrl.searchParams.get("symbols") ?? "bitcoin,solana,gold").split(",");
  const results  = await fromCryptoRank(symbols) ?? await fromCoinGecko(symbols);
  return NextResponse.json({ prices: results, ts: Date.now() }, {
    headers: { "Cache-Control":"public,max-age=60" },
  });
}