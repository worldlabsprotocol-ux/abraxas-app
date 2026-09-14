// FILE: app/api/wallet-authority/binding/status/route.ts
// Canonical wallet binding readiness for Passport and repair flows.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { getCanonicalWalletBindingSnapshot } from "@/lib/credentials/ensureZkLoginWalletBinding";
import { isWalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  try {
    const snapshot = await getCanonicalWalletBindingSnapshot(session.session.suiAddress);
    return NextResponse.json({
      subject_id: snapshot.subject_id,
      wallet_address: snapshot.wallet_address,
      persisted: snapshot.persisted,
      binding_status: snapshot.binding_status,
      binding_method: snapshot.binding_method,
      claim_active: snapshot.claim_active,
      repairable: snapshot.repairable,
      wallet_binding_status: snapshot.persisted ? "ok" : snapshot.repairable ? "repair_required" : "failed",
    });
  } catch (error) {
    if (isWalletPersistenceError(error)) {
      return NextResponse.json({
        error: error.message,
        code: error.code,
        wallet_binding_status: "failed",
      }, { status: 503 });
    }
    throw error;
  }
}
