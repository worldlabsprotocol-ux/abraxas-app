import { describe, expect, it } from "vitest";
import {
  deploymentIncludesSandboxReceiptTrustFix,
  readLaunchpadDeploymentFingerprint,
} from "./deploymentFingerprint";

describe("deploymentFingerprint", () => {
  it("detects sandbox receipt trust merge sha", () => {
    expect(deploymentIncludesSandboxReceiptTrustFix({
      git_commit_sha: "37427be63afaf81431e0ec60c92e7b63e3c37955",
      vercel_env: "production",
    })).toBe(true);
    expect(deploymentIncludesSandboxReceiptTrustFix({
      git_commit_sha: "0000000000000000000000000000000000000000",
      vercel_env: "production",
    })).toBe(false);
  });

  it("sanitizes invalid sha", () => {
    const fp = readLaunchpadDeploymentFingerprint();
    expect(fp.git_commit_sha === null || /^[0-9a-f]+$/i.test(fp.git_commit_sha)).toBe(true);
  });
});
