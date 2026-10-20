// FILE: lib/developers/ephemeralWorkspaceCompletion.test.ts

import { describe, expect, it } from "vitest";
import { buildEphemeralSandboxCompletionView } from "./ephemeralWorkspaceCompletion";

describe("buildEphemeralSandboxCompletionView", () => {
  it("prioritizes wallet control integration for approved sandbox results", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "approved",
      receiptValidation: { status: "idle" },
    });
    expect(view.headline).toBe("Wallet control verified");
    expect(view.primaryAction?.href).toBe("/developers/integration-studio");
    expect(view.primaryAction?.label).toBe("Integrate verification");
    expect(view.checklist.some((item) => item.state === "next" && item.label.includes("Connect"))).toBe(true);
  });

  it("does not offer integration as primary when policy denied", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "denied",
      receiptValidation: {
        status: "validated",
        checkedAt: "2026-01-01T00:00:00.000Z",
        signatureAuthentic: true,
        currentlyAcceptable: false,
        invalidationReasons: ["policy_denied"],
      },
    });
    expect(view.headline.toLowerCase()).toContain("not approved");
    expect(view.primaryAction).toBeNull();
    expect(view.tone).toBe("caution");
  });

  it("surfaces sandbox record validation mode when standalone crypto is false", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "approved",
      receiptValidation: {
        status: "validated",
        checkedAt: "2026-01-01T00:00:00.000Z",
        signatureAuthentic: true,
        currentlyAcceptable: true,
        invalidationReasons: [],
        standaloneCryptographicVerification: false,
      },
    });
    expect(view.validationModeLine).toMatch(/sandbox records/i);
    expect(view.tone).toBe("success");
  });
});
