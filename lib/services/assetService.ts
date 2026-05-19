// FILE: lib/services/assetService.ts
// Real Supabase integration layer — single import point for all asset operations.
// All reads go through this service. Never query Supabase directly from components.
import { createAdminClient, supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────
export interface AssetIntelligenceRecord {
  id:                  string;
  title:               string;
  category:            string;
  owner_wallet:        string;
  declared_value_usd:  number;
  verification_status: string;
  collateral_score:    number | null;
  fraud_risk_score:    number;
  active_flag_count:   number;
  ltv:                 number;
  mint_cost_abra:      number;
  submitted_at:        string;
  verified_at:         string | null;
  current_verification_status?: string;
  confidence_score?:   number;
  risk_score?:         number;
  custody_status?:     string;
  facility_location?:  string;
  certificate_id?:     string;
  latest_collateral_score?: number;
  certificate_issued_at?: string;
  interest_type?:      string;
  reserve_category?:   string;
}

export interface AssetTimelineEvent {
  id:         string;
  event_type: string;
  actor:      string;
  actor_name: string | null;
  payload:    Record<string, unknown>;
  tx_hash:    string | null;
  created_at: string;
}

// ── Read: all assets for a wallet ─────────────────────────────
export async function getWalletAssets(
  wallet: string
): Promise<AssetIntelligenceRecord[]> {
  const db = supabase ?? createAdminClient();
  if (!db) return [];

  const { data, error } = await db
    .from("asset_intelligence_view")
    .select("*")
    .eq("owner_wallet", wallet)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("getWalletAssets:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Read: single asset with full intelligence ──────────────────
export async function getAssetIntelligence(
  assetId: string
): Promise<Record<string, unknown> | null> {
  const db = createAdminClient();
  if (!db) return null;

  const { data, error } = await db.rpc("get_asset_intelligence", {
    p_asset_id: assetId,
  });

  if (error) {
    console.error("getAssetIntelligence:", error.message);
    return null;
  }
  return data;
}

// ── Read: event timeline ───────────────────────────────────────
export async function getAssetTimeline(
  assetId: string
): Promise<AssetTimelineEvent[]> {
  const db = createAdminClient();
  if (!db) return [];

  const { data, error } = await db.rpc("get_asset_timeline", {
    p_asset_id: assetId,
  });

  if (error) {
    console.error("getAssetTimeline:", error.message);
    return [];
  }
  return data ?? [];
}

// ── Write: create asset ────────────────────────────────────────
export async function createAsset(params: {
  title:       string;
  category:    string;
  ownerWallet: string;
  declaredValueUsd: number;
  mintCostAbra: number;
  description?: string;
  primaryImageUrl?: string;
}): Promise<string | null> {
  const db = createAdminClient();
  if (!db) return null;

  const { data, error } = await db
    .from("assets")
    .insert({
      title:              params.title,
      category:           params.category,
      owner_wallet:       params.ownerWallet,
      declared_value_usd: params.declaredValueUsd,
      mint_cost_abra:     params.mintCostAbra,
      description:        params.description,
      primary_image_url:  params.primaryImageUrl,
      verification_status:"submitted",
    })
    .select("id")
    .single();

  if (error) {
    console.error("createAsset:", error.message);
    return null;
  }
  return data?.id ?? null;
}

// ── Write: sync mint result to Supabase ───────────────────────
export async function syncMintResult(params: {
  assetId:      string;
  tokenMint?:   string;
  mintTx?:      string;
  metadataUri?: string;
}): Promise<boolean> {
  const db = createAdminClient();
  if (!db) return false;

  const { error } = await db
    .from("assets")
    .update({
      token_mint:   params.tokenMint,
      mint_tx:      params.mintTx,
      metadata_uri: params.metadataUri,
      minted_at:    new Date().toISOString(),
    })
    .eq("id", params.assetId);

  return !error;
}

// ── Read: verify certificate (public) ─────────────────────────
export async function verifyCertificate(
  certificateId: string
): Promise<Record<string, unknown> | null> {
  const db = createAdminClient();
  if (!db) {
    // Fall back to anon client for public endpoint
    const anonDb = supabase;
    if (!anonDb) return null;
    const { data } = await anonDb.rpc("verify_certificate", {
      p_certificate_id: certificateId,
    });
    return data;
  }
  const { data, error } = await db.rpc("verify_certificate", {
    p_certificate_id: certificateId,
  });
  if (error) return null;
  return data;
}