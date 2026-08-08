// FILE: app/api/passport/privacy/requests/route.ts
// Holder privacy requests — view and create export/deletion requests.

import { NextRequest, NextResponse } from "next/server";
import { requireBrowserSession } from "@/lib/auth/browserSession";
import {
  createPrivacyRequest,
  listPrivacyRequestsForSubject,
} from "@/lib/privacy/privacyControlPlane";
import { isPrivacyRequestType } from "@/lib/privacy/types";
import {
  DELETION_SAFETY_NOTE,
  EXPORT_DELIVERY_NOTE,
  PRIVACY_DATA_CATEGORIES,
  PRIVACY_CENTER_DISCLAIMER,
} from "@/lib/privacy/privacyDataInventory";

export async function GET(req: NextRequest) {
  const sessionResult = await requireBrowserSession(req);
  if (!sessionResult.ok) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const requests = await listPrivacyRequestsForSubject(sessionResult.session.suiAddress);
    return NextResponse.json({
      disclaimer: PRIVACY_CENTER_DISCLAIMER,
      data_categories: PRIVACY_DATA_CATEGORIES.map(c => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        partner_exposure: c.partnerExposure,
      })),
      export_note: EXPORT_DELIVERY_NOTE,
      deletion_note: DELETION_SAFETY_NOTE,
      requests,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Privacy requests unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const sessionResult = await requireBrowserSession(req);
  if (!sessionResult.ok) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    request_type?: string;
    idempotency_key?: string;
  };

  if (!body.request_type || !isPrivacyRequestType(body.request_type)) {
    return NextResponse.json({ error: "request_type must be data_export or account_deletion" }, { status: 400 });
  }

  try {
    const result = await createPrivacyRequest({
      subjectSui: sessionResult.session.suiAddress,
      requestType: body.request_type,
      idempotencyKey: body.idempotency_key,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      request: result.request,
      created: result.created,
      message: body.request_type === "data_export"
        ? EXPORT_DELIVERY_NOTE
        : DELETION_SAFETY_NOTE,
    }, { status: result.created ? 201 : 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
