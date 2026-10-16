// FILE: lib/partner/build588.sdkRelease.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import {
  buildInstitutionalSdkReleaseView,
  resolveInstitutionalSdkDistributionMode,
  resolveInstitutionalSdkTarballPath,
} from "@/lib/institutionalVerification/sdkRelease";

describe("Build #588 institutional SDK release", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to request_access when distribution is not authorized", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_MODE", "request_access");
    expect(resolveInstitutionalSdkDistributionMode()).toBe("request_access");
    const view = buildInstitutionalSdkReleaseView({
      partnerId: "partner-a",
      applicationId: "app-1",
    });
    expect(view.download.available).toBe(false);
    expect(view.download.reason_code).toBeTruthy();
  });

  it("reports artifact_missing when authorized mode lacks tarball", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_MODE", "authorized");
    vi.stubEnv("INSTITUTIONAL_SDK_APPROVED_TARBALL_SHA256", "b".repeat(64));
    vi.stubEnv(
      "INSTITUTIONAL_SDK_TARBALL_PATH",
      path.join(process.cwd(), "packages/abraxas-institutional-verification/missing.tgz"),
    );
    expect(resolveInstitutionalSdkDistributionMode()).toBe("artifact_missing");
  });

  it("rejects tarball paths outside allowed roots", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_TARBALL_PATH", "/tmp/evil.tgz");
    expect(resolveInstitutionalSdkTarballPath()).toBeNull();
  });

  it("requires approved digest env independent of file hash display", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_MODE", "authorized");
    vi.stubEnv(
      "INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS",
      JSON.stringify([{ partner_id: "p", package_version: "0.1.0" }]),
    );
    const view = buildInstitutionalSdkReleaseView({
      partnerId: "p",
      applicationId: "app",
    });
    expect(view.integrity.approved_tarball_sha256).toBeNull();
    expect(view.download.available).toBe(false);
  });
});
