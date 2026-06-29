// FILE: lib/appData.ts
// Single source of truth. Every page reads from here. No other vault/AUM data sources.

export interface VaultRow {
  id:           string;
  name:         string;
  asset:        string;
  apy:          number;
  tvl:          number;
  agent:        string;
  walletAddress:string;
  solscanUrl:   string;
  shortAddress: string;
  status:       "operating" | "graduating" | "paused";
  inceptionDate:string;
  howItEarns:   string;
}

export const VAULTS: VaultRow[] = [
  { id: "490", name: "VAULT-490", asset: "Music & IP Royalties", apy: 12.8, tvl: 142_300, agent: "AGENT-001", walletAddress: "CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf", solscanUrl: "https://solscan.io/account/CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf", shortAddress: "CQ1UzR…dJGdf", status: "operating", inceptionDate: "2026-02-14", howItEarns: "Royalties arrive over time. Vault compounds them between distribution windows." },
  { id: "491", name: "VAULT-491", asset: "Music & IP Royalties", apy: 11.4, tvl: 88_400,  agent: "AGENT-002", walletAddress: "CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk", solscanUrl: "https://solscan.io/account/CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk", shortAddress: "CmWVgy…tdDk", status: "operating", inceptionDate: "2026-02-22", howItEarns: "Label royalties flow monthly. Agent captures each cycle and reinvests immediately." },
  { id: "492", name: "VAULT-492", asset: "Real Estate",          apy: 6.2,  tvl: 320_000, agent: "AGENT-003", walletAddress: "8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58", solscanUrl: "https://solscan.io/account/8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58", shortAddress: "8bBxip…fT58", status: "operating", inceptionDate: "2026-03-01", howItEarns: "Rental income flows monthly. Agent optimizes deployment between rent cycles." },
  { id: "493", name: "VAULT-493", asset: "Receivables",          apy: 9.1,  tvl: 64_200,  agent: "AGENT-004", walletAddress: "Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf", solscanUrl: "https://solscan.io/account/Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf", shortAddress: "Db6RHG…TFf", status: "operating", inceptionDate: "2026-03-15", howItEarns: "Outstanding invoices are capital. Agent finances them and collects on settlement." },
  { id: "494", name: "VAULT-494", asset: "Music & IP Royalties", apy: 8.6,  tvl: 28_900,  agent: "AGENT-005", walletAddress: "HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq", solscanUrl: "https://solscan.io/account/HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq", shortAddress: "HeFqPH…wZq", status: "graduating", inceptionDate: "2026-04-02", howItEarns: "Catalog IP generates recurring royalties. Vault deploys capital between cycles." },
];

export const TOTAL_AUM     = VAULTS.reduce((s, v) => s + v.tvl, 0);
export const ACTIVE_VAULTS = VAULTS.filter((v) => v.status !== "paused").length;
export const AGENTS_ONLINE = VAULTS.length;

export const ABRA = {
  ca:      "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  ticker:  "$ABRA",
  solscan: "https://solscan.io/token/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
  bags:    "https://bags.fm/$WORLDLABSPROTOCOL-UX",
  jup:     "https://jup.ag/swap/SOL-5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS",
} as const;

export const ASSET_TYPES = [
  { key: "music",       icon: "♪", name: "Music & IP Royalties", howItEarns: "Royalties arrive over time. Vault compounds them between windows.", apy: 12.8, vaultId: "490" },
  { key: "realestate",  icon: "◻", name: "Real Estate",          howItEarns: "Rental income flows monthly. Agents optimize yield between cycles.", apy: 6.2,  vaultId: "492" },
  { key: "receivables", icon: "◈", name: "Receivables",          howItEarns: "Outstanding invoices become capital. Agent finances and collects.",  apy: 9.1,  vaultId: "493" },
  { key: "abrasound",   icon: "◎", name: "abraSOUND",            howItEarns: "Permissionless music IP yield pool. Deposit any amount, earn daily.", apy: 12.8, vaultId: "490" },
  { key: "abrayield",   icon: "⬡", name: "abraYIELD",            howItEarns: "Diversified RWA pool. Capital spread across verified assets and collateral-backed lending.", apy: 9.4,  vaultId: "493" },
];

export interface NFTCollection {
  name: string; floor: string; volume: string; change: string;
  positive: boolean; chain: "SOL" | "ETH" | "IP";
  signal: string; vaultId: string; source: string;
}

// Reference feed — Magic Eden / Blur style data. Not live API. Integration pending.
export const NFT_COLLECTIONS: NFTCollection[] = [
  { name: "Mad Lads",          floor: "148 SOL",  volume: "2.1K SOL", change: "+6.2%",  positive: true,  chain: "SOL", signal: "High floor velocity",         vaultId: "490", source: "Magic Eden ref" },
  { name: "Tensorians",        floor: "31 SOL",   volume: "940 SOL",  change: "+3.1%",  positive: true,  chain: "SOL", signal: "Stable volume trend",          vaultId: "490", source: "Magic Eden ref" },
  { name: "Okay Bears",        floor: "19 SOL",   volume: "680 SOL",  change: "-1.2%",  positive: false, chain: "SOL", signal: "Mild pullback — watching",     vaultId: "492", source: "Magic Eden ref" },
  { name: "DeGods",            floor: "11 SOL",   volume: "420 SOL",  change: "+1.8%",  positive: true,  chain: "SOL", signal: "Recovery signal",              vaultId: "493", source: "Magic Eden ref" },
  { name: "Famous Fox Fed",    floor: "8.4 SOL",  volume: "310 SOL",  change: "+0.9%",  positive: true,  chain: "SOL", signal: "Steady accumulation",          vaultId: "490", source: "Magic Eden ref" },
  { name: "Claynosaurz",       floor: "5.1 SOL",  volume: "190 SOL",  change: "+4.7%",  positive: true,  chain: "SOL", signal: "Breakout — flagged",           vaultId: "494", source: "Magic Eden ref" },
  { name: "y00ts",             floor: "4.2 SOL",  volume: "160 SOL",  change: "-0.5%",  positive: false, chain: "SOL", signal: "Flat — no signal",             vaultId: "491", source: "Magic Eden ref" },
  { name: "Solana Monkey Biz", floor: "72 SOL",   volume: "1.4K SOL", change: "+2.2%",  positive: true,  chain: "SOL", signal: "Blue chip baseline",           vaultId: "490", source: "Magic Eden ref" },
  { name: "Froganas",          floor: "3.1 SOL",  volume: "88 SOL",   change: "+11.3%", positive: true,  chain: "SOL", signal: "Meme momentum — light",        vaultId: "490", source: "Magic Eden ref" },
  { name: "Retardio",          floor: "6.2 SOL",  volume: "240 SOL",  change: "+2.8%",  positive: true,  chain: "SOL", signal: "Community signal positive",    vaultId: "491", source: "Magic Eden ref" },
  { name: "CryptoPunks",       floor: "46 ETH",   volume: "$2.2M",    change: "+3.4%",  positive: true,  chain: "ETH", signal: "Macro bullish — ETH IP",       vaultId: "490", source: "Blur ref" },
  { name: "Bored Ape YC",      floor: "12.1 ETH", volume: "$1.0M",    change: "-1.6%",  positive: false, chain: "ETH", signal: "Floor pressure — held",        vaultId: "492", source: "Blur ref" },
  { name: "Azuki",             floor: "4.4 ETH",  volume: "$430K",    change: "+9.1%",  positive: true,  chain: "ETH", signal: "Strong momentum — IP active",  vaultId: "490", source: "Blur ref" },
  { name: "Pudgy Penguins",    floor: "8.8 ETH",  volume: "$780K",    change: "+5.3%",  positive: true,  chain: "ETH", signal: "Licensing breakout",           vaultId: "491", source: "Blur ref" },
  { name: "Milady",            floor: "3.9 ETH",  volume: "$290K",    change: "+14.2%", positive: true,  chain: "ETH", signal: "Viral spike — monitoring",     vaultId: "490", source: "Blur ref" },
  { name: "Doodles",           floor: "1.8 ETH",  volume: "$140K",    change: "-3.1%",  positive: false, chain: "ETH", signal: "Music IP declining",           vaultId: "491", source: "Blur ref" },
  { name: "CloneX",            floor: "2.1 ETH",  volume: "$180K",    change: "+1.2%",  positive: true,  chain: "ETH", signal: "IP licensing active",          vaultId: "490", source: "Blur ref" },
  { name: "Moonbirds",         floor: "1.4 ETH",  volume: "$90K",     change: "-0.8%",  positive: false, chain: "ETH", signal: "Flat — no signal",             vaultId: "492", source: "Blur ref" },
  { name: "Chromie Squiggle",  floor: "9.2 ETH",  volume: "$310K",    change: "+7.4%",  positive: true,  chain: "ETH", signal: "Art IP appreciation",          vaultId: "490", source: "Blur ref" },
  { name: "Aria IP Vault",     floor: "—",        volume: "$110M TVL", change: "+IP",   positive: true,  chain: "IP",  signal: "Active IP licensing",          vaultId: "490", source: "Protocol ref" },
  { name: "Story Protocol",    floor: "—",        volume: "$240M TVL", change: "+RWA",  positive: true,  chain: "IP",  signal: "IP infrastructure expanding",  vaultId: "490", source: "Protocol ref" },
  { name: "Ondo RWA",          floor: "—",        volume: "$800M TVL", change: "+8.1%", positive: true,  chain: "IP",  signal: "TradFi yield onchain",         vaultId: "493", source: "Protocol ref" },
  { name: "Maple Finance",     floor: "—",        volume: "$1.2B TVL", change: "+12%",  positive: true,  chain: "IP",  signal: "Receivables market expanding", vaultId: "493", source: "Protocol ref" },
];

export function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}
export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}