// FILE: app/api/auth/wallet/sandbox/workspace/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireEphemeralWalletScope } from "@/lib/auth/ephemeralWallet/walletSession";
import { getEphemeralSandboxForSession } from "@/lib/auth/ephemeralWallet/sandboxWorkspace";
import { mapEphemeralStoreError } from "@/lib/auth/ephemeralWallet/apiGate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireEphemeralWalletScope(req, "wallet:session");
  if (!auth.ok) {
    return NextResponse.json({ ok: false, code: auth.error }, { status: auth.status });
  }

  try {
    const workspace = await getEphemeralSandboxForSession(auth.session.sessionId);
    return NextResponse.json({
      ok: true,
      workspace,
      test_only: true,
    });
  } catch (error) {
    const mapped = mapEphemeralStoreError(error);
    if (mapped) return mapped;
    throw error;
  }
}
