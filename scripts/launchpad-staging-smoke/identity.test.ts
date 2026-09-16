// FILE: scripts/launchpad-staging-smoke/identity.test.ts

import { describe, expect, it } from "vitest";
import { validatePreviewIdentityBody } from "./identity";
import { redactSensitiveText } from "./redact";

describe("launchpad staging identity harness", () => {
  it("rejects a different project ref", () => {
    const result = validatePreviewIdentityBody(
      {
        deployment_environment: "preview",
        supabase_project_ref: "aaaaaaaaaaaaaaaaaaaa",
        commit_sha: "37aa5f077b6b8ac896a566b39bffd26d008132c7",
      },
      "ocntwbxarpjeixdnzide",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects production environment", () => {
    const result = validatePreviewIdentityBody(
      {
        deployment_environment: "production",
        supabase_project_ref: "ocntwbxarpjeixdnzide",
        commit_sha: "37aa5f077b6b8ac896a566b39bffd26d008132c7",
      },
      "ocntwbxarpjeixdnzide",
    );
    expect(result.ok).toBe(false);
  });

  it("rejects missing commit SHA", () => {
    const result = validatePreviewIdentityBody(
      {
        deployment_environment: "preview",
        supabase_project_ref: "ocntwbxarpjeixdnzide",
        commit_sha: "",
      },
      "ocntwbxarpjeixdnzide",
    );
    expect(result.ok).toBe(false);
  });

  it("redacts bypass secrets from report text", () => {
    const redacted = redactSensitiveText(
      "VERCEL_PROTECTION_BYPASS=super-secret-token abx_test_example",
    );
    expect(redacted).not.toContain("super-secret-token");
    expect(redacted).toContain("abx_[redacted]");
  });
});
