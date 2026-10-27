// FILE: lib/developers/unifiedWorkspacePreservedQuery.test.ts

import { describe, expect, it } from "vitest";
import { mergeUnifiedWorkspacePreservedQuery } from "./unifiedWorkspacePreservedQuery";

describe("mergeUnifiedWorkspacePreservedQuery", () => {
  it("fills pack and path from authoritative policy when URL omitted them", () => {
    const merged = mergeUnifiedWorkspacePreservedQuery({
      existing: { integration: "1", source: "developer-workspace" },
      authoritativePolicyId: "wallet_control",
      walletProofRecorded: true,
    });
    expect(merged.pack).toBe("wallet_control");
    expect(merged.path).toBe("verify_with_abraxas");
    expect(merged.step).toBe("create_sandbox");
  });

  it("does not override an explicit pack query param", () => {
    const merged = mergeUnifiedWorkspacePreservedQuery({
      existing: { integration: "1", pack: "age_21_retail" },
      authoritativePolicyId: "wallet_control",
      walletProofRecorded: false,
    });
    expect(merged.pack).toBe("age_21_retail");
  });
});
