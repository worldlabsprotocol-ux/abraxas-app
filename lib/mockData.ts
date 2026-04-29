import { VAULT_WALLETS } from "@/lib/constants";

export type VaultStatus = "operating" | "paused" | "graduating";

export interface Vault {
  id: string;
  name: string;
  status: VaultStatus;
  assetClass: string;
  tvl: number;
  lifetimePnl: number;
  yieldYTD: number;
  inceptionDate: string;
  agentId: string;
  actionsExecuted: number;
  defenseEvents: number;
  unrecovered: 0;
  description: string;
  walletAddress: string;
  solscanUrl: string;
  shortAddress: string;
}

export interface Agent {
  id: string;
  name: string;
  status: "online" | "offline";
  uptimePct: number;
  vaultsOperated: number;
  actionsExecuted: number;
  lastAction: string;
}

export interface DefenseEvent {
  id: string;
  timestamp: string;
  vaultId: string;
  trigger: string;
  action: string;
  capitalPreserved: number;
}

export const mockVaults: Vault[] = [
  {
    id: "490", name: "VAULT-490", status: "operating",
    assetClass: "Music & IP Royalties", tvl: 142_300,
    lifetimePnl: 18_240, yieldYTD: 12.8,
    inceptionDate: "2026-02-14", agentId: "001",
    actionsExecuted: 8421, defenseEvents: 14, unrecovered: 0,
    description: "Music IP royalty stream. Agent rebalances across catalogs based on streaming volume and licensing pipeline.",
    walletAddress:  VAULT_WALLETS["490"].address,
    solscanUrl:     VAULT_WALLETS["490"].solscan,
    shortAddress:   VAULT_WALLETS["490"].shortAddress,
  },
  {
    id: "491", name: "VAULT-491", status: "operating",
    assetClass: "Music & IP Royalties", tvl: 88_400,
    lifetimePnl: 9_120, yieldYTD: 11.4,
    inceptionDate: "2026-02-22", agentId: "002",
    actionsExecuted: 5102, defenseEvents: 8, unrecovered: 0,
    description: "Independent label royalties. Agent manages monthly distribution flows and hedges against streaming platform risk.",
    walletAddress:  VAULT_WALLETS["491"].address,
    solscanUrl:     VAULT_WALLETS["491"].solscan,
    shortAddress:   VAULT_WALLETS["491"].shortAddress,
  },
  {
    id: "492", name: "VAULT-492", status: "operating",
    assetClass: "Real Estate", tvl: 320_000,
    lifetimePnl: 12_480, yieldYTD: 6.2,
    inceptionDate: "2026-03-01", agentId: "003",
    actionsExecuted: 1840, defenseEvents: 3, unrecovered: 0,
    description: "Commercial real estate position. Agent manages rent flows, vacancy hedging, and reinvestment timing.",
    walletAddress:  VAULT_WALLETS["492"].address,
    solscanUrl:     VAULT_WALLETS["492"].solscan,
    shortAddress:   VAULT_WALLETS["492"].shortAddress,
  },
  {
    id: "493", name: "VAULT-493", status: "operating",
    assetClass: "Receivables", tvl: 64_200,
    lifetimePnl: 4_810, yieldYTD: 9.1,
    inceptionDate: "2026-03-08", agentId: "004",
    actionsExecuted: 2210, defenseEvents: 5, unrecovered: 0,
    description: "Invoice financing pool. Agent prices counterparty risk continuously and rotates on creditworthiness shifts.",
    walletAddress:  VAULT_WALLETS["493"].address,
    solscanUrl:     VAULT_WALLETS["493"].solscan,
    shortAddress:   VAULT_WALLETS["493"].shortAddress,
  },
  {
    id: "494", name: "VAULT-494", status: "graduating",
    assetClass: "Music & IP Royalties", tvl: 28_900,
    lifetimePnl: 1_240, yieldYTD: 8.6,
    inceptionDate: "2026-04-02", agentId: "005",
    actionsExecuted: 612, defenseEvents: 1, unrecovered: 0,
    description: "Indie artist catalog vault. Graduating from initial bonding period to full autonomous operation.",
    walletAddress:  VAULT_WALLETS["494"].address,
    solscanUrl:     VAULT_WALLETS["494"].solscan,
    shortAddress:   VAULT_WALLETS["494"].shortAddress,
  },
];

export const mockAgents: Agent[] = [
  { id: "001", name: "AGENT-001", status: "online", uptimePct: 99.97, vaultsOperated: 1, actionsExecuted: 8421, lastAction: "Rebalanced position" },
  { id: "002", name: "AGENT-002", status: "online", uptimePct: 99.94, vaultsOperated: 1, actionsExecuted: 5102, lastAction: "Distribution claimed" },
  { id: "003", name: "AGENT-003", status: "online", uptimePct: 99.99, vaultsOperated: 1, actionsExecuted: 1840, lastAction: "Reinvestment executed" },
  { id: "004", name: "AGENT-004", status: "online", uptimePct: 99.92, vaultsOperated: 1, actionsExecuted: 2210, lastAction: "Position rotated" },
  { id: "005", name: "AGENT-005", status: "online", uptimePct: 99.88, vaultsOperated: 1, actionsExecuted: 612,  lastAction: "Position opened" },
];

export const mockDefenseEvents: DefenseEvent[] = [
  { id: "d1", timestamp: "2026-04-27 14:22:08 UTC", vaultId: "490", trigger: "Volatility threshold exceeded",     action: "Position reduced 18%",               capitalPreserved: 42_180 },
  { id: "d2", timestamp: "2026-04-26 22:11:33 UTC", vaultId: "493", trigger: "Counterparty risk delta",           action: "Position rotated to lower-risk pool", capitalPreserved: 8_400  },
  { id: "d3", timestamp: "2026-04-26 04:18:01 UTC", vaultId: "491", trigger: "Streaming volume drawdown",         action: "Hedge ratio increased to 0.4",        capitalPreserved: 3_120  },
  { id: "d4", timestamp: "2026-04-25 19:44:27 UTC", vaultId: "490", trigger: "Strategy parameter deviation",      action: "Position halted, review queued",      capitalPreserved: 11_900 },
  { id: "d5", timestamp: "2026-04-25 11:02:14 UTC", vaultId: "492", trigger: "Liquidity threshold",               action: "Reserve buffer increased",            capitalPreserved: 6_780  },
];

export const systemStats = {
  totalAUM:             643_800,
  totalActions:         18_185,
  totalDefenseEvents:   1_247,
  unrecoveredPositions: 0,
  uptimePct:            99.97,
  agentsOnline:         5,
  vaultsActive:         5,
};

export const systemMeta = systemStats;

export const assetCategories = [
  "Music & IP Royalties",
  "Real Estate",
  "Equipment & Machinery",
  "Receivables / Invoices",
  "Collectibles & Art",
  "Treasury Assets",
];