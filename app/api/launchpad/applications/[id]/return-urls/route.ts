// FILE: app/api/launchpad/applications/[id]/return-urls/route.ts

import { NextRequest } from "next/server";
import {
  enforceLaunchpadRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { validateLaunchpadReturnUrl } from "@/lib/partner/launchpad/returnUrl";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/return-urls", 20);
  if (limited) return limited;

  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }

  let body: { return_url?: string };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  const returnUrl = String(body.return_url ?? "").trim();
  const check = validateLaunchpadReturnUrl(returnUrl);
  if (!check.ok) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected, 400);
  }

  const merged = Array.from(new Set([...app.allowed_return_urls, returnUrl]));
  const sb = requireSupabaseAdmin();
  const { error } = await sb
    .from("partner_launchpad_applications")
    .update({ allowed_return_urls: merged, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("partner_id", auth.session.partnerId);

  if (error) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 500);
  }

  await sb.from("partners").update({
    allowed_return_urls: merged,
    updated_at: new Date().toISOString(),
  }).eq("partner_id", auth.session.partnerId);

  return launchpadJson({ ok: true, allowed_return_urls: merged });
}
