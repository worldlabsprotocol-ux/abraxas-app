// FILE: app/api/pokemon/featured/route.ts
import { NextResponse } from "next/server";
import { fetchFeaturedCards } from "@/lib/pokemonApi";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cards = await fetchFeaturedCards();
    return NextResponse.json({ ok: true, cards }, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=120" },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}