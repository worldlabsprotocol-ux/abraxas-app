// FILE: app/api/auth/wallet/sandbox/policies/route.ts

import { NextRequest, NextResponse } from "next/server";
import { assertEphemeralWalletAuthEnabled } from "@/lib/auth/ephemeralWallet/apiGate";
import { EPHEMERAL_SANDBOX_TEST_POLICIES } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const disabled = assertEphemeralWalletAuthEnabled();
  if (disabled) return disabled;

  return NextResponse.json({
    ok: true,
    test_only: true,
    production_usable: false,
    policies: EPHEMERAL_SANDBOX_TEST_POLICIES,
  });
}
