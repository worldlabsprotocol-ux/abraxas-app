// FILE: lib/institutionalVerification/sdkArtifact.ts
// Secure institutional SDK tarball resolution and approved-digest validation.

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export const INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256_ENV = "INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256";

export type InstitutionalSdkArtifactValidation =
  | {
      ok: true;
      buffer: Buffer;
      size_bytes: number;
      computed_sha256: string;
      approved_sha256: string;
      filename: string;
      package_version: string;
    }
  | {
      ok: false;
      code:
        | "artifact_release_not_configured"
        | "approved_digest_missing"
        | "approved_digest_invalid"
        | "artifact_path_invalid"
        | "artifact_missing"
        | "artifact_not_regular_file"
        | "artifact_symlink_escape"
        | "artifact_version_mismatch"
        | "artifact_digest_mismatch";
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

export function resolveInstitutionalSdkTarballCandidatePath(
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

function normalizeSha256(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(trimmed)) return null;
  return trimmed;
}

export function readApprovedInstitutionalSdkTarballSha256(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env[INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256_ENV]?.trim();
  if (!raw) return null;
  return normalizeSha256(raw);
}

export function isInstitutionalSdkArtifactReleaseEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  const mode = (env.INSTITUTIONAL_SDK_DISTRIBUTION_MODE ?? "request_access").trim().toLowerCase();
  return mode === "authorized";
}

export function validateInstitutionalSdkArtifact(
  env: Record<string, string | undefined> = process.env,
): InstitutionalSdkArtifactValidation {
  if (!isInstitutionalSdkArtifactReleaseEnabled(env)) {
    return { ok: false, code: "artifact_release_not_configured" };
  }

  const approved = readApprovedInstitutionalSdkTarballSha256(env);
  if (!approved) {
    return { ok: false, code: "approved_digest_missing" };
  }

  const candidate = resolveInstitutionalSdkTarballCandidatePath(env);
  if (!candidate) {
    return { ok: false, code: "artifact_path_invalid" };
  }

  if (!existsSync(candidate)) {
    return { ok: false, code: "artifact_missing" };
  }

  const version = readPackageVersion(env);
  const expectedName = `abraxas-institutional-verification-${version}.tgz`;
  if (path.basename(candidate) !== expectedName) {
    return { ok: false, code: "artifact_version_mismatch" };
  }

  let stat;
  try {
    stat = lstatSync(candidate);
  } catch {
    return { ok: false, code: "artifact_missing" };
  }

  let resolvedPath: string;
  try {
    resolvedPath = realpathSync(candidate);
  } catch {
    return { ok: false, code: "artifact_missing" };
  }

  const cwd = process.cwd();
  if (!isPathUnderRoots(resolvedPath, allowedTarballRoots(cwd))) {
    return { ok: false, code: "artifact_symlink_escape" };
  }

  let fileStat;
  try {
    fileStat = lstatSync(resolvedPath);
  } catch {
    return { ok: false, code: "artifact_missing" };
  }

  if (!fileStat.isFile()) {
    return { ok: false, code: "artifact_not_regular_file" };
  }

  let buffer: Buffer;
  try {
    buffer = readFileSync(resolvedPath);
  } catch {
    return { ok: false, code: "artifact_missing" };
  }

  if (buffer.length !== fileStat.size) {
    return { ok: false, code: "artifact_digest_mismatch" };
  }

  const computed = createHash("sha256").update(buffer).digest("hex");
  if (computed !== approved) {
    return { ok: false, code: "artifact_digest_mismatch" };
  }

  return {
    ok: true,
    buffer,
    size_bytes: buffer.length,
    computed_sha256: computed,
    approved_sha256: approved,
    filename: expectedName,
    package_version: version,
  };
}
