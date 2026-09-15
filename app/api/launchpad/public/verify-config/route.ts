// FILE: app/api/launchpad/public/verify-config/route.ts
// Public hosted verification config resolution by application slug.

import { NextRequest } from "next/server";
import { launchpadError, launchpadJson } from "@/lib/partner/launchpad/apiHelpers";
import { resolveLaunchpadVerifyConfig } from "@/lib/partner/launchpad/resolveLaunchpadVerifyInput";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const app = req.nextUrl.searchParams.get("app")?.trim() ?? "";
  const returnUrl = req.nextUrl.searchParams.get("return_url")?.trim() ?? "";

  const resolved = await resolveLaunchpadVerifyConfig({ publicSlug: app, returnUrl });
  if (!resolved.ok) {
    const status = resolved.code === "launchpad_application_not_found" ? 404 : 400;
    return launchpadError(resolved.code, status, resolved.message);
  }

  try {
    const sb = requireSupabaseAdmin();
    await recordLaunchpadActivity(sb, {
      applicationId: resolved.config.applicationId,
      partnerId: resolved.config.partnerId,
      eventType: "verification_started",
      publicCode: "hosted_opened",
    });
    await recordLaunchpadActivity(sb, {
      applicationId: resolved.config.applicationId,
      partnerId: resolved.config.partnerId,
      eventType: "disclosure_viewed",
      publicCode: "disclosure_ready",
    });
  } catch {
    /* activity is best effort for public resolve */
  }

  return launchpadJson({
    ok: true,
    config: {
      partner_id: resolved.config.partnerId,
      policy_id: resolved.config.policyId,
      policy_version: resolved.config.policyVersion,
      return_url: resolved.config.returnUrl,
      display_name: resolved.config.displayName,
      user_explanation: resolved.config.userExplanation,
      disclosed_result: resolved.config.disclosedResult,
      environment: resolved.config.environment,
      public_slug: resolved.config.publicSlug,
    },
  });
}
