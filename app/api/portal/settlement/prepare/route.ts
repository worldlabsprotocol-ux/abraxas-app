// FILE: app/api/portal/settlement/prepare/route.ts
// Prepare USDC settlement for a deal-ready owner application.

import { NextRequest, NextResponse } from "next/server";
import { fetchOwnerApplication } from "@/lib/portal/ownerApplicationStore";
import { findLocalPortalApplication } from "@/lib/portal/localApplications";
import { buildOwnerJourney } from "@/lib/portal/ownerJourney";
import { getCieloTreasuryAddress, getCieloTreasuryLabel, getUsdcCoinType } from "@/lib/cielo/treasury";
import { getPublicSuiConfig } from "@/lib/sui/network";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.application_id ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!applicationId || !email) {
    return NextResponse.json({ error: "application_id and email required" }, { status: 400 });
  }

  let row;
  if (applicationId.startsWith("local-")) {
    const local = findLocalPortalApplication(applicationId, email);
    if (!local) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    row = {
      id: local.application_id,
      status: local.status,
      asset_name: local.asset_name,
      asset_class: local.asset_class,
      contact_email: local.contact_email,
      linked_wallet: local.linked_wallet ?? null,
      deal_status: local.deal_status ?? "intake",
      settlement_amount_usdc: local.settlement_amount_usdc ?? null,
      public_verify_slug: null,
      created_at: local.created_at,
    };
  } else {
    row = await fetchOwnerApplication(applicationId, email);
    if (!row) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
  }

  const journey = buildOwnerJourney(row);
  if (!journey.deal_ready || !journey.settlement_amount_usdc) {
    return NextResponse.json({
      error: "Deal not ready for settlement. Complete verification and wait for deal-ready status.",
      journey,
    }, { status: 403 });
  }

  if (!journey.wallet_linked) {
    return NextResponse.json({ error: "Connect your wallet on Passport first." }, { status: 403 });
  }

  const treasury = getCieloTreasuryAddress();
  const sui = getPublicSuiConfig();
  const amount = journey.settlement_amount_usdc;
  const memo = `ABX:OWNER:${applicationId.slice(0, 8)}`;

  return NextResponse.json({
    ok: true,
    application_id: applicationId,
    asset_name: row.asset_name,
    sui,
    payment: {
      chain: "sui",
      network: sui.network,
      asset: getUsdcCoinType() ? "USDC (Circle on Sui)" : "SUI (devnet test until USDC configured)",
      amount_usdc: amount,
      treasury_address: treasury,
      treasury_label: getCieloTreasuryLabel(),
      usdc_coin_type: getUsdcCoinType(),
      memo,
      payable: Boolean(treasury),
    },
  });
}
