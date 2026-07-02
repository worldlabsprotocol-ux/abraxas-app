// FILE: app/api/cielo/config/route.ts
// Public Cielo + Sui payment config for clients.

import { NextResponse } from "next/server";
import { getCieloTreasuryAddress, getCieloTreasuryLabel, getUsdcCoinType } from "@/lib/cielo/treasury";
import { getPublicSuiConfig } from "@/lib/sui/network";

export async function GET() {
  const sui = getPublicSuiConfig();
  const usdcType = getUsdcCoinType();

  return NextResponse.json({
    ok: true,
    phase: 4,
    sui,
    payment: {
      chain: "sui",
      network: sui.network,
      asset: usdcType ? "USDC" : "SUI (fallback when USDC type unset)",
      usdc_coin_type: usdcType,
      treasury_address: getCieloTreasuryAddress(),
      treasury_label: getCieloTreasuryLabel(),
    },
  });
}
