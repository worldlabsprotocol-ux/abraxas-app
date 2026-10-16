// FILE: lib/partner/build588.sdkDistributionAccess.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateInstitutionalSdkEntitlement } from "@/lib/institutionalVerification/sdkDistributionEntitlement";
import { validateInstitutionalSdkArtifact } from "@/lib/institutionalVerification/sdkArtifact";
import { buildInstitutionalSdkReleaseView } from "@/lib/institutionalVerification/sdkRelease";
import { prepareInstitutionalSdkDownload } from "@/lib/institutionalVerification/sdkDownload";

const ENTITLEMENTS = JSON.stringify([
  { partner_id: "partner-a", package_version: "0.1.0" },
  {
    partner_id: "partner-b",
    package_version: "0.1.0",
    expires_at: "2020-01-01T00:00:00.000Z",
  },
  {
    partner_id: "partner-c",
    package_version: "0.1.0",
    application_ids: ["app-c-only"],
  },
]);

function baseEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    INSTITUTIONAL_SDK_DISTRIBUTION_MODE: "authorized",
    INSTITUTIONAL_SDK_PACKAGE_VERSION: "0.1.0",
    ...extra,
  };
}

function writeArtifactUnderAllowedRoot(content: Buffer): { filePath: string; approved: string; cleanup: () => void } {
  const artifactsRoot = path.join(process.cwd(), ".institutional-sdk-artifacts");
  mkdirSync(artifactsRoot, { recursive: true });
  const filename = "abraxas-institutional-verification-0.1.0.tgz";
  const filePath = path.join(artifactsRoot, filename);
  rmSync(filePath, { force: true });
  writeFileSync(filePath, content);
  const approved = createHash("sha256").update(content).digest("hex");
  return {
    filePath,
    approved,
    cleanup: () => {
      try {
        rmSync(filePath, { force: true });
      } catch {
        /* ignore */
      }
    },
  };
}

describe("Build #588 SDK distribution access control", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("denies tenant B when only tenant A is entitled", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS", ENTITLEMENTS);
    expect(
      evaluateInstitutionalSdkEntitlement({
        partnerId: "partner-a",
        packageVersion: "0.1.0",
        applicationId: "app-1",
        env: process.env,
      }).ok,
    ).toBe(true);
    expect(
      evaluateInstitutionalSdkEntitlement({
        partnerId: "partner-b",
        packageVersion: "0.1.0",
        applicationId: "app-2",
        env: process.env,
        now: new Date("2026-01-01T00:00:00.000Z"),
      }).ok,
    ).toBe(false);
    expect(
      evaluateInstitutionalSdkEntitlement({
        partnerId: "partner-z",
        packageVersion: "0.1.0",
        applicationId: "app-3",
        env: process.env,
      }).ok,
    ).toBe(false);
  });

  it("rejects expired and application-scoped entitlements", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS", ENTITLEMENTS);
    const expired = evaluateInstitutionalSdkEntitlement({
      partnerId: "partner-b",
      packageVersion: "0.1.0",
      applicationId: "app-x",
      env: process.env,
      now: new Date("2026-01-01T00:00:00.000Z"),
    });
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.status).toBe("expired");

    const wrongApp = evaluateInstitutionalSdkEntitlement({
      partnerId: "partner-c",
      packageVersion: "0.1.0",
      applicationId: "other-app",
      env: process.env,
    });
    expect(wrongApp.ok).toBe(false);
    if (!wrongApp.ok) expect(wrongApp.status).toBe("application_not_entitled");
  });

  it("honors revoked partner list", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS", ENTITLEMENTS);
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_REVOKED_PARTNERS", "partner-a");
    const decision = evaluateInstitutionalSdkEntitlement({
      partnerId: "partner-a",
      packageVersion: "0.1.0",
      applicationId: "app-1",
      env: process.env,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.status).toBe("revoked");
  });

  it("does not expose download in UI when global authorized but partner not entitled", () => {
    const content = Buffer.from("fake-sdk-tarball-bytes");
    const { filePath, approved, cleanup } = writeArtifactUnderAllowedRoot(content);

    const env = baseEnv({
      INSTITUTIONAL_SDK_TARBALL_PATH: filePath,
      INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256: approved,
      INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS: ENTITLEMENTS,
    });

    const view = buildInstitutionalSdkReleaseView({
      env,
      partnerId: "partner-z",
      applicationId: "app-1",
      downloadHref: "/download",
    });
    expect(view.release_status).toBe("entitlement_required");
    expect(view.download.available).toBe(false);
    expect(view.integrity.approved_tarball_sha256).toBe(approved);

    cleanup();
  });

  it("rejects symlink escape outside permitted release directory", () => {
    const artifactsRoot = path.join(process.cwd(), ".institutional-sdk-artifacts");
    mkdirSync(artifactsRoot, { recursive: true });
    const outside = mkdtempSync(path.join(tmpdir(), "sdk-out-"));
    const secret = path.join(outside, "secret.tgz");
    writeFileSync(secret, Buffer.from("secret"));
    const link = path.join(artifactsRoot, "abraxas-institutional-verification-0.1.0.tgz");
    try {
      rmSync(link, { force: true });
    } catch {
      /* ignore */
    }
    symlinkSync(secret, link);

    const env = baseEnv({
      INSTITUTIONAL_SDK_TARBALL_PATH: link,
      INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256: "a".repeat(64),
    });

    const result = validateInstitutionalSdkArtifact(env);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("artifact_symlink_escape");

    rmSync(link, { force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it("fails closed on wrong artifact digest", () => {
    const { filePath, cleanup } = writeArtifactUnderAllowedRoot(Buffer.from("version-a"));
    const env = baseEnv({
      INSTITUTIONAL_SDK_TARBALL_PATH: filePath,
      INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256: createHash("sha256").update(Buffer.from("version-b")).digest("hex"),
      INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS: ENTITLEMENTS,
    });
    const validated = validateInstitutionalSdkArtifact(env);
    expect(validated.ok).toBe(false);
    if (!validated.ok) expect(validated.code).toBe("artifact_digest_mismatch");
    cleanup();
  });

  it("serves bytes matching approved artifact for entitled partner", async () => {
    const content = Buffer.from("approved-sdk-release");
    const { filePath, approved, cleanup } = writeArtifactUnderAllowedRoot(content);

    const env = baseEnv({
      INSTITUTIONAL_SDK_TARBALL_PATH: filePath,
      INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256: approved,
      INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS: ENTITLEMENTS,
    });

    const sb = {
      from: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    const prepared = await prepareInstitutionalSdkDownload({
      partnerId: "partner-a",
      applicationId: "app-1",
      env,
      sb: sb as never,
    });
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.buffer.equals(content)).toBe(true);
      expect(prepared.approved_sha256).toBe(approved);
    }

    cleanup();
  });

  it("blocks download when audit persistence fails", async () => {
    const content = Buffer.from("approved-sdk-release");
    const { filePath, approved, cleanup } = writeArtifactUnderAllowedRoot(content);

    const env = baseEnv({
      INSTITUTIONAL_SDK_TARBALL_PATH: filePath,
      INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256: approved,
      INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS: ENTITLEMENTS,
    });

    const sb = {
      from: () => ({
        insert: vi.fn().mockResolvedValue({ error: { message: "db down" } }),
      }),
    };

    const prepared = await prepareInstitutionalSdkDownload({
      partnerId: "partner-a",
      applicationId: "app-1",
      env,
      sb: sb as never,
    });
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) {
      expect(prepared.code).toBe("institutional_sdk_audit_failed");
      expect(prepared.http_status).toBe(503);
    }

    cleanup();
  });

  it("denies unauthorized institution even when artifact validates", async () => {
    const content = Buffer.from("approved-sdk-release");
    const { filePath, approved, cleanup } = writeArtifactUnderAllowedRoot(content);

    const env = baseEnv({
      INSTITUTIONAL_SDK_TARBALL_PATH: filePath,
      INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256: approved,
      INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS: ENTITLEMENTS,
    });

    const sb = {
      from: () => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    const prepared = await prepareInstitutionalSdkDownload({
      partnerId: "partner-z",
      applicationId: "app-1",
      env,
      sb: sb as never,
    });
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) expect(prepared.http_status).toBe(403);

    cleanup();
  });
});
