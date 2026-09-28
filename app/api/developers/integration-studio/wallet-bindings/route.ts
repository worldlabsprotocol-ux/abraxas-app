// FILE: app/api/developers/integration-studio/wallet-bindings/route.ts
// Return safe, read-only wallet-binding status for one session-owned sandbox.

import { NextRequest, NextResponse } from "next/server";
import { resolvePartnerConsoleSession } from "@/lib/partner/launchpad/partnerConsoleSession";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { readStudioWalletBindingStatus } from "@/lib/partner/walletBindingStatus";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await resolvePartnerConsoleSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, status: "unauthorized" }, { status: 401 });
  }

  const applicationId = (req.nextUrl.searchParams.get("application_id") ?? "").trim();
  if (!applicationId) {
    return NextResponse.json({ ok: false, status: "invalid" }, { status: 400 });
  }

  const application = await getLaunchpadApplicationForPartner(applicationId, session.partnerId);
  if (!application || application.environment !== "sandbox") {
    return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
  }

  const origin = (req.headers.get("origin") ?? req.nextUrl.origin).trim();
  try {
    const bindings = await readStudioWalletBindingStatus({
      applicationId: application.id,
      partnerId: session.partnerId,
      policyId: application.policy_id,
      policyVersion: application.policy_version,
      origin,
    });
    return NextResponse.json({
      ok: true,
      application_id: application.id,
      solana: bindings.solana,
      evm: bindings.evm,
    });
  } catch {
    return NextResponse.json({ ok: false, status: "store_unavailable" }, { status: 503 });
  }
}
