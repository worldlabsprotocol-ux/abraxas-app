// FILE: lib/appData.ts
// Single source of truth. Every page reads from here.

export interface VaultRow {
    id: string;
    name: string;
    asset: string;
    apy: number;
    tvl: number;
    agent: string;
    walletAddress: string;
    solscanUrl: string;
    shortAddress: string;
    status: "operating" | "graduating" | "paused";
    inceptionDate: string;
  }
  
  export const VAULTS: VaultRow[] = [
    {
      id: "490", name: "VAULT-490", asset: "Music & IP Royalties",
      apy: 12.8, tvl: 142_300, agent: "AGENT-001 · VAULT-490",
      walletAddress: "CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
      solscanUrl: "https://solscan.io/account/CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
      shortAddress: "CQ1UzR…dJGdf",
      status: "operating", inceptionDate: "2026-02-14",
    },
    {
      id: "491", name: "VAULT-491", asset: "Music & IP Royalties",
      apy: 11.4, tvl: 88_400, agent: "AGENT-002 · VAULT-491",
      walletAddress: "CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
      solscanUrl: "https://solscan.io/account/CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
      shortAddress: "CmWVgy…tdDk",
      status: "operating", inceptionDate: "2026-02-22",
    },
    {
      id: "492", name: "VAULT-492", asset: "Real Estate",
      apy: 6.2, tvl: 320_000, agent: "AGENT-003 · VAULT-492",
      walletAddress: "8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58",
      solscanUrl: "https://solscan.io/account/8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58",
      shortAddress: "8bBxip…fT58",
      status: "operating", inceptionDate: "2026-03-01",
    },
    {
      id: "493", name: "VAULT-493", asset: "Receivables",
      apy: 9.1, tvl: 64_200, agent: "AGENT-004 · VAULT-493",
      walletAddress: "Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
      solscanUrl: "https://solscan.io/account/Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
      shortAddress: "Db6RHG…TFf",
      status: "operating", inceptionDate: "2026-03-15",
    },
    {
      id: "494", name: "VAULT-494", asset: "Music & IP Royalties",
      apy: 8.6, tvl: 28_900, agent: "AGENT-005 · VAULT-494",
      walletAddress: "HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq",
      solscanUrl: "https://solscan.io/account/HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq",
      shortAddress: "HeFqPH…wZq",
      status: "graduating", inceptionDate: "2026-04-02",
    },
  ];
  
  // Total AUM = sum of vault TVLs. No multiplier. No fake numbers.
  export const TOTAL_AUM = VAULTS.reduce((s, v) => s + v.tvl, 0);
  export const ACTIVE_VAULTS = VAULTS.filter((v) => v.status !== "paused").length;
  export const AGENTS_ONLINE = VAULTS.length;
  
  export const ABRA = {
    ca:          "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
    caShort:     "5c1FHZ…BAGS",
    ticker:      "$ABRA",
    solscan:     "https://solscan.io/token/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
    bags:        "https://bags.fm/$WORLDLABSPROTOCOL-UX",
    dexscreener: "https://dexscreener.com/solana/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  } as const;
  
  export const ASSET_TYPES = [
    {
      key: "music", icon: "♪", name: "Music & IP Royalties",
      desc: "Catalog earnings sit 30–90 days before reaching you. Abraxas operates them in between.",
      apy: 12.8, vaultId: "490",
    },
    {
      key: "realestate", icon: "◻", name: "Real Estate",
      desc: "Rent flows idle between cycles. Agents capture and reinvest each distribution.",
      apy: 6.2, vaultId: "492",
    },
    {
      key: "receivables", icon: "◈", name: "Receivables",
      desc: "Outstanding invoices are capital. Agents finance and rotate on credit risk.",
      apy: 9.1, vaultId: "493",
    },
  ];
  
  export function fmtUSD(n: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(n);
  }
  
  export function fmtNum(n: number): string {
    return new Intl.NumberFormat("en-US").format(n);
  }