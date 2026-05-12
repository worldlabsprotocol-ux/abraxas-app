// FILE: lib/assetStateMachine.ts
// Deterministic event-driven state machine for asset lifecycle.
// EVENTS drive state. STATE drives UI. UI never drives state.

import { supabase } from "@/lib/supabaseClient";

export type AssetStatus =
  | "created"
  | "pending_verification"
  | "verified"
  | "listed"
  | "collateralized"
  | "borrowed"
  | "closed";

export type AssetEvent =
  | "ASSET_TOKENIZED"
  | "ASSET_VERIFIED"
  | "ASSET_LISTED"
  | "POSITION_CREATED"
  | "COLLATERAL_ACTIVE";

// ─── Pure transition function — no side effects ───────────────────────────────
export function transition(currentStatus: AssetStatus, event: AssetEvent): AssetStatus {
  switch (event) {
    case "ASSET_TOKENIZED": return "pending_verification";
    case "ASSET_VERIFIED":  return "listed";
    case "ASSET_LISTED":    return "listed";
    case "POSITION_CREATED":return "collateralized";
    case "COLLATERAL_ACTIVE":return "collateralized";
    default:                return currentStatus;
  }
}

// ─── Event processor — updates DB + cascades ─────────────────────────────────
export async function processEvent(
  event: AssetEvent,
  assetId: string,
  wallet: string,
  payload?: Record<string, unknown>
): Promise<void> {
  if (!supabase) {
    // Demo mode: state machine runs in Zustand store
    return;
  }

  // 1. Determine next status
  const { data: current } = await supabase
    .from("assets").select("status").eq("id", assetId).single();
  const nextStatus = current ? transition(current.status as AssetStatus, event) : "pending_verification";

  // 2. Update asset status
  await supabase.from("assets")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", assetId);

  // 3. Record event
  await supabase.from("events").insert({
    type: event, asset_id: assetId, wallet, payload: payload ?? {},
  });

  // 4. Cascade: if listed → create position record
  if (nextStatus === "listed") {
    const { data: asset } = await supabase
      .from("assets").select("price_usd, ltv, owner_wallet").eq("id", assetId).single();
    if (asset) {
      await supabase.from("positions").upsert({
        asset_id:      assetId,
        wallet:        asset.owner_wallet,
        position_type: "collateral",
        ltv_ratio:     asset.ltv ?? 55,
        exposure:      Math.round((asset.price_usd ?? 0) * (asset.ltv ?? 55) / 100),
      });
    }
  }
}

// ─── Verify and list an asset (admin/backend trigger) ─────────────────────────
export async function verifyAndListAsset(assetId: string, adminWallet: string): Promise<void> {
  await processEvent("ASSET_VERIFIED", assetId, adminWallet);
}