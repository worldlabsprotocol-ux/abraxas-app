// FILE: app/api/circuit/route.ts
// Circuit risk engine API. Server-side only.
// GET /api/circuit?vaultId=490 → RiskResult for that vault
// GET /api/circuit → RiskResult[] for all vaults

import { NextRequest, NextResponse } from "next/server";
import { evaluateRisk, simulateSignals, RiskResult } from "@/lib/circuitEngine";
import { VAULTS } from "@/lib/appData";

export async function GET(req: NextRequest) {
  const vaultId = req.nextUrl.searchParams.get("vaultId");

  if (vaultId) {
    const vault = VAULTS.find((v) => v.id === vaultId);
    if (!vault) {
      return NextResponse.json({ ok: false, error: "Vault not found" }, { status: 404 });
    }
    const signals = simulateSignals(vaultId, Date.now());
    const result  = evaluateRisk(signals);
    return NextResponse.json({ ok: true, result }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  // All vaults
  const results: RiskResult[] = VAULTS.map((v) => {
    const signals = simulateSignals(v.id, Date.now());
    return evaluateRisk(signals);
  });

  return NextResponse.json({ ok: true, results }, {
    headers: { "Cache-Control": "no-store" },
  });
}