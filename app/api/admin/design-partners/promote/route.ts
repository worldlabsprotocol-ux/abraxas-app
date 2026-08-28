// FILE: app/api/admin/design-partners/promote/route.ts
// Promote approved application → sandbox partner org + abx_test_ API key (atomic v2 RPC).

import { NextRequest, NextResponse } from "next/server";
import { resolveDesignPartnerAdminActorCategory } from "@/lib/admin/designPartnerAdminActor";
import { mapPromoteRpcCodeToHttpStatus, parseDesignPartnerPromoteRequestBody } from "@/lib/admin/designPartnerApplicationLifecycle";
import {
  DesignPartnerPromoteError,
  promoteDesignPartnerApplication,
} from "@/lib/partner/promoteDesignPartner";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const rawBody = await req.json().catch(() => null);
  const parsedBody = parseDesignPartnerPromoteRequestBody(rawBody);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const actorCategory = await resolveDesignPartnerAdminActorCategory(req);

  try {
    const result = await promoteDesignPartnerApplication({
      applicationId: parsedBody.value.applicationId,
      partnerId: parsedBody.value.partnerId,
      actorCategory,
    });

    return NextResponse.json({
      ok: true,
      partner_id: result.partner_id,
      key_prefix: result.key_prefix,
      application_id: result.application_id,
      api_key: result.api_key,
      notice: "Copy api_key now — it will not be shown again. Share via secure channel only.",
    });
  } catch (err) {
    if (err instanceof DesignPartnerPromoteError) {
      return NextResponse.json(
        { error: err.code },
        { status: mapPromoteRpcCodeToHttpStatus(err.code) },
      );
    }
    return NextResponse.json({ error: "promotion_failed" }, { status: 500 });
  }
}
