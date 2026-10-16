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
    const view = buildInstitutionalSdkReleaseView();
    expect(view.download.available).toBe(false);
    expect(view.download.reason_code).toBe("distribution_not_authorized");
  });

  it("reports artifact_missing when authorized mode lacks tarball", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_MODE", "authorized");
    vi.stubEnv("INSTITUTIONAL_SDK_TARBALL_PATH", path.join(process.cwd(), "packages/abraxas-institutional-verification/missing.tgz"));
    expect(resolveInstitutionalSdkDistributionMode()).toBe("artifact_missing");
  });

  it("rejects tarball paths outside allowed roots", () => {
    vi.stubEnv("INSTITUTIONAL_SDK_TARBALL_PATH", "/tmp/evil.tgz");
    expect(resolveInstitutionalSdkTarballPath()).toBeNull();
  });

  it("includes integrity metadata when tarball exists", () => {
    const defaultPath = path.join(
      process.cwd(),
      "packages/abraxas-institutional-verification/abraxas-institutional-verification-0.1.0.tgz",
    );
    try {
      const fs = require("node:fs");
      if (!fs.existsSync(defaultPath)) {
        return;
      }
    } catch {
      return;
    }
    vi.stubEnv("INSTITUTIONAL_SDK_DISTRIBUTION_MODE", "authorized");
    const view = buildInstitutionalSdkReleaseView();
    expect(view.integrity.tarball_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(view.integrity.tarball_size_bytes).toBeGreaterThan(0);
  });
});
