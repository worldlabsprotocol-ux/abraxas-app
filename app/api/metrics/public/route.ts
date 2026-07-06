// FILE: app/api/metrics/public/route.ts
// Live protocol metrics — delegates to unified registry stats.

import { NextResponse } from "next/server";
import { getUnifiedRegistryStats } from "@/lib/registry/unifiedStats";

export const revalidate = 120;

export async function GET() {
  const stats = await getUnifiedRegistryStats();

  return NextResponse.json({
    ok: true,
    metrics: {
      verified_assets: stats.verified_assets,
      attested_value_usd: stats.attested_value_usd,
      attested_value_label: stats.attested_value_label,
      registry_assets: stats.registry_assets,
      asset_classes: stats.asset_classes,
      zklogin_wallets: stats.zklogin_wallets,
      active_credentials: stats.active_credentials,
      on_chain_passports: stats.on_chain_passports,
      sponsor_configured: stats.sponsor_configured,
      captured_cielo_bookings: stats.captured_bookings,
      cielo_revenue_usdc: stats.cielo_revenue_usdc,
      cielo_revenue_label: stats.cielo_revenue_usdc > 0
        ? `$${stats.cielo_revenue_usdc.toLocaleString()} captured`
        : "Apple Pay ready",
      phase: stats.phase,
    },
    sources: stats.sources,
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
  });
}
