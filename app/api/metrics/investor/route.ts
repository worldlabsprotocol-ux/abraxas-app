// FILE: app/api/metrics/investor/route.ts
// Extended metrics bundle for /metrics and /investors data room.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";
import { fetchAbraStats } from "@/lib/bags";

export const revalidate = 120;

export async function GET() {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let verifiedWallets = 0;
  let credentials = 0;
  let onChainPassports = 0;
  let pendingBookings = 0;
  let capturedBookings = 0;
  let cieloRevenueUsdc = 0;
  let recentBookings: Array<{
    id: string;
    status: string;
    check_in: string;
    check_out: string;
    created_at: string;
  }> = [];
  let investmentInterest = 0;
  let designPartners = 0;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const [w, c, p, bPending, bCaptured, revenueRows, recent, interest, partners] = await Promise.all([
      sb.from("sui_zklogin_identities").select("id", { count: "exact", head: true }),
      sb.from("abraxas_credentials").select("id", { count: "exact", head: true }).is("revoked_at", null),
      sb.from("sui_passport_objects").select("id", { count: "exact", head: true }),
      sb.from("stay_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("stay_requests").select("id", { count: "exact", head: true }).eq("status", "captured"),
      sb.from("stay_requests").select("paid_amount_usdc, est_usdc").eq("status", "captured"),
      sb.from("stay_requests")
        .select("id, status, check_in, check_out, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      sb.from("investment_interest").select("id", { count: "exact", head: true }),
      sb.from("design_partners").select("id", { count: "exact", head: true }),
    ]);
    verifiedWallets = w.count ?? 0;
    credentials = c.count ?? 0;
    onChainPassports = p.count ?? 0;
    pendingBookings = bPending.count ?? 0;
    capturedBookings = bCaptured.count ?? 0;
    cieloRevenueUsdc = (revenueRows.data ?? []).reduce((sum, row) => {
      const amt = row.paid_amount_usdc ?? row.est_usdc ?? 0;
      return sum + Number(amt);
    }, 0);
    recentBookings = (recent.data ?? []) as typeof recentBookings;
    investmentInterest = interest.count ?? 0;
    designPartners = partners.count ?? 0;
  }

  const verifiedAssets = EXPLORE_ASSETS.filter(a => a.state === "verified").length;
  const pipelineAssets = EXPLORE_ASSETS.filter(a => a.state !== "verified").length;

  let abraRevenue: Awaited<ReturnType<typeof fetchAbraStats>> | null = null;
  try {
    abraRevenue = await fetchAbraStats();
  } catch {
    abraRevenue = null;
  }

  const sponsoredReady = isPassportIssuerConfigured();

  return NextResponse.json({
    ok: true,
    metrics: {
      verified_assets: verifiedAssets,
      pipeline_assets: pipelineAssets,
      attested_value_usd: FLAGSHIP_PROPERTY.financials.estimatedValue,
      attested_value_label: "$1.1M+",
      zklogin_wallets: verifiedWallets,
      active_credentials: credentials,
      on_chain_passports: onChainPassports,
      sponsor_configured: sponsoredReady,
      pending_cielo_bookings: pendingBookings,
      captured_cielo_bookings: capturedBookings,
      cielo_revenue_usdc: cieloRevenueUsdc,
      cielo_revenue_label: cieloRevenueUsdc > 0
        ? `$${cieloRevenueUsdc.toLocaleString()} USDC`
        : "Live booking",
      investment_interest_count: investmentInterest,
      design_partner_applications: designPartners,
      passport_stamps: 10,
      credential_standard: "W3C VC",
    },
    abra_token: abraRevenue
      ? {
          token_mint: abraRevenue.tokenMint || null,
          lifetime_fees: abraRevenue.lifetimeFees,
          partner: abraRevenue.partner,
        }
      : null,
    recent_bookings: recentBookings,
    data_sources: {
      supabase: Boolean(SB_URL && SB_KEY),
      bags_api: Boolean(process.env.BAGS_API_KEY),
      defillama: true,
    },
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
  });
}
