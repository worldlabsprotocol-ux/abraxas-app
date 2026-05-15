// FILE: lib/services/intelligence.ts
// Protocol data aggregation service with 30-second cache.
// Single source of truth for all external API data.
// Never called from render — use hooks that call this service.
"use client";

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry<T> { data:T; ts:number; }
const CACHE = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key:string): T | null {
  const entry = CACHE.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { CACHE.delete(key); return null; }
  return entry.data;
}
function setCached<T>(key:string, data:T): void {
  CACHE.set(key, { data, ts: Date.now() });
}

// ── Price types ───────────────────────────────────────────────────────────────
export interface TokenPrice {
  usdPrice:   number;
  change24h:  number;
  volume24h:  number;
  source:     string;
  fetchedAt:  number;
}

// ── Jupiter price API (primary for ABRA) ─────────────────────────────────────
export async function fetchAbraPrice(): Promise<TokenPrice | null> {
  const cacheKey = "abra_price";
  const cached   = getCached<TokenPrice>(cacheKey);
  if (cached) return cached;

  try {
    const ABRA_CA = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";
    const res   = await fetch(
      `https://price.jup.ag/v6/price?ids=${ABRA_CA}`,
      { next:{ revalidate:30 } }
    );
    if (!res.ok) throw new Error(`Jupiter API ${res.status}`);
    const json  = await res.json();
    const data  = json?.data?.[ABRA_CA];
    if (!data) return null;

    const price: TokenPrice = {
      usdPrice:  data.price ?? 0,
      change24h: 0,           // Jupiter basic API doesn't return 24h change
      volume24h: 0,
      source:    "jupiter",
      fetchedAt: Date.now(),
    };
    setCached(cacheKey, price);
    return price;
  } catch {
    return null;
  }
}

// ── CoinGecko prices for SOL, BTC, ETH ───────────────────────────────────────
export interface CryptoPrices {
  SOL: number | null; BTC: number | null; ETH: number | null;
  fetchedAt: number;
}

export async function fetchCryptoPrices(): Promise<CryptoPrices> {
  const key    = "crypto_prices";
  const cached = getCached<CryptoPrices>(key);
  if (cached) return cached;

  try {
    const res  = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana,bitcoin,ethereum&vs_currencies=usd",
      { next:{ revalidate:30 } }
    );
    if (!res.ok) throw new Error("CoinGecko unavailable");
    const json  = await res.json();
    const prices: CryptoPrices = {
      SOL: json?.solana?.usd    ?? null,
      BTC: json?.bitcoin?.usd   ?? null,
      ETH: json?.ethereum?.usd  ?? null,
      fetchedAt: Date.now(),
    };
    setCached(key, prices);
    return prices;
  } catch {
    return { SOL:null, BTC:null, ETH:null, fetchedAt:Date.now() };
  }
}

// ── Helius wallet asset scanner ───────────────────────────────────────────────
export interface WalletAsset {
  mint:        string;
  name:        string;
  symbol:      string;
  usdValue:    number | null;
  decimals:    number;
  amount:      number;
}

export async function fetchWalletAssets(
  walletAddress: string,
  apiKey: string
): Promise<WalletAsset[]> {
  const key    = `wallet_assets_${walletAddress}`;
  const cached = getCached<WalletAsset[]>(key);
  if (cached) return cached;

  if (!apiKey) return [];   // API key not configured — skip

  try {
    const res = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({
          jsonrpc:"2.0", id:"1", method:"searchAssets",
          params:{ ownerAddress:walletAddress, limit:50 },
        }),
      }
    );
    if (!res.ok) throw new Error(`Helius ${res.status}`);
    const json  = await res.json();
    const items = json?.result?.items ?? [];

    const assets: WalletAsset[] = items.map((item:Record<string,unknown>) => {
      type Meta = Record<string,unknown>;
      const content  = item.content  as Meta | undefined;
      const metadata = content?.metadata as Meta | undefined;
      return {
        mint:    String(item.id ?? ""),
        name:    String(metadata?.name    ?? "Unknown"),
        symbol:  String(metadata?.symbol  ?? ""),
        usdValue:null,
        decimals:0,
        amount:  0,
      };
    });
    setCached(key, assets);
    return assets;
  } catch {
    return [];
  }
}

// ── Cache inspector (for admin/debug) ─────────────────────────────────────────
export function getCacheStatus(): Record<string,{age:number;ttl:number}> {
  const status: Record<string,{age:number;ttl:number}> = {};
  CACHE.forEach((entry, key) => {
    const age = Date.now() - entry.ts;
    status[key] = { age, ttl: Math.max(0, CACHE_TTL_MS - age) };
  });
  return status;
}

export function clearCache(): void { CACHE.clear(); }