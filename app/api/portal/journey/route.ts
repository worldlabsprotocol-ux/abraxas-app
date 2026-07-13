// FILE: app/api/portal/journey/route.ts
// Full owner journey: wallet → verified → deal ready → USDC settlement.

import { NextRequest, NextResponse } from "next/server";
import { buildOwnerJourney } from "@/lib/portal/ownerJourney";
import { fetchOwnerApplication } from "@/lib/portal/ownerApplicationStore";
import { findLocalPortalApplication } from "@/lib/portal/localApplications";
import { getPublicSuiConfig } from "@/lib/sui/network";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.application_id ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const sessionWallet = String(body.session_wallet ?? "").trim() || null;

  if (!applicationId || !email) {
    return NextResponse.json({ error: "application_id and email required" }, { status: 400 });
  }

  if (applicationId.startsWith("local-")) {
    const local = findLocalPortalApplication(applicationId, email);
    if (!local) {
      return NextResponse.json({ error: "Application not found in this browser" }, { status: 404 });
    }
    const row = {
      id: local.application_id,
      status: local.status,
      asset_name: local.asset_name,
      asset_class: local.asset_class,
      jurisdiction: local.jurisdiction ?? null,
      evidence_scope: local.evidence_scope ?? null,
      contact_email: local.contact_email,
      contact_wallet: local.linked_wallet ?? null,
      linked_wallet: local.linked_wallet ?? null,
      deal_status: local.deal_status ?? "intake",
      settlement_amount_usdc: local.settlement_amount_usdc ?? null,
      settlement_tx_digest: local.settlement_tx_digest ?? null,
      created_at: local.created_at,
    };
    return NextResponse.json({
      ok: true,
      local_mode: true,
      journey: buildOwnerJourney(row, sessionWallet),
      sui: getPublicSuiConfig(),
    });
  }

  const row = await fetchOwnerApplication(applicationId, email);
  if (!row) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    journey: buildOwnerJourney(row, sessionWallet),
    sui: getPublicSuiConfig(),
  });
}
