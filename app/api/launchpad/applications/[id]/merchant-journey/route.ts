// FILE: app/api/launchpad/applications/[id]/merchant-journey/route.ts
// Canonical merchant journey state derived from authoritative backend evidence.

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { loadMerchantJourneyForApplication } from "@/lib/partner/launchpad/merchantJourney/load";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

async function activeSandboxKey(applicationId: string, apiKeyId: string | null): Promise<boolean> {
  if (!apiKeyId) return false;
  try {
    const sb = requireSupabaseAdmin();
    const { data } = await sb
      .from("partner_api_keys")
      .select("id, revoked_at")
      .eq("id", apiKeyId)
      .maybeSingle();
    return Boolean(data && !data.revoked_at);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/merchant-journey",
    auth.session.partnerId,
    60,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  const sandboxKey = await activeSandboxKey(app.id, app.api_key_id);
  const loaded = await loadMerchantJourneyForApplication({
    application: app,
    partnerId: auth.session.partnerId,
    activeSandboxKey: sandboxKey,
    productionActivated: app.environment === "production" && Boolean(app.production_activated_at),
  });

  return launchpadJson({
    ok: true,
    journey: loaded.journey,
    summary: loaded.summary,
    evidence: {
      verified_receipt_count: loaded.input.verifiedReceiptCount,
      starter_kit_evidenced: loaded.input.starterKitEvidenced,
      active_sandbox_key: loaded.input.activeSandboxKey,
      hosted_handoff_completed_count: loaded.integration.hosted_handoff_completed_count,
      receipt_verification_succeeded_count: loaded.integration.receipt_verification_succeeded_count,
    },
  });
}
