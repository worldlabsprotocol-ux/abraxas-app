// FILE: app/api/examples/payment-authorization/preflight/route.ts
// Sandbox payment preflight. Fixtures only. Allow/deny surface only. No funds.

import { NextRequest, NextResponse } from "next/server";
import {
  AbraxasPaymentAuthorizationAdapter,
  PAYMENT_AUTHORIZATION_ACTION_TYPES,
  PAYMENT_AUTHORIZATION_FLOW,
  PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
  PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR,
  PAYMENT_REF_PARTNER_ID,
  PAYMENT_REF_POLICY_ID,
  assertNoSensitivePaymentClientKeys,
  isPaymentFixtureId,
  paymentFixtureReceipt,
} from "@/lib/partner/paymentAuthorization";

export const dynamic = "force-dynamic";

function adapter(environment: "sandbox" | "production") {
  return new AbraxasPaymentAuthorizationAdapter({
    partnerId: PAYMENT_REF_PARTNER_ID,
    policyId: PAYMENT_REF_POLICY_ID,
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
  };

  const environment = body.environment === "production" ? "production" : "sandbox";
  const client = adapter(environment);
  const issued = client.issueActionContract({
    action_type: body.action_type ?? "authorize_checkout",
    action_scope: body.action_scope,
  });
  if ("ok" in issued) {
    return NextResponse.json({
      allowed: false,
      reason: "action_mismatch",
      payment_action_binding: {
        action_type: "rejected",
        action_scope: String(body.action_scope ?? ""),
        nonce_state: "rejected",
        authorization_kind: "not_a_payment",
      },
      expires_at: null,
    }, { status: 400 });
  }

  if (!body.fixture || !isPaymentFixtureId(body.fixture)) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      payment_action_binding: {
        action_type: "rejected",
        action_scope: issued.action_scope,
        nonce_state: "rejected",
        authorization_kind: "not_a_payment",
      },
      expires_at: null,
    }, { status: 400 });
  }

  const result = client.evaluateFetchedReceipt(paymentFixtureReceipt(body.fixture));
  const first = await client.preflight({
    result,
    contract: issued,
    action_type: body.action_type,
    action_scope: body.action_scope,
  });
  const visible = body.replay_contract
    ? await client.preflight({ result, contract: issued, action_type: body.action_type, action_scope: body.action_scope })
    : first;
  if (assertNoSensitivePaymentClientKeys(visible).length > 0) {
    return NextResponse.json({
      allowed: false,
      reason: "invalid",
      payment_action_binding: {
        action_type: "rejected",
        action_scope: issued.action_scope,
        nonce_state: "rejected",
        authorization_kind: "not_a_payment",
      },
      expires_at: null,
    }, { status: 503 });
  }
  return NextResponse.json(visible, { status: visible.allowed ? 200 : 403 });
}

export async function GET() {
  const client = adapter("sandbox");
  return NextResponse.json({
    start_url: client.startPolicyVerification("https://abraxasworld.xyz/examples/payment-authorization"),
    actions: PAYMENT_AUTHORIZATION_ACTION_TYPES,
    creates_payments: client.createsPayments,
    creates_transfers: client.createsTransfers,
    funds_movement: client.fundsMovement,
    calls_circle: client.callsCircle,
    flow: PAYMENT_AUTHORIZATION_FLOW,
    boundary: PAYMENT_AUTHORIZATION_NO_FUNDS_BOUNDARY,
    product: PAYMENT_AUTHORIZATION_NOT_A_PROCESSOR,
  });
}
