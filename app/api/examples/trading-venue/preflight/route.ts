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
import { rejectVenueProfileClientOverride } from "@/lib/partner/tradingVenue/profiles";

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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (rejectVenueProfileClientOverride(body)) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      action_binding: {
        action_type: "rejected",
        action_scope: "",
        nonce_state: "rejected",
        wallet_binding: "not_attached",
      },
      expires_at: null,
    }, { status: 400 });
  }

  const client = adapter("sandbox");
  const issued = client.issueActionContract({
    action_type: String(body.action_type ?? "enable_market_access"),
    action_scope: String(body.action_scope ?? "sandbox:market_access"),
  });
  if ("ok" in issued) {
    return NextResponse.json({
      allowed: false,
      reason: issued.reason,
      action_binding: {
        action_type: "rejected",
        action_scope: String(body.action_scope ?? ""),
        nonce_state: "rejected",
        wallet_binding: "not_attached",
      },
      expires_at: null,
    }, { status: 400 });
  }

  const contractInput = body.contract && typeof body.contract === "object" && !Array.isArray(body.contract)
    ? body.contract as Record<string, unknown>
    : null;
  const contract = contractInput && contractInput.nonce
    ? {
      partner_id: String(contractInput.partner_id ?? issued.partner_id),
      policy_id: String(contractInput.policy_id ?? issued.policy_id),
      policy_version: Number(contractInput.policy_version ?? issued.policy_version),
      action_type: (contractInput.action_type ?? issued.action_type) as typeof issued.action_type,
      action_scope: (contractInput.action_scope ?? issued.action_scope) as typeof issued.action_scope,
      expires_at: String(contractInput.expires_at ?? issued.expires_at),
      nonce: String(contractInput.nonce),
      wallet_binding: "not_attached" as const,
    }
    : issued;

  if (!body.fixture || !isVenueFixtureId(String(body.fixture))) {
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

  const result = client.evaluateFetchedReceipt(venueFixtureReceipt(String(body.fixture)));
  const first = await client.preflight({
    result,
    contract,
    action_type: typeof body.action_type === "string" ? body.action_type : undefined,
    action_scope: typeof body.action_scope === "string" ? body.action_scope : undefined,
  });
  const visible = body.replay_contract
    ? await client.preflight({
      result,
      contract,
      action_type: typeof body.action_type === "string" ? body.action_type : undefined,
      action_scope: typeof body.action_scope === "string" ? body.action_scope : undefined,
    })
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
