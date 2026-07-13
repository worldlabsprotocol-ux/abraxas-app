// FILE: app/api/portal/wallet-link/route.ts
// Link Passport / zkLogin wallet to an owner application.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { linkWalletToApplication } from "@/lib/portal/ownerApplicationStore";
import { findLocalPortalApplication, updateLocalPortalApplication } from "@/lib/portal/localApplications";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const applicationId = String(body.application_id ?? "").trim();
  const email = String(body.email ?? "").trim();
  const wallet = String(body.wallet ?? body.sui_address ?? "").trim();

  if (!applicationId || !email || !wallet) {
    return NextResponse.json({ error: "application_id, email, and wallet required" }, { status: 400 });
  }

  let normalized: string;
  try {
    normalized = normalizeSuiAddress(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid Sui wallet address" }, { status: 400 });
  }

  if (applicationId.startsWith("local-")) {
    const local = findLocalPortalApplication(applicationId, email);
    if (!local) {
      return NextResponse.json({ error: "Application not found in this browser" }, { status: 404 });
    }
    updateLocalPortalApplication(applicationId, {
      linked_wallet: normalized,
      deal_status: "deal_ready",
      settlement_amount_usdc: 100,
      status: "verified",
    });
    return NextResponse.json({ ok: true, linked_wallet: normalized, local_mode: true });
  }

  const result = await linkWalletToApplication(applicationId, email, normalized);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Link failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, linked_wallet: normalized });
}
