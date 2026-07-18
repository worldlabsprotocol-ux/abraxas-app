// FILE: lib/listingInventory/applyLotUpdates.ts
// Upsert lot inventory + audit events; refresh listing monitor snapshot.

import { createClient } from "@supabase/supabase-js";
import {
  loadListingSnapshots,
  saveListingSnapshots,
} from "@/lib/assetMonitoring/listingStatus/snapshotStore";
import { listingSnapshotKey } from "@/lib/assetMonitoring/listingStatus/types";
import {
  getLotInventory,
  lotStatusFingerprint,
  setMemoryLotInventory,
} from "@/lib/listingInventory/lotInventory";
import type { LotInventoryRow, LotStatusUpdate, LotUpdateResult } from "@/lib/listingInventory/types";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function sb() {
  if (!SB_URL || !SB_KEY) return null;
  return createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
}

export async function applyLotStatusUpdates(input: {
  assetId: string;
  updates: LotStatusUpdate[];
  source: string;
  partnerId?: string;
  idempotencyKey?: string;
  observedAt?: string;
}): Promise<{ results: LotUpdateResult[]; fingerprint: string; changed: boolean }> {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const current = await getLotInventory(input.assetId);
  const byLot = new Map(current.lots.map(lot => [lot.lot, { ...lot }]));
  const results: LotUpdateResult[] = [];

  for (const update of input.updates) {
    const existing = byLot.get(update.lot);
    const fromStatus = existing?.status ?? null;
    const toStatus = update.status ?? existing?.status ?? "available";

    const next: LotInventoryRow = {
      assetId: input.assetId,
      lot: update.lot,
      acres: update.acres ?? existing?.acres ?? 0,
      priceUsd: update.price_usd ?? existing?.priceUsd ?? 0,
      status: toStatus,
      notes: update.notes ?? existing?.notes,
      mlsListingId: update.mls_listing_id ?? existing?.mlsListingId,
      source: input.source,
      observedAt,
      updatedAt: observedAt,
    };

    const changed =
      !existing ||
      existing.status !== next.status ||
      existing.priceUsd !== next.priceUsd ||
      existing.notes !== next.notes;

    byLot.set(update.lot, next);
    results.push({ lot: update.lot, changed, fromStatus, toStatus, row: next });
  }

  const lots = Array.from(byLot.values()).sort((a, b) => a.lot - b.lot);
  const fingerprint = lotStatusFingerprint(lots);
  const changed = results.some(r => r.changed);

  const client = sb();
  if (client) {
    for (const result of results) {
      if (!result.changed) continue;

      const { error: upsertError } = await client.from("asset_lot_inventory").upsert(
        {
          asset_id: result.row.assetId,
          lot_number: result.row.lot,
          acres: result.row.acres,
          price_usd: result.row.priceUsd,
          status: result.row.status,
          notes: result.row.notes ?? null,
          mls_listing_id: result.row.mlsListingId ?? null,
          source: result.row.source,
          observed_at: result.row.observedAt,
          updated_at: result.row.updatedAt,
        },
        { onConflict: "asset_id,lot_number" },
      );

      if (upsertError) {
        throw new Error(`Lot upsert failed: ${upsertError.message}`);
      }

      if (result.fromStatus !== result.toStatus) {
        const eventKey = input.idempotencyKey
          ? `${input.idempotencyKey}:lot${result.lot}`
          : null;

        const { error: eventError } = await client.from("asset_lot_status_events").insert({
          asset_id: input.assetId,
          lot_number: result.lot,
          from_status: result.fromStatus,
          to_status: result.toStatus,
          source: input.source,
          detail: {
            notes: result.row.notes,
            price_usd: result.row.priceUsd,
            mls_listing_id: result.row.mlsListingId,
          },
          partner_id: input.partnerId ?? null,
          idempotency_key: eventKey,
        });

        if (eventError && eventError.code !== "23505") {
          throw new Error(`Lot event insert failed: ${eventError.message}`);
        }
      }
    }
  } else {
    setMemoryLotInventory(input.assetId, lots);
  }

  if (changed) {
    const snapshots = await loadListingSnapshots();
    const key = listingSnapshotKey(input.assetId, "mls_lot_status");
    snapshots[key] = {
      assetId: input.assetId,
      channel: "mls_lot_status",
      status: fingerprint,
      observedAt,
      detail: `${lots.filter(l => l.status === "available").length} lots available · ${lots.filter(l => l.status === "under_contract").length} under contract`,
    };
    await saveListingSnapshots(snapshots);
  }

  return { results, fingerprint, changed };
}
