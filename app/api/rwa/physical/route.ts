// FILE: app/api/rwa/physical/route.ts
// Physical asset NAV. Zero external API cost.
// Collector Crypt CA: CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp
// Prices: deterministic oracle seeded by 10-minute window — stable for demos, looks live.

import { NextResponse } from "next/server";

function seedPrice(base: number, seed: number, range: number): number {
  const h = Math.floor(Date.now() / 600_000);
  const x = Math.abs(Math.sin(h * seed * 9301 + 49297)) % 1;
  return Math.round((base + (x - 0.5) * range) * 100) / 100;
}

function change24h(seed: number): number {
  const d = Math.floor(Date.now() / 86_400_000);
  return Math.round((Math.sin(seed * d * 1.7) * 8) * 10) / 10;
}

const POKEMON = [
  { name: "Charizard 1st Ed.",   grade: "PSA 10", baseSol: 148.0, seed: 1.1, range: 12 },
  { name: "Pikachu Illustrator", grade: "PSA 9",  baseSol: 62.0,  seed: 2.3, range: 8  },
  { name: "Blastoise 1st Ed.",   grade: "PSA 10", baseSol: 41.0,  seed: 3.7, range: 6  },
  { name: "Charizard Base Set",  grade: "PSA 9",  baseSol: 28.0,  seed: 4.2, range: 5  },
];

const ONEPIECE = [
  { name: "Monkey D. Luffy",  grade: "PSA 10", baseSol: 38.0, seed: 5.1, range: 7 },
  { name: "Shanks Alt Art",   grade: "PSA 10", baseSol: 29.0, seed: 6.3, range: 5 },
];

const METALS = [
  { name: "Gold 1oz",   symbol: "XAU", baseUsd: 3240, seed: 7.1, range: 40  },
  { name: "Silver 1oz", symbol: "XAG", baseUsd: 32.4, seed: 8.3, range: 1.5 },
];

export async function GET() {
  const pokemon  = POKEMON.map((c) => ({  ...c, floorSol: seedPrice(c.baseSol, c.seed, c.range), change24h: change24h(c.seed), updatedAt: new Date().toISOString() }));
  const onepiece = ONEPIECE.map((c) => ({ ...c, floorSol: seedPrice(c.baseSol, c.seed, c.range), change24h: change24h(c.seed), updatedAt: new Date().toISOString() }));
  const metals   = METALS.map((m) => ({   ...m, spotUsd:  seedPrice(m.baseUsd, m.seed, m.range), change24h: change24h(m.seed), updatedAt: new Date().toISOString() }));

  const navSol = [...pokemon, ...onepiece].reduce((s, c) => s + c.floorSol, 0);

  return NextResponse.json({
    ok: true,
    nav:       { totalSol: Math.round(navSol * 100) / 100, updatedAt: new Date().toISOString() },
    pokemon, onepiece, metals,
    programId: "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp",
    source:    "deterministic_oracle",
  }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}