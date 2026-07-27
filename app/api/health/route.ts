// FILE: app/api/health/route.ts
// Aggregated production health for load balancers and ops dashboards.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getIdvProvider, isAbraxasIndependentIdv } from "@/lib/idv/idvProvider";
import { isBiometricAutoApproveEnabled } from "@/lib/idv/biometric/thresholds";
import { isPassportIssuerConfigured, getSponsorConfig } from "@/lib/sui/passportIssuer";
import { isAdminPinConfigured } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  let supabaseReachable = false;
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const { error } = await sb.from("identity_verifications").select("id").limit(1);
    supabaseReachable = !error;
  }

  const signingConfigured = Boolean(process.env.ABRAXAS_SIGNING_KEY);
  const sessionConfigured = Boolean(
    process.env.ABRAXAS_BROWSER_SESSION_SECRET ?? process.env.ABRAXAS_SIGNING_KEY,
  );
  const sponsor = getSponsorConfig();

  const checks = {
    supabase_configured: Boolean(sbUrl && sbKey),
    supabase_reachable: supabaseReachable,
    signing_configured: signingConfigured,
    browser_session_configured: sessionConfigured,
    admin_pin_configured: isAdminPinConfigured(),
    on_chain_issuer_configured: isPassportIssuerConfigured(),
    idv_provider: getIdvProvider(),
    abraxas_independent: isAbraxasIndependentIdv(),
    auto_approve_enabled: isBiometricAutoApproveEnabled(),
    sui_network: process.env.SUI_NETWORK ?? "devnet",
  };

  const healthy =
    checks.supabase_configured
    && checks.supabase_reachable
    && checks.signing_configured
    && checks.browser_session_configured
    && checks.admin_pin_configured
    && checks.on_chain_issuer_configured
    && checks.abraxas_independent
    && !checks.auto_approve_enabled;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      service: "abraxas",
      timestamp: new Date().toISOString(),
      checks,
      sponsor: {
        configured: sponsor.configured,
        address: sponsor.sponsor_address,
        cap_from_env: sponsor.cap_from_env,
      },
      endpoints: {
        biometric: "/api/idv/biometric/status",
        independent: "/api/idv/independent/status",
        verify_layer: "/api/verify/layer",
        mainnet_readiness: "/api/mainnet/readiness",
      },
    },
    { status: healthy ? 200 : 503 },
  );
}
