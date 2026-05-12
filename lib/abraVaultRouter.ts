// FILE: lib/abraVaultRouter.ts
// Routes $ABRA mint fees to the correct protocol vault PDA based on asset class.
// Main treasury receives 80%. Asset-class-specific PDA receives 20% for class-level yield.
// On-chain: SPL transfer from user wallet → vault. Off-chain: DB records the routing.

import { supabase } from "@/lib/supabaseClient";

// ─── Protocol vault addresses (from on-chain deployment) ────────────────────
export const VAULTS = {
  MAIN:        "63LGWS2JSK5CawZt6iPchVU6wj63v3DtsTR1jaRnjMaY", // primary treasury
  WATCHES:     "CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf", // PDA 490
  SPIRITS:     "CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk", // PDA 491
  CARDS:       "8bBxipDGxTL3B84RSuwxwVysAKreStoHbJKTSHpqfT58", // PDA 492
  METALS:      "Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf", // PDA 493
  COLLECTIBLES:"HeFqPHNCTgZ68fxaGgJes9af16W63mg7UbZUy5LScwZq",  // PDA 494
} as const;

// Asset class → vault PDA mapping
const CLASS_TO_VAULT: Record<string, string> = {
  "Watches":       VAULTS.WATCHES,
  "Spirits":       VAULTS.SPIRITS,
  "Cards (PSA/BGS)":VAULTS.CARDS,
  "Comics (CGC)":  VAULTS.COLLECTIBLES,
  "Racehorses":    VAULTS.COLLECTIBLES,
  "Metals":        VAULTS.METALS,
  "Art":           VAULTS.COLLECTIBLES,
  "Stocks":        VAULTS.MAIN,
  "Other":         VAULTS.MAIN,
};

export interface VaultAllocation {
  mainVault:    { address: string; amount: number; pct: number };
  classVault:   { address: string; amount: number; pct: number };
  total:        number;
  assetClass:   string;
}

// ─── Calculate split: 80% main, 20% asset-class PDA ─────────────────────────
export function calcVaultAllocation(assetClass: string, totalAbra: number): VaultAllocation {
  const classVaultAddr = CLASS_TO_VAULT[assetClass] ?? VAULTS.MAIN;
  const isSameVault    = classVaultAddr === VAULTS.MAIN;

  const mainAmt  = isSameVault ? totalAbra : Math.floor(totalAbra * 0.8);
  const classAmt = isSameVault ? 0         : totalAbra - mainAmt;

  return {
    mainVault:  { address: VAULTS.MAIN,       amount: mainAmt,  pct: isSameVault ? 100 : 80 },
    classVault: { address: classVaultAddr,     amount: classAmt, pct: isSameVault ? 0   : 20 },
    total:      totalAbra,
    assetClass,
  };
}

// ─── Record vault routing in DB (off-chain ledger for every mint fee) ────────
export async function recordVaultRouting(params: {
  wallet:    string;
  assetId:   string;
  assetClass:string;
  totalAbra: number;
  txSignature:string;
}): Promise<void> {
  if (!supabase) return; // demo mode — routing tracked in Zustand only

  const alloc = calcVaultAllocation(params.assetClass, params.totalAbra);

  const rows = [
    {
      wallet:        params.wallet,
      type:          "vault_route",
      amount_abra:   alloc.mainVault.amount,
      asset_id:      params.assetId,
      tx_signature:  params.txSignature,
      status:        "confirmed",
      vault_address: alloc.mainVault.address,
      vault_label:   "main_treasury",
    },
  ];

  if (alloc.classVault.amount > 0) {
    rows.push({
      wallet:        params.wallet,
      type:          "vault_route",
      amount_abra:   alloc.classVault.amount,
      asset_id:      params.assetId,
      tx_signature:  params.txSignature,
      status:        "confirmed",
      vault_address: alloc.classVault.address,
      vault_label:   `class_${params.assetClass.toLowerCase().replace(/[^a-z]/g,"_")}`,
    });
  }

  await supabase.from("vault_routes").insert(rows);
}

// ─── DB view query helpers ────────────────────────────────────────────────────
export async function getVaultBalance(vaultAddress: string): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase
    .from("vault_routes")
    .select("amount_abra")
    .eq("vault_address", vaultAddress)
    .eq("status", "confirmed");
  return (data ?? []).reduce((s, r) => s + (r.amount_abra ?? 0), 0);
}

export async function getAllVaultBalances(): Promise<Record<string,number>> {
  const result: Record<string,number> = {};
  await Promise.all(
    Object.entries(VAULTS).map(async ([label, addr]) => {
      result[label] = await getVaultBalance(addr);
    })
  );
  return result;
}