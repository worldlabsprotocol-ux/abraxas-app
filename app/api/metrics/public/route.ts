// FILE: app/api/metrics/public/route.ts
// Live protocol metrics for homepage trust strip.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EXPLORE_ASSETS } from "@/lib/data/exploreAssets";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { isPassportIssuerConfigured } from "@/lib/sui/passportIssuer";

export const revalidate = 120;

export async function GET() {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let verifiedWallets = 0;
  let credentials = 0;
  let onChainPassports = 0;
  let sponsoredReady = isPassportIssuerConfigured();
  let pendingBookings = 0;

  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const [w, c, p, b] = await Promise.all([
      sb.from("sui_zklogin_identities").select("id", { count: "exact", head: true }),
      sb.from("abraxas_credentials").select("id", { count: "exact", head: true }).is("revoked_at", null),
      sb.from("sui_passport_objects").select("id", { count: "exact", head: true }),
      sb.from("stay_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    verifiedWallets = w.count ?? 0;
    credentials = c.count ?? 0;
    onChainPassports = p.count ?? 0;
    pendingBookings = b.count ?? 0;
  }

  const verifiedAssets = EXPLORE_ASSETS.filter(a => a.state === "verified").length;
  const attestedValue = FLAGSHIP_PROPERTY.financials.estimatedValue;

  return NextResponse.json({
    ok: true,
    metrics: {
      verified_assets: verifiedAssets,
      attested_value_usd: attestedValue,
      attested_value_label: "$1.1M+",
      zklogin_wallets: verifiedWallets,
      active_credentials: credentials,
      on_chain_passports: onChainPassports,
      sponsor_configured: sponsoredReady,
      pending_cielo_bookings: pendingBookings,
      passport_stamps: 10,
      credential_standard: "W3C VC",
    },
    updatedAt: new Date().toISOString(),
  }, {
    headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60" },
  });
}
