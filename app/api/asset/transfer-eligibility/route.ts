// FILE: app/api/asset/transfer-eligibility/route.ts
// Pre-transfer policy check — on-chain program should call before allowing move.

import { NextRequest, NextResponse } from "next/server";
import { evaluateTransferEligibility } from "@/lib/asset/transferEligibility";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    from_wallet?: string;
    to_wallet?: string;
    asset_id?: string;
    policy_id?: string;
  };

  if (!body.from_wallet || !body.to_wallet || !body.asset_id) {
    return NextResponse.json({
      error: "from_wallet, to_wallet, asset_id required",
    }, { status: 400 });
  }

  try {
    const result = await evaluateTransferEligibility({
      fromWallet: body.from_wallet,
      toWallet: body.to_wallet,
      assetId: body.asset_id,
      policyId: body.policy_id,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Evaluation failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
