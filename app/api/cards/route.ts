// FILE: app/api/cards/route.ts
// Single source of truth endpoint — reads data/inventory.json (33 verified assets).
// Applies per-minute price drift to simulate live oracle without external calls.
// /api/cards?category=Pokemon  filters by category
// /api/cards?id=luffy-gol-bgs10  returns single asset

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

function seedDrift(base: number, seed: number, range: number): number {
  const w = Math.floor(Date.now() / 600_000); // 10-min window
  return Math.round((base + (Math.abs(Math.sin(w * seed * 9301 + 49297)) % 1 - 0.5) * range) * 100) / 100;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get("category");
    const singleId = searchParams.get("id");

    const raw  = readFileSync(join(process.cwd(), "data/inventory.json"), "utf8");
    const data = JSON.parse(raw);

    let assets = data.assets as any[];

    // Apply optional category filter
    if (category) {
      assets = assets.filter((a: any) =>
        a.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply live price drift + build history as PricePoint[]
    assets = assets.map((card: any, i: number) => ({
      ...card,
      priceUsd: seedDrift(card.priceUsd, i * 1.3 + 2.1, card.priceUsd * 0.004),
      history: (card.history as number[]).map((v: number, j: number) => ({
        t: Date.now() - ((card.history as number[]).length - j) * 3_600_000,
        v,
      })),
    }));

    // Single asset lookup
    if (singleId) {
      const asset = assets.find((a: any) => a.id === singleId);
      if (!asset) {
        return NextResponse.json({ ok: false, error: "Asset not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, asset }, {
        headers: { "Cache-Control": "public, s-maxage=30" },
      });
    }

    return NextResponse.json(
      { ok: true, assets, total: assets.length, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "error" },
      { status: 500 }
    );
  }
}