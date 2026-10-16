// FILE: lib/institutionalVerification/sdkRelease.ts
// Controlled @abraxas/institutional-verification release metadata (Build #588).

import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import { RECEIPT_TRUST_DIGEST_VERSION } from "./trustMaterial";
import {
  isInstitutionalSdkArtifactReleaseEnabled,
  readApprovedInstitutionalSdkTarballSha256,
  resolveInstitutionalSdkTarballCandidatePath,
  validateInstitutionalSdkArtifact,
} from "./sdkArtifact";
import {
  evaluateInstitutionalSdkEntitlement,
  type InstitutionalSdkEntitlementStatus,
} from "./sdkDistributionEntitlement";
import { readPackageVersionFromEnv } from "./sdkReleaseHelpers";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

export const INSTITUTIONAL_SDK_PACKAGE_NAME = "@abraxas/institutional-verification" as const;

export type InstitutionalSdkDistributionMode =
  | "request_access"
  | "artifact_missing"
  | "artifact_integrity_blocked"
  | "entitlement_required";

export type InstitutionalSdkReleaseView = {
  package_name: typeof INSTITUTIONAL_SDK_PACKAGE_NAME;
  package_version: string;
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  digest_version: typeof RECEIPT_TRUST_DIGEST_VERSION;
  release_status: InstitutionalSdkDistributionMode;
  supported_runtime: string;
  integrity: {
    approved_tarball_sha256: string | null;
    artifact_matches_approved_digest: boolean;
    tarball_size_bytes: number | null;
    tarball_filename: string | null;
  };
  entitlement: {
    status: InstitutionalSdkEntitlementStatus | "unconfigured";
    reason_code: string | null;
  };
  installation: {
    npm_install_from_tarball: string;
    maintainer_pack_command: string;
  };
  documentation_href: string;
  migration_href: string;
  request_access_href: string;
  download: {
    available: boolean;
    href: string | null;
    reason_code: string | null;
  };
  notice: string;
};

export function resolveInstitutionalSdkTarballPath(
  env: Record<string, string | undefined> = process.env,
): string | null {
  return resolveInstitutionalSdkTarballCandidatePath(env);
}

/** @deprecated Use isInstitutionalSdkArtifactReleaseEnabled — global flag does not grant partner download. */
export function resolveInstitutionalSdkDistributionMode(
  env: Record<string, string | undefined> = process.env,
): InstitutionalSdkDistributionMode {
  if (!isInstitutionalSdkArtifactReleaseEnabled(env)) return "request_access";
  const approved = readApprovedInstitutionalSdkTarballSha256(env);
  if (!approved) return "artifact_integrity_blocked";
  const candidate = resolveInstitutionalSdkTarballCandidatePath(env);
  if (!candidate || !existsSync(candidate)) return "artifact_missing";
  const validated = validateInstitutionalSdkArtifact(env);
  if (!validated.ok) return "artifact_integrity_blocked";
  return "entitlement_required";
}

export function buildInstitutionalSdkReleaseView(input?: {
  env?: Record<string, string | undefined>;
  downloadHref?: string | null;
  partnerId?: string | null;
  applicationId?: string | null;
}): InstitutionalSdkReleaseView {
  const env = input?.env ?? process.env;
  const version = readPackageVersionFromEnv(env);
  const approvedSha = readApprovedInstitutionalSdkTarballSha256(env);
  const artifactValidation = validateInstitutionalSdkArtifact(env);

  let tarballSize: number | null = null;
  let filename: string | null = `abraxas-institutional-verification-${version}.tgz`;
  const candidate = resolveInstitutionalSdkTarballCandidatePath(env);
  if (candidate && existsSync(candidate)) {
    try {
      tarballSize = statSync(candidate).size;
      filename = path.basename(candidate);
    } catch {
      tarballSize = null;
    }
  }

  const artifactMatches =
    artifactValidation.ok && approvedSha !== null && artifactValidation.approved_sha256 === approvedSha;

  let entitlementStatus: InstitutionalSdkEntitlementStatus | "unconfigured" = "unconfigured";
  let entitlementReason: string | null = "institutional_sdk_entitlement_not_granted";
  if (input?.partnerId && input.applicationId) {
    const decision = evaluateInstitutionalSdkEntitlement({
      partnerId: input.partnerId,
      packageVersion: version,
      applicationId: input.applicationId,
      env,
    });
    if (decision.ok) {
      entitlementStatus = "granted";
      entitlementReason = null;
    } else {
      entitlementStatus = decision.status;
      entitlementReason = decision.code;
    }
  }

  const artifactReady = artifactValidation.ok;
  const downloadAvailable = artifactReady && entitlementStatus === "granted";

  let releaseStatus: InstitutionalSdkDistributionMode = "request_access";
  if (isInstitutionalSdkArtifactReleaseEnabled(env)) {
    if (!approvedSha) releaseStatus = "artifact_integrity_blocked";
    else if (!candidate || !existsSync(candidate)) releaseStatus = "artifact_missing";
    else if (!artifactReady) releaseStatus = "artifact_integrity_blocked";
    else releaseStatus = "entitlement_required";
  }

  const installLine = filename
    ? `npm install ./${filename}`
    : `npm install ./abraxas-institutional-verification-${version}.tgz`;

  let notice: string;
  if (downloadAvailable) {
    notice =
      "Partner-specific SDK entitlement is active and the deployment artifact matches the founder-approved digest. Download requires Launchpad session for this partner and application.";
  } else if (releaseStatus === "artifact_missing") {
    notice =
      "Artifact release is configured but the versioned tarball is not present on the server. Maintainers run npm run pack:institutional-sdk and set INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256 independently.";
  } else if (releaseStatus === "artifact_integrity_blocked") {
    notice =
      "Artifact release requires INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256 (founder-approved) and a matching on-disk tarball. Computed digests alone do not authorize delivery.";
  } else if (entitlementStatus !== "granted" && artifactReady) {
    notice =
      "Release artifact verified, but this partner is not on the operator-controlled SDK entitlement allowlist (INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS). Request access via design partner review.";
  } else {
    notice =
      "The institutional verification SDK is not publicly published to npm. Request founder-approved tarball access or build from a licensed checkout.";
  }

  let downloadReason: string | null = null;
  if (!downloadAvailable) {
    if (!artifactReady) {
      downloadReason = artifactValidation.ok === false ? artifactValidation.code : "artifact_missing";
    } else if (entitlementReason) {
      downloadReason = entitlementReason;
    } else {
      downloadReason = "distribution_not_authorized";
    }
  }

  return {
    package_name: INSTITUTIONAL_SDK_PACKAGE_NAME,
    package_version: version,
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    digest_version: RECEIPT_TRUST_DIGEST_VERSION,
    release_status: releaseStatus,
    supported_runtime: "Node.js >= 20",
    integrity: {
      approved_tarball_sha256: approvedSha,
      artifact_matches_approved_digest: artifactMatches,
      tarball_size_bytes: artifactValidation.ok ? artifactValidation.size_bytes : tarballSize,
      tarball_filename: filename,
    },
    entitlement: {
      status: entitlementStatus,
      reason_code: entitlementReason,
    },
    installation: {
      npm_install_from_tarball: installLine,
      maintainer_pack_command: "npm run pack:institutional-sdk",
    },
    documentation_href: "/developers/institutional-verification",
    migration_href: "/developers/institutional-verification",
    request_access_href: "/design-partner",
    download: {
      available: downloadAvailable,
      href: downloadAvailable ? (input?.downloadHref ?? null) : null,
      reason_code: downloadReason,
    },
    notice,
  };
}
