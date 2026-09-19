// FILE: app/api/examples/solana-partner/gate/route.ts
// Reference Solana gate. Evaluates fixtures or a receipt id. Returns allow/deny only.

import { NextRequest, NextResponse } from "next/server";
import {
  AbraxasSolanaPartnerAdapter,
  SOLANA_PARTNER_ACTIONS,
  SOLANA_REF_PARTNER_ID,
  SOLANA_REF_POLICY_ID,
  assertNoSensitiveClientKeys,
  isSolanaFixtureId,
  solanaFixtureReceipt,
  type SolanaPartnerAction,
} from "@/lib/partner/solana";

export const dynamic = "force-dynamic";

function adapter(environment: "sandbox" | "production") {
  return new AbraxasSolanaPartnerAdapter({
    partnerId: SOLANA_REF_PARTNER_ID,
    policyId: SOLANA_REF_POLICY_ID,
    policyVersion: 1,
    environment,
  });
}

function parseAction(value: unknown): SolanaPartnerAction {
  if (typeof value === "string" && (SOLANA_PARTNER_ACTIONS as readonly string[]).includes(value)) {
    return value as SolanaPartnerAction;
  }
  return "claim_access";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    fixture?: string;
    receipt_id?: string;
    action?: string;
    environment?: string;
  };

  const action = parseAction(body.action);
  const environment = body.environment === "production" ? "production" : "sandbox";
  const client = adapter(environment);

  if (body.fixture) {
    if (!isSolanaFixtureId(body.fixture)) {
      return NextResponse.json({ allowed: false, reason: "invalid", action }, { status: 400 });
    }
    const result = client.evaluateFetchedReceipt(solanaFixtureReceipt(body.fixture));
    const visible = client.bindPartnerAction(result, action);
    if (assertNoSensitiveClientKeys(visible).length > 0) {
      return NextResponse.json({ allowed: false, reason: "invalid", action }, { status: 500 });
    }
    return NextResponse.json(visible, { status: visible.allowed ? 200 : 403 });
  }

  if (typeof body.receipt_id === "string" && body.receipt_id.trim()) {
    const result = await client.verifySignedReceipt(body.receipt_id.trim());
    const visible = client.bindPartnerAction(result, action);
    return NextResponse.json(visible, { status: visible.allowed ? 200 : 403 });
  }

  return NextResponse.json({ allowed: false, reason: "invalid", action }, { status: 400 });
}

export async function GET() {
  const client = adapter("sandbox");
  return NextResponse.json({
    start_url: client.startPolicyVerification("https://abraxasworld.xyz/examples/solana-partner"),
    actions: SOLANA_PARTNER_ACTIONS,
    creates_transactions: client.createsTransactions,
    funds_movement: client.fundsMovement,
  });
}
