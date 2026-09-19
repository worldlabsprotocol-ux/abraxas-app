// FILE: app/api/examples/trading-venue/preflight/route.ts
// Sandbox venue preflight. Fixtures only by default. Allow/deny surface only.

import { NextRequest, NextResponse } from "next/server";
import {
  AbraxasTradingVenueAdapter,
  TRADING_VENUE_ACTION_TYPES,
  TRADING_VENUE_FLOW,
  TRADING_VENUE_NO_FUNDS_BOUNDARY,
  TRADING_VENUE_NOT_A_MARKET,
  VENUE_REF_PARTNER_ID,
  VENUE_REF_POLICY_ID,
  assertNoSensitiveVenueClientKeys,
  isVenueFixtureId,
  venueFixtureReceipt,
} from "@/lib/partner/tradingVenue";

export const dynamic = "force-dynamic";

function adapter(environment: "sandbox" | "production") {
  return new AbraxasTradingVenueAdapter({
    partnerId: VENUE_REF_PARTNER_ID,
    policyId: VENUE_REF_POLICY_ID,
    policyVersion: 1,
    environment,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    fixture?: string;
    action_type?: string;
    action_scope?: string;
    environment?: string;
    replay_contract?: boolean;
    contract?: {
      partner_id?: string;
      policy_id?: string;
      policy_version?: number;
      action_type?: string;
      action_scope?: string;
      expires_at?: string;
      nonce?: string;
      wallet_binding?: "not_attached";
    };
  };

  const environment = body.environment === "production" ? "production" : "sandbox";
  const client = adapter(environment);
  const issued = client.issueActionContract({
    action_type: body.action_type ?? "enable_market_access",
    action_scope: body.action_scope ?? "sandbox:market_access",
  });
  if ("ok" in issued) {
    return NextResponse.json({
      allowed: false,
      reason: "action_mismatch",
      action_binding: {
        action_type: "rejected",
        action_scope: String(body.action_scope ?? ""),
        nonce_state: "rejected",
        wallet_binding: "not_attached",
      },
      expires_at: null,
    }, { status: 400 });
  }

  const contract = body.contract && body.contract.nonce
    ? {
      partner_id: String(body.contract.partner_id ?? issued.partner_id),
      policy_id: String(body.contract.policy_id ?? issued.policy_id),
      policy_version: Number(body.contract.policy_version ?? issued.policy_version),
      action_type: (body.contract.action_type ?? issued.action_type) as typeof issued.action_type,
      action_scope: (body.contract.action_scope ?? issued.action_scope) as typeof issued.action_scope,
      expires_at: String(body.contract.expires_at ?? issued.expires_at),
      nonce: String(body.contract.nonce),
      wallet_binding: "not_attached" as const,
    }
    : issued;

  if (!body.fixture || !isVenueFixtureId(body.fixture)) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      action_binding: {
        action_type: "rejected",
        action_scope: contract.action_scope,
        nonce_state: "rejected",
        wallet_binding: "not_attached",
      },
      expires_at: null,
    }, { status: 400 });
  }

  const result = client.evaluateFetchedReceipt(venueFixtureReceipt(body.fixture));
  const first = await client.preflight({
    result,
    contract,
    action_type: body.action_type,
    action_scope: body.action_scope,
  });
  const visible = body.replay_contract
    ? await client.preflight({ result, contract, action_type: body.action_type, action_scope: body.action_scope })
    : first;
  if (assertNoSensitiveVenueClientKeys(visible).length > 0) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      action_binding: {
        action_type: "rejected",
        action_scope: contract.action_scope,
        nonce_state: "rejected",
        wallet_binding: "not_attached",
      },
      expires_at: null,
    }, { status: 500 });
  }
  return NextResponse.json(visible, { status: visible.allowed ? 200 : 403 });
}

export async function GET() {
  const client = adapter("sandbox");
  return NextResponse.json({
    start_url: client.startPolicyVerification("https://abraxasworld.xyz/examples/trading-venue"),
    actions: TRADING_VENUE_ACTION_TYPES,
    creates_trades: client.createsTrades,
    creates_transactions: client.createsTransactions,
    funds_movement: client.fundsMovement,
    connects_wallet: client.connectsWallet,
    flow: TRADING_VENUE_FLOW,
    boundary: TRADING_VENUE_NO_FUNDS_BOUNDARY,
    product: TRADING_VENUE_NOT_A_MARKET,
  });
}
