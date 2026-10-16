// FILE: lib/institutionalVerification/sdkDownload.ts
// Orchestrates entitlement, artifact validation, and mandatory audit for SDK download.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeLaunchpadActivityMetadata } from "@/lib/privacy/selectiveDisclosure";
import { evaluateInstitutionalSdkEntitlement } from "./sdkDistributionEntitlement";
import { validateInstitutionalSdkArtifact } from "./sdkArtifact";
import { readPackageVersionFromEnv } from "./sdkReleaseHelpers";

export type InstitutionalSdkDownloadDecision =
  | {
      ok: true;
      buffer: Buffer;
      size_bytes: number;
      approved_sha256: string;
      filename: string;
      package_version: string;
    }
  | {
      ok: false;
      http_status: number;
      code: string;
      message?: string;
    };

export async function recordInstitutionalSdkDownloadAudit(input: {
  sb: SupabaseClient;
  applicationId: string;
  partnerId: string;
  packageVersion: string;
  approvedSha256Prefix: string;
}): Promise<{ ok: true } | { ok: false; code: "institutional_sdk_audit_failed" }> {
  try {
    const { error } = await input.sb.from("partner_launchpad_activity").insert({
      application_id: input.applicationId,
      partner_id: input.partnerId,
      event_type: "disclosure_viewed",
      public_code: "institutional_sdk_tarball_download",
      metadata: sanitizeLaunchpadActivityMetadata({
        package_version: input.packageVersion,
        approved_sha256_prefix: input.approvedSha256Prefix,
      }),
    });
    if (error) {
      return { ok: false, code: "institutional_sdk_audit_failed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, code: "institutional_sdk_audit_failed" };
  }
}

/**
 * Download audit persistence is mandatory before serving bytes.
 * Authorization or artifact failures never reach audit; audit failure returns 503 and does not serve the tarball.
 */
export async function prepareInstitutionalSdkDownload(input: {
  partnerId: string;
  applicationId: string;
  env?: Record<string, string | undefined>;
  sb: SupabaseClient;
  now?: Date;
}): Promise<InstitutionalSdkDownloadDecision> {
  const env = input.env ?? process.env;
  const packageVersion = readPackageVersionFromEnv(env);

  const entitlement = evaluateInstitutionalSdkEntitlement({
    partnerId: input.partnerId,
    packageVersion,
    applicationId: input.applicationId,
    env,
    now: input.now,
  });
  if (!entitlement.ok) {
    return { ok: false, http_status: 403, code: entitlement.code };
  }

  const artifact = validateInstitutionalSdkArtifact(env);
  if (!artifact.ok) {
    const status = artifact.code === "artifact_release_not_configured" ? 403 : 503;
    return { ok: false, http_status: status, code: artifact.code };
  }

  const audit = await recordInstitutionalSdkDownloadAudit({
    sb: input.sb,
    applicationId: input.applicationId,
    partnerId: input.partnerId,
    packageVersion: artifact.package_version,
    approvedSha256Prefix: artifact.approved_sha256.slice(0, 12),
  });
  if (!audit.ok) {
    return { ok: false, http_status: 503, code: audit.code };
  }

  return {
    ok: true,
    buffer: artifact.buffer,
    size_bytes: artifact.size_bytes,
    approved_sha256: artifact.approved_sha256,
    filename: artifact.filename,
    package_version: artifact.package_version,
  };
}
