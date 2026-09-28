// FILE: app/api/launchpad/applications/[id]/billing/solana/route.ts
// Session-bound, non-custodial Solana USDC plan checkout.

import { NextRequest } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  SolanaBillingConfigurationError,
  createSolanaBillingPayment,
  findFinalizedSolanaBillingPayment,
  isPaidPartnerPlanId,
  readSolanaBillingConfig,
} from "@/lib/partner/billing/solanaUsdc";
import {
  billingIntentView,
  confirmPartnerBillingIntent,
  createPartnerBillingIntent,
  expirePartnerBillingIntent,
  getPartnerBillingIntent,
  getLatestPartnerBillingIntent,
} from "@/lib/partner/billing/store";
import { getPartnerEntitlements } from "@/lib/partner/partnerEntitlements";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

async function authorize(req: NextRequest, applicationId: string, limit: number) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const limited = enforceLaunchpadTenantRateLimit(
    req,
    "launchpad-solana-billing",
    auth.session.partnerId,
    limit,
    "billing_rate_limited",
  );
  if (limited) return { ok: false as const, response: limited };
  const application = await getLaunchpadApplicationForPartner(applicationId, auth.session.partnerId);
  if (!application) return { ok: false as const, response: launchpadError("not_found", 404) };
  return { ok: true as const, session: auth.session, application };
}

function unavailable(error: unknown) {
  if (error instanceof SolanaBillingConfigurationError) {
    return launchpadError("billing_not_configured", 503, "USDC checkout is not configured");
  }
  return launchpadError("billing_unavailable", 503, "USDC checkout is temporarily unavailable");
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const access = await authorize(req, params.id, 12);
  if (!access.ok) return access.response;

  let body: { plan_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return launchpadError("invalid_json", 400);
  }
  if (!isPaidPartnerPlanId(body.plan_id)) {
    return launchpadError("invalid_plan", 400, "Choose Launch or Scale");
  }

  try {
    const config = readSolanaBillingConfig();
    const intentId = crypto.randomUUID();
    const payment = createSolanaBillingPayment({
      planId: body.plan_id,
      intentId,
      config,
    });
    const intent = await createPartnerBillingIntent({
      intentId,
      partnerId: access.session.partnerId,
      applicationId: access.application.id,
      config,
      payment,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    });
    return launchpadJson({ ok: true, payment: billingIntentView(intent, payment.paymentUrl) }, 201);
  } catch (error) {
    return unavailable(error);
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const access = await authorize(req, params.id, 30);
  if (!access.ok) return access.response;
  const intentId = (req.nextUrl.searchParams.get("intent_id") ?? "").trim();

  try {
    if (!intentId) {
      const [entitlements, latest] = await Promise.all([
        getPartnerEntitlements(access.session.partnerId),
        getLatestPartnerBillingIntent({
          partnerId: access.session.partnerId,
          applicationId: access.application.id,
        }),
      ]);
      const active = (entitlements.planId === "launch" || entitlements.planId === "scale")
        && Boolean(entitlements.paidThrough)
        && Date.parse(entitlements.paidThrough ?? "") > Date.now();
      return launchpadJson({
        ok: true,
        billing: {
          plan_id: active ? entitlements.planId : "sandbox",
          active,
          paid_through: active ? entitlements.paidThrough : null,
          monthly_receipt_limit: active ? entitlements.monthlyReceiptLimit : null,
          monthly_api_call_limit: active ? entitlements.monthlyApiCallLimit : null,
          collection: "solana_usdc",
        },
        payment: latest ? billingIntentView(latest) : null,
      });
    }
    if (!/^[0-9a-f-]{36}$/i.test(intentId)) return launchpadError("invalid_intent", 400);
    const intent = await getPartnerBillingIntent({
      intentId,
      partnerId: access.session.partnerId,
      applicationId: access.application.id,
    });
    if (!intent) return launchpadError("not_found", 404);
    if (intent.status === "confirmed" || intent.status === "expired") {
      return launchpadJson({ ok: true, payment: billingIntentView(intent) });
    }
    if (Date.parse(intent.expiresAt) <= Date.now()) {
      await expirePartnerBillingIntent(intent.intentId, access.session.partnerId);
      return launchpadJson({ ok: true, payment: { ...billingIntentView(intent), status: "expired" } });
    }

    const config = readSolanaBillingConfig();
    if (
      intent.networkId !== config.networkId
      || intent.recipient !== config.recipient.toBase58()
      || intent.tokenMint !== config.tokenMint.toBase58()
    ) {
      return launchpadError("billing_configuration_changed", 409, "Create a new payment request");
    }

    const signature = await findFinalizedSolanaBillingPayment({
      config,
      reference: intent.reference,
      amountMinor: intent.amountMinor,
      createdAt: intent.createdAt,
    });
    if (!signature) {
      const payment = createSolanaBillingPayment({
        planId: intent.planId,
        intentId: intent.intentId,
        config,
        reference: new PublicKey(intent.reference),
      });
      return launchpadJson({ ok: true, payment: billingIntentView(intent, payment.paymentUrl) });
    }

    const confirmedAt = new Date().toISOString();
    const confirmed = await confirmPartnerBillingIntent({
      intentId: intent.intentId,
      partnerId: access.session.partnerId,
      signature,
      confirmedAt,
    });
    if (!confirmed) return launchpadError("payment_confirmation_failed", 409);
    return launchpadJson({
      ok: true,
      payment: {
        ...billingIntentView(intent),
        status: "confirmed",
        confirmed_at: confirmedAt,
        transaction_signature: signature,
      },
    });
  } catch (error) {
    return unavailable(error);
  }
}
