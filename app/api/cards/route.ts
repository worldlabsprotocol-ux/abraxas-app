// FILE: app/api/cards/route.ts
// Single source of truth for asset data. Reads data/cards.json.
// Applies live price drift (deterministic, 10-min window) to simulate oracle.
// All components fetch from here — never import cards.json directly in client components.
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

function seedDrift(base: number, seed: number, range: number): number {
  const w = Math.floor(Date.now() / 600_000);
  return Math.round((base + (Math.abs(Math.sin(w * seed * 9301 + 49297)) % 1 - 0.5) * range) * 100) / 100;
}

export async function GET(req: NextRequest) {
  try {
    const raw  = readFileSync(join(process.cwd(), "data/cards.json"), "utf8");
    const data = JSON.parse(raw);
    // Apply price drift and build sparkline from history
    const assets = data.assets.map((card: any, i: number) => ({
      ...card,
      priceUsd: seedDrift(card.priceUsd, i * 1.3 + 2.1, card.priceUsd * 0.005),
      history:  card.history.map((v: number, j: number) => ({
        t: Date.now() - (card.history.length - j) * 3_600_000,
        v,
      })),
    }));
    return NextResponse.json({ ok: true, assets, updatedAt: new Date().toISOString() }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "error" }, { status: 500 });
  }
}