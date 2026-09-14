// FILE: app/api/wallet-authority/binding/status/route.ts
// Canonical wallet binding readiness for Passport and repair flows.

import { NextRequest, NextResponse } from "next/server";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { readCanonicalWalletBindingTruth } from "@/lib/trust/readCanonicalWalletBinding";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  const subject = normalizeSuiAddress(session.session.suiAddress);
  const truth = await readCanonicalWalletBindingTruth(subject);

  if (truth.status === "unavailable") {
    return NextResponse.json({
      subject_id: subject,
      wallet_address: subject,
      persisted: false,
      binding_status: "unavailable",
      binding_method: null,
      claim_active: false,
      repairable: false,
      wallet_binding_status: "unavailable",
      wallet_binding_read_error: truth.read_error,
    });
  }

  const bindingStatus = truth.status === "active"
    ? "active"
    : truth.status === "revoked"
      ? "revoked"
      : "missing";

  return NextResponse.json({
    subject_id: subject,
    wallet_address: subject,
    persisted: truth.persisted,
    binding_status: bindingStatus,
    binding_method: truth.binding_method,
    claim_active: truth.claim_active,
    repairable: truth.repairable,
    wallet_binding_status: truth.persisted
      ? "ok"
      : truth.repairable
        ? "repair_required"
        : "failed",
  });
}
