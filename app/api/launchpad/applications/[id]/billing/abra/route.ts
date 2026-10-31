// Authenticated ABRA credit checkout contract. Explicitly disabled for this
// build: no real token transfer or production charge can be requested.
import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit, launchpadError, launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  AbraQuoteUnavailable, abraServiceCreditEligibility, assertAbraCheckoutEnabled,
} from "@/lib/partner/billing/abraServiceCredits";
import {
  persistAbraPaymentQuote, prepareAbraPaymentQuote, settleAbraPayment,
} from "@/lib/partner/billing/abraPayments.server";
import { PARTNER_COMMERCIAL_PLANS } from "@/lib/partner/partnerCommercialPlans";

export const dynamic = "force-dynamic";
type Context = { params: { id: string } };

async function authorize(req: NextRequest, applicationId: string) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return { ok: false as const, response: auth.response };
  const limited = await enforceLaunchpadTenantRateLimit(req, "launchpad-abra-billing",
    auth.session.partnerId, 8, "billing_rate_limited");
  if (limited) return { ok: false as const, response: limited };
  const application = await getLaunchpadApplicationForPartner(applicationId, auth.session.partnerId);
  if (!application) return { ok: false as const, response: launchpadError("not_found", 404) };
  return { ok: true as const, partnerId: auth.session.partnerId, application };
}

export async function POST(req: NextRequest, { params }: Context) {
  const access = await authorize(req, params.id);
  if (!access.ok) return access.response;
  const application = access.application;
  const partnerId = access.partnerId;
  if (!application || !partnerId) return launchpadError("not_found", 404);
  let body: { plan_id?: unknown };
  try { body = await req.json(); } catch { return launchpadError("invalid_json", 400); }
  if (body.plan_id !== "launch" && body.plan_id !== "scale")
    return launchpadError("invalid_plan", 400);
  const creditCents = PARTNER_COMMERCIAL_PLANS[body.plan_id].monthly_base_cents!;
  const eligibility = abraServiceCreditEligibility({
    planId: body.plan_id,
    environment: application.environment === "production" ? "production" : "sandbox",
    chargeCents: creditCents,
  });
  if (eligibility.eligible !== true) return launchpadError(eligibility.reason, 400);
  try {
    assertAbraCheckoutEnabled();
    // This path becomes reachable only after explicit founder-reviewed activation.
    const { quote, networkId } = await prepareAbraPaymentQuote({
      partnerId, applicationId: application.id,
      creditCents: eligibility.charge_cents,
    });
    await persistAbraPaymentQuote(quote, networkId);
    return launchpadJson({ ok: true, quote }, 201);
  } catch (error) {
    if (error instanceof AbraQuoteUnavailable || error instanceof Error && error.message === "abra_checkout_disabled")
      return launchpadError("abra_checkout_unavailable", 503);
    return launchpadError("billing_unavailable", 503);
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  const access = await authorize(req, params.id);
  if (!access.ok) return access.response;
  const application = access.application;
  const partnerId = access.partnerId;
  if (!application || !partnerId) return launchpadError("not_found", 404);
  let body: { intent_id?: unknown; signature?: unknown };
  try { body = await req.json(); } catch { return launchpadError("invalid_json", 400); }
  const intentId = String(body.intent_id ?? "");
  const signature = String(body.signature ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(intentId) || !/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature))
    return launchpadError("invalid_payment_reference", 400);
  try {
    assertAbraCheckoutEnabled();
    const status = await settleAbraPayment({ partnerId,
      applicationId: application.id, intentId, signature });
    return launchpadJson({ ok: true, status });
  } catch {
    return launchpadError("abra_checkout_unavailable", 503);
  }
}

