// FILE: app/api/auth/wallet/state/route.ts

import { NextRequest, NextResponse } from "next/server";
import { assertEphemeralWalletAuthEnabled } from "@/lib/auth/ephemeralWallet/apiGate";
import { resolveWalletTrustState } from "@/lib/auth/ephemeralWallet/walletTrustState";
import { TRANSIENT_STATE_AUDIT } from "@/lib/auth/ephemeralWallet/transientStatePolicy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const disabled = assertEphemeralWalletAuthEnabled();
  if (disabled) return disabled;

  const walletConnected = req.nextUrl.searchParams.get("wallet_connected") === "1";
  const { state } = await resolveWalletTrustState(req, { walletConnected });

  return NextResponse.json({
    ok: true,
    state,
    model: {
      wallet_connected: "Browser wallet adapter available; not proof of Abraxas authorization.",
      wallet_authenticated: "Valid short-lived capability after sign-in message verification.",
      action_authorized: "Separate on-demand signatures per privileged operation.",
    },
    transient_state_audit: TRANSIENT_STATE_AUDIT,
  });
}
