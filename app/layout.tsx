// FILE: lib/marketFeeds.ts
// Data abstraction layer for market feeds.
// All providers return a consistent shape with source + confidence labels.
// Replace provider implementations with real API calls when keys are available.

export interface FeedItem {
  name:       string;
  floor:      string;
  volume:     string;
  change:     string;
  positive:   boolean;
  signal:     string;
  vaultId:    string;
}

export interface FeedResult {
  items:       FeedItem[];
  source:      string;
  lastUpdated: string;
  confidence:  "live" | "reference" | "simulated";
  note:        string;
}

// ── Solana NFT Feed ───────────────────────────────────────────────────────────
// Source style: Magic Eden. Replace body with real API call when key available.
export async function solNFTFeedProvider(): Promise<FeedResult> {
  const items: FeedItem[] = [
    { name: "Mad Lads",          floor: "148 SOL",  volume: "2.1K SOL", change: "+6.2%",  positive: true,  signal: "High floor velocity — music IP signal",  vaultId: "490" },
    { name: "Tensorians",        floor: "31 SOL",   volume: "940 SOL",  change: "+3.1%",  positive: true,  signal: "Stable volume trend",                    vaultId: "490" },
    { name: "Okay Bears",        floor: "19 SOL",   volume: "680 SOL",  change: "-1.2%",  positive: false, signal: "Mild pullback — monitoring",              vaultId: "492" },
    { name: "DeGods",            floor: "11 SOL",   volume: "420 SOL",  change: "+1.8%",  positive: true,  signal: "Recovery signal — light",                vaultId: "493" },
    { name: "Famous Fox Fed",    floor: "8.4 SOL",  volume: "310 SOL",  change: "+0.9%",  positive: true,  signal: "Steady accumulation",                    vaultId: "490" },
    { name: "Claynosaurz",       floor: "5.1 SOL",  volume: "190 SOL",  change: "+4.7%",  positive: true,  signal: "Breakout — agent flagged",               vaultId: "494" },
    { name: "y00ts",             floor: "4.2 SOL",  volume: "160 SOL",  change: "-0.5%",  positive: false, signal: "Flat — no signal",                       vaultId: "491" },
    { name: "Solana Monkey Biz", floor: "72 SOL",   volume: "1.4K SOL", change: "+2.2%",  positive: true,  signal: "Blue chip baseline",                     vaultId: "490" },
    { name: "Froganas",          floor: "3.1 SOL",  volume: "88 SOL",   change: "+11.3%", positive: true,  signal: "Meme momentum — light signal",           vaultId: "490" },
    { name: "Retardio",          floor: "6.2 SOL",  volume: "240 SOL",  change: "+2.8%",  positive: true,  signal: "Community signal positive",              vaultId: "491" },
  ];
  return {
    items,
    source:      "Magic Eden style reference feed",
    lastUpdated: new Date().toISOString(),
    confidence:  "reference",
    note:        "Reference feed based on Magic Eden style market data. Live API integration pending.",
  };
}

// ── Ethereum NFT Feed ─────────────────────────────────────────────────────────
// Source style: Blur. Replace body with real API call when key available.
export async function ethNFTFeedProvider(): Promise<FeedResult> {
  const items: FeedItem[] = [
    { name: "CryptoPunks",      floor: "46 ETH",   volume: "$2.2M",  change: "+3.4%",  positive: true,  signal: "Macro bullish — ETH IP signal",   vaultId: "490" },
    { name: "Bored Ape YC",     floor: "12.1 ETH", volume: "$1.0M",  change: "-1.6%",  positive: false, signal: "Floor pressure — held",            vaultId: "492" },
    { name: "Azuki",            floor: "4.4 ETH",  volume: "$430K",  change: "+9.1%",  positive: true,  signal: "Strong momentum — IP active",      vaultId: "490" },
    { name: "Pudgy Penguins",   floor: "8.8 ETH",  volume: "$780K",  change: "+5.3%",  positive: true,  signal: "Licensing breakout",               vaultId: "491" },
    { name: "Milady",           floor: "3.9 ETH",  volume: "$290K",  change: "+14.2%", positive: true,  signal: "Viral spike — monitoring",         vaultId: "490" },
    { name: "Doodles",          floor: "1.8 ETH",  volume: "$140K",  change: "-3.1%",  positive: false, signal: "Music IP declining",               vaultId: "491" },
    { name: "CloneX",           floor: "2.1 ETH",  volume: "$180K",  change: "+1.2%",  positive: true,  signal: "IP licensing active",              vaultId: "490" },
    { name: "Moonbirds",        floor: "1.4 ETH",  volume: "$90K",   change: "-0.8%",  positive: false, signal: "Flat — no signal",                 vaultId: "492" },
    { name: "Chromie Squiggle", floor: "9.2 ETH",  volume: "$310K",  change: "+7.4%",  positive: true,  signal: "Art IP appreciation signal",       vaultId: "490" },
    { name: "Beanz",            floor: "0.9 ETH",  volume: "$72K",   change: "+3.7%",  positive: true,  signal: "Derivative signal positive",       vaultId: "490" },
  ];
  return {
    items,
    source:      "Blur style reference feed",
    lastUpdated: new Date().toISOString(),
    confidence:  "reference",
    note:        "Reference feed based on Blur style market data. Live API integration pending.",
  };
}

// ── Market context feed ───────────────────────────────────────────────────────
// Source style: CryptoRank. Replace body with real API call when key available.
export interface MarketContextItem {
  label: string; value: string; change: string; positive: boolean;
}
export async function marketContextProvider(): Promise<{ items: MarketContextItem[]; source: string; confidence: "reference" }> {
  return {
    items: [
      { label: "SOL",          value: "$145",   change: "+2.4%",  positive: true  },
      { label: "ETH",          value: "$2,840", change: "+1.1%",  positive: true  },
      { label: "BTC",          value: "$61,400",change: "+0.8%",  positive: true  },
      { label: "RWA TVL",      value: "$36B",   change: "+340%",  positive: true  },
      { label: "NFT Vol (24h)",value: "$48M",   change: "+12%",   positive: true  },
    ],
    source:     "CryptoRank style reference feed",
    confidence: "reference",
  };
}