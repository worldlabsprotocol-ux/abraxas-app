import { describe, expect, it } from "vitest";
import {
  buildUnifiedWorkspaceIntegrationUrl,
  isUnifiedWorkspaceIntegrationSearch,
  UNIFIED_DEVELOPER_WORKSPACE_PATH,
} from "./unifiedWorkspaceContinuity";
import { buildIntegrationStudioHandoffUrl } from "./sandboxIntegrationHandoff";

describe("unifiedWorkspaceContinuity", () => {
  it("keeps guided handoff on ephemeral-sandbox", () => {
    const href = buildIntegrationStudioHandoffUrl({ policyId: "wallet_control" });
    expect(href.startsWith(UNIFIED_DEVELOPER_WORKSPACE_PATH)).toBe(true);
    expect(href).toContain("integration=1");
    expect(href).toContain("source=developer-workspace");
    expect(href).toContain("#sandbox");
    expect(href).not.toContain("/developers/integration-studio");
  });

  it("detects unified integration query", () => {
    expect(isUnifiedWorkspaceIntegrationSearch(new URLSearchParams("integration=1"))).toBe(true);
    expect(isUnifiedWorkspaceIntegrationSearch(new URLSearchParams("source=developer-workspace"))).toBe(true);
    expect(isUnifiedWorkspaceIntegrationSearch(new URLSearchParams())).toBe(false);
  });

  it("buildUnifiedWorkspaceIntegrationUrl encodes pack for wallet_control", () => {
    const url = buildUnifiedWorkspaceIntegrationUrl({ policyId: "wallet_control" });
    expect(url).toContain("pack=wallet_control");
  });
});
