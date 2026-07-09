// FILE: lib/registry/unifiedStats.ts
// Single source of truth for registry + protocol stats (Supabase + catalog).

import { createClient } from "@supabase/supabase-js";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";
import { getVerificationNetworkMetrics, type VerificationNetworkMetrics } from "@/lib/metrics/verificationMetrics";

export interface UnifiedRegistryStats {
  phase: "design_partner";
  registry_assets: number;
  verified_assets: number;
  asset_classes: number;
  attested_value_usd: number;
  attested_value_label: string;
  live_booking_assets: number;
  zklogin_wallets: number;
  active_credentials: number;
  on_chain_passports: number;
  captured_bookings: number;
  cielo_revenue_usdc: number;
  sponsor_configured: boolean;
  verification_network: VerificationNetworkMetrics;
  sources: {
    catalog: string;
    database: string;
    on_chain: string;
  };
}

export async function getUnifiedRegistryStats(): Promise<UnifiedRegistryStats> {
  const registryAssets = EXPLORE_ASSETS.length;
  const verifiedInCatalog = EXPLORE_ASSETS.filter(a => a.state === "verified").length;
  const assetClasses = new Set(EXPLORE_ASSETS.map(a => a.assetClass.split(" · ")[0])).size;

  let zkloginWallets = 0;
  let activeCredentials = 0;
  let onChainPassports = 0;
  let capturedBookings = 0;
  let cieloRevenueUsdc = 0;

  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const [w, c, p, revenueRows] = await Promise.all([
      sb.from("sui_zklogin_identities").select("id", { count: "exact", head: true }),
      sb.from("abraxas_credentials").select("id", { count: "exact", head: true }).is("revoked_at", null),
      sb.from("sui_passport_objects").select("id", { count: "exact", head: true }),
      sb.from("stay_requests").select("paid_amount_usdc, est_usdc").eq("status", "captured"),
    ]);

    zkloginWallets = w.count ?? 0;
    activeCredentials = c.count ?? 0;
    onChainPassports = p.count ?? 0;
    capturedBookings = revenueRows.data?.length ?? 0;
    cieloRevenueUsdc = (revenueRows.data ?? []).reduce((sum, row) => {
      const amt = row.paid_amount_usdc ?? row.est_usdc ?? 0;
      return sum + Number(amt);
    }, 0);
  }

  // Verified assets: catalog truth + at least one if live bookings exist
  const liveBookingAssets = capturedBookings > 0 ? 1 : 0;
  const verifiedAssets = Math.max(verifiedInCatalog, liveBookingAssets);
  const verification = await getVerificationNetworkMetrics();

  return {
    phase: "design_partner",
    registry_assets: registryAssets,
    verified_assets: verifiedAssets,
    asset_classes: assetClasses,
    attested_value_usd: FLAGSHIP_PROPERTY.financials.estimatedValue,
    attested_value_label: "$1.1M+",
    live_booking_assets: liveBookingAssets,
    zklogin_wallets: zkloginWallets,
    active_credentials: activeCredentials,
    on_chain_passports: onChainPassports,
    captured_bookings: capturedBookings,
    cielo_revenue_usdc: cieloRevenueUsdc,
    sponsor_configured: isPassportIssuerConfigured(),
    verification_network: verification,
    sources: {
      catalog: "lib/data/exploreAssets.ts",
      database: SB_URL ? "supabase" : "unavailable",
      on_chain: "sui_passport_objects + stay_requests",
    },
  };
}
