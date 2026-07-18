// FILE: lib/listingInventory/lotInventory.ts
// Read lot inventory from Supabase with static fallback.

import { createClient } from "@supabase/supabase-js";
import { getStaticLotInventory } from "@/lib/listingInventory/staticLots";
import type { LotInventoryResponse, LotInventoryRow } from "@/lib/listingInventory/types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let memoryInventory = new Map<string, LotInventoryRow[]>();

function sb() {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

function mapRow(row: Record<string, unknown>): LotInventoryRow {
  return {
    assetId: row.asset_id as string,
    lot: row.lot_number as number,
    acres: Number(row.acres ?? 0),
    priceUsd: Number(row.price_usd ?? 0),
    status: row.status as LotInventoryRow["status"],
    notes: (row.notes as string | null) ?? undefined,
    mlsListingId: (row.mls_listing_id as string | null) ?? undefined,
    source: row.source as string,
    observedAt: row.observed_at as string,
    updatedAt: row.updated_at as string,
  };
}

function summarize(lots: LotInventoryRow[]) {
  return {
    available: lots.filter(l => l.status === "available").length,
    underContract: lots.filter(l => l.status === "under_contract").length,
    contingent: lots.filter(l => l.status === "contingent").length,
    sold: lots.filter(l => l.status === "sold").length,
  };
}

export function resetLotInventoryForTests(): void {
  memoryInventory = new Map();
}

export function lotStatusFingerprint(lots: LotInventoryRow[]): string {
  return [...lots]
    .sort((a, b) => a.lot - b.lot)
    .map(lot => `${lot.lot}:${lot.status}`)
    .join("|");
}

export async function getLotInventory(assetId: string): Promise<LotInventoryResponse> {
  const client = sb();
  const asOf = new Date().toISOString();

  if (!client) {
    const memory = memoryInventory.get(assetId);
    const lots = memory?.length ? memory : getStaticLotInventory(assetId);
    return {
      assetId,
      lots,
      source: memory?.length ? "database" : "static_fallback",
      asOf,
      summary: summarize(lots),
    };
  }

  const { data, error } = await client
    .from("asset_lot_inventory")
    .select("*")
    .eq("asset_id", assetId)
    .order("lot_number", { ascending: true });

  if (error) {
    console.warn("getLotInventory:", error.message);
    const lots = getStaticLotInventory(assetId);
    return { assetId, lots, source: "static_fallback", asOf, summary: summarize(lots) };
  }

  if (!data?.length) {
    const lots = getStaticLotInventory(assetId);
    return { assetId, lots, source: "static_fallback", asOf, summary: summarize(lots) };
  }

  const lots = data.map(row => mapRow(row as Record<string, unknown>));
  memoryInventory.set(assetId, lots);
  return { assetId, lots, source: "database", asOf, summary: summarize(lots) };
}

export async function getLotStatusEvents(assetId: string, limit = 20) {
  const client = sb();
  if (!client) return [];

  const { data, error } = await client
    .from("asset_lot_status_events")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("getLotStatusEvents:", error.message);
    return [];
  }

  return data ?? [];
}

export function setMemoryLotInventory(assetId: string, lots: LotInventoryRow[]): void {
  memoryInventory.set(assetId, lots);
}
