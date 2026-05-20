// FILE: lib/services/riskEngine.ts
// Deterministic risk engine with live price feeds.
// Extends existing riskScoringEngine.ts — adds live price integration.
// Calls /api/prices proxy (CryptoRank → CoinGecko fallback).

import { createAdminClient } from "@/lib/supabase";
import { emitAssetEvent }    from "@/lib/services/eventService";

export interface LivePriceData {
  symbol:    string;
  price:     number;
  change24h: number;
  source:    string;
}

export interface RiskResult {
  overallScore:    number;
  liquidityScore:  number;
  volatilityScore: number;
  custodyScore:    number;
  provenanceScore: number;
  ltvCap:          number;
  riskTier:        "A" | "B" | "C" | "D";
  healthFactor:    number;
  flags:           string[];
  livePrices:      LivePriceData[];
  methodology:     string;
  scoredAt:        string;
}

// ── Live price fetch (calls our /api/prices proxy) ────────────────────────────
async function fetchLivePrices(symbols: string[]): Promise<LivePriceData[]> {
  try {
    const res = await fetch(
      `/api/prices?symbols=${symbols.join(",")}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error("price fetch failed");
    const json = await res.json();
    return json.prices ?? [];
  } catch {
    return symbols.map(s => ({ symbol:s, price:0, change24h:0, source:"unavailable" }));
  }
}

// ── Sub-scores ────────────────────────────────────────────────────────────────
function scoreProvenance(depth: number, ageDays?: number): number {
  let base = Math.min(95, depth * 18);
  if (ageDays !== undefined) {
    if (ageDays > 365) base = Math.max(0, base - 25);
    else if (ageDays > 180) base = Math.max(0, base - 12);
  }
  return Math.round(base);
}

function scoreCustody(confirmed: boolean, type?: string): number {
  if (!confirmed) return 0;
  const grade: Record<string, number> = {
    bonded_vault:96, institutional_escrow:91, bank_vault:88, certified_storage:76
  };
  return grade[type ?? "certified_storage"] ?? 70;
}

function scoreLiquidity(category: string): number {
  const map: Record<string, number> = {
    "Fine Metals":92,"Graded Card":68,"Luxury Watch":72,"Rare Comic":61,
    "Fine Spirits":55,"Collectible Automobile":50,"Fine Art":42,"Property":45,
    "Mineral Rights":30,"Tribal Land Asset":15,"Other":25,
  };
  return map[category] ?? 35;
}

function scoreVolatility(category: string, change24h?: number): number {
  const base: Record<string, number> = {
    "Fine Metals":82,"Property":72,"Luxury Watch":65,"Fine Spirits":58,
    "Collectible Automobile":55,"Fine Art":52,"Graded Card":45,"Mineral Rights":60,
  };
  let score = base[category] ?? 45;
  // Penalise if live market is volatile
  if (change24h !== undefined && Math.abs(change24h) > 5) score = Math.max(0, score - 10);
  return Math.round(score);
}

function determineTier(score: number): "A"|"B"|"C"|"D" {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "D";
}

function ltvFromScore(score: number, baseLTV: number): number {
  if (score >= 85) return baseLTV;
  if (score >= 70) return Math.round(baseLTV * 0.90);
  if (score >= 55) return Math.round(baseLTV * 0.75);
  return Math.round(baseLTV * 0.50);
}

const CLASS_BASE_LTV: Record<string, number> = {
  "Fine Metals":80,"Property":65,"Luxury Watch":65,"Rare Comic":60,
  "Graded Card":55,"Fine Spirits":55,"Mineral Rights":55,"Fine Art":50,
  "Collectible Automobile":60,"Tribal Land Asset":50,"Other":45,
};

// ── Main compute ──────────────────────────────────────────────────────────────
export async function computeRisk(params: {
  assetId:          string;
  category:         string;
  provenanceDepth:  number;
  valuationAgeDays?: number;
  custodyConfirmed: boolean;
  custodyType?:     string;
  fraudFlagCount:   number;
  jurisdiction?:    string;
}): Promise<RiskResult> {

  // Fetch live market prices in parallel
  const priceSymbols: Record<string,string[]> = {
    "Fine Metals":  ["gold","silver"],
    "Mineral Rights":["oil"],
    "Luxury Watch": ["gold"],
    "Graded Card":  ["bitcoin"],
    "Other":        ["bitcoin","solana"],
  };
  const symbols = priceSymbols[params.category] ?? ["bitcoin","solana"];
  const livePrices = await fetchLivePrices(symbols);

  const primaryChange = livePrices[0]?.change24h;
  const baseLTV       = CLASS_BASE_LTV[params.category] ?? 45;

  const liquidityScore  = scoreLiquidity(params.category);
  const volatilityScore = scoreVolatility(params.category, primaryChange);
  const custodyScore    = scoreCustody(params.custodyConfirmed, params.custodyType);
  const provenanceScore = scoreProvenance(params.provenanceDepth, params.valuationAgeDays);

  const fraudPenalty       = params.fraudFlagCount * 15;
  const jurisdictionPenalty = (params.jurisdiction === "LA_TRIBAL" || params.jurisdiction === "OK_TRIBAL") ? 5 : 0;

  const raw = (
    liquidityScore  * 0.30 +
    volatilityScore * 0.20 +
    custodyScore    * 0.30 +
    provenanceScore * 0.20
  ) - fraudPenalty - jurisdictionPenalty;

  const overallScore = Math.max(0, Math.min(100, Math.round(raw)));
  const ltvCap       = ltvFromScore(overallScore, baseLTV);
  const riskTier     = determineTier(overallScore);

  const flags: string[] = [];
  if (!params.custodyConfirmed)   flags.push("CUSTODY_UNCONFIRMED");
  if (params.fraudFlagCount > 0)  flags.push(`FRAUD_FLAGS: ${params.fraudFlagCount}`);
  if (params.provenanceDepth < 2) flags.push("SHALLOW_PROVENANCE");
  if (primaryChange !== undefined && Math.abs(primaryChange) > 5)
    flags.push(`MARKET_VOLATILITY: ${primaryChange.toFixed(1)}% 24h`);

  const result: RiskResult = {
    overallScore, liquidityScore, volatilityScore, custodyScore,
    provenanceScore, ltvCap, riskTier,
    healthFactor: params.custodyConfirmed ? 1.42 : 0,
    flags, livePrices,
    methodology: "Weighted 4-factor: liquidity(30%) custody(30%) volatility(20%) provenance(20%). Live prices from CryptoRank/CoinGecko.",
    scoredAt: new Date().toISOString(),
  };

  // Persist to Supabase if DB is available
  const db = createAdminClient();
  if (db) {
    await db.from("collateral_scores").insert({
      asset_id:         params.assetId,
      overall_score:    overallScore,
      liquidity_score:  liquidityScore,
      volatility_score: volatilityScore,
      custody_score:    custodyScore,
      provenance_score: provenanceScore,
      ltv_cap:          ltvCap,
      risk_tier:        riskTier,
      flags,
      scored_by:        "SYSTEM",
      next_review_at:   new Date(Date.now() + 90 * 86_400_000).toISOString(),
    }).then(() =>
      emitAssetEvent({ assetId:params.assetId, eventType:"RISK_SCORED", actor:"SYSTEM",
        payload:{ overallScore, riskTier, ltvCap, livePrices: livePrices.map(p=>p.symbol) } })
    );

    await db.from("assets")
      .update({ collateral_score: overallScore, ltv: ltvCap })
      .eq("id", params.assetId);
  }

  return result;
}