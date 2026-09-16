// FILE: app/api/launchpad/staging/environment/route.ts
// Non-sensitive preview identity for Launchpad staging smoke precondition checks.

import { NextResponse } from "next/server";
import {
  getLaunchpadStagingIdentityLogContext,
  resolveLaunchpadStagingEnvironment,
} from "@/lib/partner/launchpad/stagingEnvironment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function stagingIdentityResponse(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  const res = NextResponse.json(body, { status });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

export async function GET() {
  const result = resolveLaunchpadStagingEnvironment();
  console.info("[launchpad/staging/environment]", getLaunchpadStagingIdentityLogContext(result));

  if (!result.ok) {
    if (result.reason === "not_allowed") {
      return stagingIdentityResponse({ ok: false, code: "not_found" }, 404);
    }
    return stagingIdentityResponse({ ok: false, code: "staging_identity_unavailable" }, 503);
  }

  return stagingIdentityResponse(
    {
      deployment_environment: result.identity.deployment_environment,
      supabase_project_ref: result.identity.supabase_project_ref,
      commit_sha: result.identity.commit_sha,
    },
    200,
  );
}
