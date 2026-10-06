// FILE: app/api/v1/partner-verify/good-trouble/dob-prequal/route.ts
// Canonical Good Trouble purchase DOB prequal — transient DOB, age-band cookie only.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import { evaluateGoodTroublePurchaseDobPrequal } from "@/lib/partner/goodTroublePurchaseDobPrequal";
import {
  attachGoodTroubleDobPrequalCookie,
  signGoodTroubleDobPrequalCookie,
  verifyGoodTroubleDobPrequalCookie,
  GOOD_TROUBLE_DOB_PREQUAL_COOKIE,
} from "@/lib/partner/goodTroublePurchaseDobCookie";
import { resolveBoundPartnerContinuation } from "@/lib/partner/resolveBoundPartnerContinuation";
import { isCanonicalGoodTroublePurchaseFlow } from "@/lib/partner/goodTroublePurchaseFlow";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: session.error }, { status: session.status });
  }

  const verifyRequest = request.nextUrl.searchParams.get("verify_request")?.trim() ?? "";
  if (!verifyRequest) {
    return NextResponse.json({ ok: false, code: "missing" }, { status: 400 });
  }

  const token = request.cookies.get(GOOD_TROUBLE_DOB_PREQUAL_COOKIE)?.value;
  const record = token ? await verifyGoodTroubleDobPrequalCookie(token) : null;
  if (!record || record.verifyRequestId !== verifyRequest) {
    return NextResponse.json({ ok: true, prequal_complete: false });
  }

  return NextResponse.json({
    ok: true,
    prequal_complete: true,
    age_band: record.ageBand,
    eligible_for_idv: record.ageBand === "over_21",
  });
}

export async function POST(request: NextRequest) {
  const session = await requireBrowserSession(request);
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: session.error }, { status: session.status });
  }

  let body: {
    verify_request?: string;
    date_of_birth?: string;
    partner_id?: string;
    policy_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_json" }, { status: 400 });
  }

  const verifyRequest = body.verify_request?.trim() ?? "";
  const dateOfBirth = body.date_of_birth?.trim() ?? "";
  if (!verifyRequest || !dateOfBirth) {
    return NextResponse.json({ ok: false, code: "missing" }, { status: 400 });
  }

  const bound = await resolveBoundPartnerContinuation({
    request,
    verifyRequestId: verifyRequest,
    sessionSubject: session.session.suiAddress,
  });
  if (!bound.ok) {
    return NextResponse.json({ ok: false, code: bound.code }, { status: 400 });
  }

  if (!isCanonicalGoodTroublePurchaseFlow({
    partnerId: bound.stored.partnerId,
    policyId: bound.stored.policyId,
    purpose: bound.stored.purpose,
  })) {
    return NextResponse.json({ ok: false, code: "flow_not_eligible" }, { status: 403 });
  }

  const evaluated = evaluateGoodTroublePurchaseDobPrequal({
    partnerId: bound.stored.partnerId,
    policyId: bound.stored.policyId,
    purpose: bound.stored.purpose,
    dateOfBirth,
  });
  if (!evaluated.ok) {
    return NextResponse.json({ ok: false, code: evaluated.code }, { status: evaluated.status });
  }

  const token = await signGoodTroubleDobPrequalCookie({
    verifyRequestId: verifyRequest,
    partnerId: bound.stored.partnerId,
    policyId: bound.stored.policyId,
    ageBand: evaluated.age_band,
  });
  const res = NextResponse.json({
    ok: true,
    age_band: evaluated.age_band,
    eligible_for_idv: evaluated.age_band === "over_21",
    valid_for_authoritative_decision: evaluated.valid_for_authoritative_decision,
  });
  if (token) attachGoodTroubleDobPrequalCookie(res, token);
  return res;
}
