// FILE: lib/developers/sandboxIntegrationHandoff.test.ts

import { describe, expect, it } from "vitest";
import {
  buildIntegrationStudioHandoffUrl,
  DEVELOPER_WORKSPACE_STUDIO_SOURCE,
  defaultStudioPathForSandboxPolicy,
} from "./sandboxIntegrationHandoff";

describe("sandboxIntegrationHandoff", () => {
  it("builds a safe Integration Studio URL with pack, path, and create focus", () => {
    const href = buildIntegrationStudioHandoffUrl({ policyId: "wallet_control" });
    const url = new URL(href, "https://example.test");
    expect(url.pathname).toBe("/developers/ephemeral-sandbox");
    expect(url.searchParams.get("integration")).toBe("1");
    expect(url.searchParams.get("source")).toBe(DEVELOPER_WORKSPACE_STUDIO_SOURCE);
    expect(url.searchParams.get("pack")).toBe("wallet_control");
    expect(url.searchParams.get("path")).toBe("verify_with_abraxas");
    expect(url.searchParams.get("step")).toBe("create_sandbox");
    expect(url.hash).toBe("#sandbox");
    expect(href).not.toMatch(/receipt|signature|session|challenge/i);
  });

  it("maps age demonstration to hosted partner flow", () => {
    expect(defaultStudioPathForSandboxPolicy("age_21_retail")).toBe("hosted_partner_flow");
    const href = buildIntegrationStudioHandoffUrl({ policyId: "age_21_retail" });
    expect(href).toContain("pack=age_21_retail");
    expect(href).toContain("path=hosted_partner_flow");
  });
});
