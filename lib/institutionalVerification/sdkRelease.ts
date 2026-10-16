// FILE: lib/institutionalVerification/sdkRelease.ts
// Controlled @abraxas/institutional-verification release metadata (Build #588).

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION } from "./contract";
import { RECEIPT_TRUST_DIGEST_VERSION } from "./trustMaterial";

export const INSTITUTIONAL_SDK_PACKAGE_NAME = "@abraxas/institutional-verification" as const;

export type InstitutionalSdkDistributionMode = "request_access" | "authorized" | "artifact_missing";

export type InstitutionalSdkReleaseView = {
  package_name: typeof INSTITUTIONAL_SDK_PACKAGE_NAME;
  package_version: string;
  contract_version: typeof INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION;
  digest_version: typeof RECEIPT_TRUST_DIGEST_VERSION;
  release_status: InstitutionalSdkDistributionMode;
  supported_runtime: string;
  integrity: {
    tarball_sha256: string | null;
    tarball_size_bytes: number | null;
    tarball_filename: string | null;
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

function readPackageVersion(env: Record<string, string | undefined>): string {
  const override = env.INSTITUTIONAL_SDK_PACKAGE_VERSION?.trim();
  if (override) return override;
  try {
    const pkgPath = path.join(process.cwd(), "packages/abraxas-institutional-verification/package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    return typeof parsed.version === "string" ? parsed.version : "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function allowedTarballRoots(cwd: string): string[] {
  return [
    path.join(cwd, "packages/abraxas-institutional-verification"),
    path.join(cwd, ".institutional-sdk-artifacts"),
  ];
}

function isPathUnderRoots(resolved: string, roots: string[]): boolean {
  const normalized = path.resolve(resolved);
  return roots.some((root) => {
    const base = path.resolve(root);
    return normalized === base || normalized.startsWith(`${base}${path.sep}`);
  });
}

export function resolveInstitutionalSdkTarballPath(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const cwd = process.cwd();
  const roots = allowedTarballRoots(cwd);
  const version = readPackageVersion(env);
  const filename = `abraxas-institutional-verification-${version}.tgz`;

  const custom = env.INSTITUTIONAL_SDK_TARBALL_PATH?.trim();
  if (custom) {
    const resolved = path.resolve(custom);
    if (!isPathUnderRoots(resolved, roots)) return null;
    return resolved;
  }

  return path.join(cwd, "packages/abraxas-institutional-verification", filename);
}

function sha256File(filePath: string): string {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

export function resolveInstitutionalSdkDistributionMode(
  env: Record<string, string | undefined> = process.env,
): InstitutionalSdkDistributionMode {
  const mode = (env.INSTITUTIONAL_SDK_DISTRIBUTION_MODE ?? "request_access").trim().toLowerCase();
  if (mode !== "authorized") return "request_access";
  const tarball = resolveInstitutionalSdkTarballPath(env);
  if (!tarball || !existsSync(tarball)) return "artifact_missing";
  return "authorized";
}

export function buildInstitutionalSdkReleaseView(input?: {
  env?: Record<string, string | undefined>;
  downloadHref?: string | null;
}): InstitutionalSdkReleaseView {
  const env = input?.env ?? process.env;
  const version = readPackageVersion(env);
  const tarballPath = resolveInstitutionalSdkTarballPath(env);
  const mode = resolveInstitutionalSdkDistributionMode(env);

  let sha256: string | null = null;
  let sizeBytes: number | null = null;
  let filename: string | null = null;
  if (tarballPath && existsSync(tarballPath)) {
    filename = path.basename(tarballPath);
    const stat = statSync(tarballPath);
    sizeBytes = stat.size;
    sha256 = sha256File(tarballPath);
  }

  const downloadAvailable = mode === "authorized" && Boolean(tarballPath && existsSync(tarballPath));
  const installLine = filename
    ? `npm install ./${filename}`
    : `npm install ./abraxas-institutional-verification-${version}.tgz`;

  let notice: string;
  if (mode === "authorized" && downloadAvailable) {
    notice =
      "Founder-authorized SDK distribution is enabled for this deployment. Download requires an authenticated institutional Launchpad session.";
  } else if (mode === "artifact_missing") {
    notice =
      "Distribution mode is authorized but no release tarball is present on the server. Maintainers run npm run pack:institutional-sdk; founder approval required before enabling downloads.";
  } else {
    notice =
      "The institutional verification SDK is not publicly published to npm. Request founder-approved tarball access or build from a licensed checkout.";
  }

  return {
    package_name: INSTITUTIONAL_SDK_PACKAGE_NAME,
    package_version: version,
    contract_version: INSTITUTIONAL_VERIFICATION_CONTRACT_VERSION,
    digest_version: RECEIPT_TRUST_DIGEST_VERSION,
    release_status: mode,
    supported_runtime: "Node.js >= 20",
    integrity: {
      tarball_sha256: sha256,
      tarball_size_bytes: sizeBytes,
      tarball_filename: filename,
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
      reason_code: downloadAvailable
        ? null
        : mode === "artifact_missing"
          ? "artifact_missing"
          : "distribution_not_authorized",
    },
    notice,
  };
}
