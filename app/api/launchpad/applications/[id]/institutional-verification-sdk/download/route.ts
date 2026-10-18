// FILE: app/api/launchpad/applications/[id]/institutional-verification-sdk/download/route.ts
// Authenticated, institution-scoped SDK tarball delivery (Build #588).

import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "@/lib/institutionalVerification/contract";
import { isInstitutionalSandboxApplication } from "@/lib/partner/launchpad/loadInstitutionalIntegrationWorkspace";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { prepareInstitutionalSdkDownload } from "@/lib/institutionalVerification/sdkDownload";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const limited = await enforceLaunchpadTenantRateLimit(
    req,
    "/api/launchpad/institutional-verification-sdk/download",
    auth.session.partnerId,
    6,
  );
  if (limited) return limited;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  if (!isInstitutionalSandboxApplication(app)) {
    return launchpadError("not_institutional_application", 403);
  }

  const sb = requireSupabaseAdmin();
  const prepared = await prepareInstitutionalSdkDownload({
    partnerId: auth.session.partnerId,
    applicationId: app.id,
    sb,
  });

  if (!prepared.ok) {
    return launchpadError(prepared.code, prepared.http_status, prepared.message);
  }

  return new Response(new Uint8Array(prepared.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${prepared.filename}"`,
      "Content-Length": String(prepared.size_bytes),
      "Cache-Control": "private, no-store",
      "X-Abraxas-Sdk-Package-Version": prepared.package_version,
      "X-Abraxas-Sdk-Contract-Version": INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
      "X-Abraxas-Sdk-Approved-Sha256": prepared.approved_sha256,
    },
  });
}
