// FILE: app/api/launchpad/applications/[id]/institutional-verification-sdk/download/route.ts
// Authenticated, institution-scoped SDK tarball delivery (Build #588).

import { readFileSync, statSync } from "node:fs";
import { NextRequest } from "next/server";
import {
  enforceLaunchpadTenantRateLimit,
  launchpadError,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import {
  buildInstitutionalSdkReleaseView,
  resolveInstitutionalSdkDistributionMode,
  resolveInstitutionalSdkTarballPath,
} from "@/lib/institutionalVerification/sdkRelease";
import { isInstitutionalSandboxApplication } from "@/lib/partner/launchpad/loadInstitutionalIntegrationWorkspace";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";

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

  const mode = resolveInstitutionalSdkDistributionMode();
  const release = buildInstitutionalSdkReleaseView({
    downloadHref: `/api/launchpad/applications/${app.id}/institutional-verification-sdk/download`,
  });

  if (!release.download.available) {
    return launchpadError(
      release.download.reason_code ?? "distribution_not_authorized",
      403,
      release.notice,
    );
  }

  const tarballPath = resolveInstitutionalSdkTarballPath();
  if (!tarballPath) {
    return launchpadError("artifact_path_invalid", 503);
  }

  let sizeBytes: number;
  try {
    sizeBytes = statSync(tarballPath).size;
  } catch {
    return launchpadError("artifact_missing", 503);
  }

  const sb = requireSupabaseAdmin();
  await recordLaunchpadActivity(sb, {
    applicationId: app.id,
    partnerId: auth.session.partnerId,
    eventType: "disclosure_viewed",
    publicCode: "institutional_sdk_tarball_download",
    metadata: {
      package_version: release.package_version,
      distribution_mode: mode,
      tarball_sha256_prefix: release.integrity.tarball_sha256?.slice(0, 12) ?? null,
    },
  });

  const body = readFileSync(tarballPath);
  const filename = release.integrity.tarball_filename ?? "abraxas-institutional-verification.tgz";

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(sizeBytes),
      "Cache-Control": "private, no-store",
      "X-Abraxas-Sdk-Package-Version": release.package_version,
      "X-Abraxas-Sdk-Contract-Version": release.contract_version,
    },
  });
}
