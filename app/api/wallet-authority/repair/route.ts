// FILE: app/api/wallet-authority/repair/route.ts
// Signed-in repair for zkLogin identities missing canonical wallet bindings.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import {
  ensureZkLoginWalletBinding,
  getCanonicalWalletBindingSnapshot,
} from "@/lib/credentials/ensureZkLoginWalletBinding";
import { isWalletPersistenceError } from "@/lib/credentials/walletPersistenceErrors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireBrowserSession(req);
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }

  try {
    const result = await ensureZkLoginWalletBinding(session.session.suiAddress);
    const snapshot = await getCanonicalWalletBindingSnapshot(session.session.suiAddress);

    if (result.status === "failed" || !snapshot.persisted) {
      return NextResponse.json({
        ok: false,
        wallet_binding_status: "failed",
        reason_code: result.reason_code ?? "binding_not_persisted",
        repairable: snapshot.repairable,
        persisted: snapshot.persisted,
      }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      wallet_binding_status: result.status,
      reason_code: result.reason_code,
      binding_method: result.binding_method,
      persisted: true,
      repairable: false,
    });
  } catch (error) {
    if (isWalletPersistenceError(error)) {
      return NextResponse.json({
        ok: false,
        wallet_binding_status: "failed",
        reason_code: error.code,
        repairable: true,
        error: error.message,
      }, { status: 503 });
    }
    throw error;
  }
}
