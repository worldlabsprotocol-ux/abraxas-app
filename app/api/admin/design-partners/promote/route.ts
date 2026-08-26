// FILE: app/api/admin/design-partners/promote/route.ts
// Promote approved application → sandbox partner org + abx_test_ API key (atomic RPC).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkProductionSensitiveAdminAccess } from "@/lib/adminAuth";
import { mapPromoteRpcCodeToHttpStatus } from "@/lib/admin/designPartnerApplicationLifecycle";
import {
  DesignPartnerPromoteError,
  promoteDesignPartnerApplication,
} from "@/lib/partner/promoteDesignPartner";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export async function POST(req: NextRequest) {
  if (!await checkProductionSensitiveAdminAccess(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SB_URL || !SB_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    application_id?: string;
    partner_id?: string;
  };

  if (!body.application_id) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb
    .from("design_partners")
    .select("id, company, contact_name, email, use_case, integration_type, public_name_ok, status, promoted_partner_id")
    .eq("id", body.application_id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "application_not_found" }, { status: 404 });
  }

  try {
    const result = await promoteDesignPartnerApplication(data, {
      partner_id: body.partner_id,
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
