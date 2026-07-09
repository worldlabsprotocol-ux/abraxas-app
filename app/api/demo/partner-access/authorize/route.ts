// FILE: app/api/demo/partner-access/authorize/route.ts
// DEMO only — starts Connect flow server-side (no partner key in browser).

import { NextRequest, NextResponse } from "next/server";
import { createAuthorizationRequest } from "@/lib/connect/authorizationService";
import {
  CONNECT_DEMO_PARTNER_ID,
  CONNECT_DEMO_POLICY_ID,
  CONNECT_DEMO_RETURN_PATH,
} from "@/lib/connect/demoPartner";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    wallet_address?: string;
    chain_id?: number;
  };

  if (!body.wallet_address) {
    return NextResponse.json({ error: "wallet_address required" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const returnUrl = `${origin}${CONNECT_DEMO_RETURN_PATH}`;

  try {
    const result = await createAuthorizationRequest({
      partnerId: CONNECT_DEMO_PARTNER_ID,
      policyId: CONNECT_DEMO_POLICY_ID,
      walletAddress: body.wallet_address,
      chain: "evm",
      chainId: body.chain_id ?? 1,
      requestedAction: "demo_request_access",
      returnUrl,
    });

    return NextResponse.json({
      ...result,
      demo: true,
      policy_id: CONNECT_DEMO_POLICY_ID,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Demo authorize failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
