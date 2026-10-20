// FILE: lib/developers/ephemeralWorkspaceCompletion.test.ts

import { describe, expect, it } from "vitest";
import { buildEphemeralSandboxCompletionView } from "./ephemeralWorkspaceCompletion";
import { DEVELOPER_WORKSPACE_STUDIO_SOURCE } from "./sandboxIntegrationHandoff";

describe("buildEphemeralSandboxCompletionView", () => {
  it("links approved wallet control results to Integration Studio with pack, path, and create focus", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "approved",
      receiptValidation: { status: "idle" },
    });
    expect(view.headline).toBe("Wallet control verified");
    expect(view.primaryAction?.label).toBe("Continue in Integration Studio");
    expect(view.primaryAction?.href).toContain("/developers/integration-studio");
    expect(view.primaryAction?.href).toContain(`source=${DEVELOPER_WORKSPACE_STUDIO_SOURCE}`);
    expect(view.primaryAction?.href).toContain("pack=wallet_control");
    expect(view.primaryAction?.href).toContain("path=verify_with_abraxas");
    expect(view.primaryAction?.href).toContain("#sandbox");
    expect(view.acceptabilityLine).toMatch(/not checked yet/i);
  });

  it("does not show integration-success tone when policy denied", () => {
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
    expect(view.primaryAction?.label).toBe("Review policy in Integration Studio");
    expect(view.tone).toBe("caution");
    expect(view.statusEyebrow).not.toContain("COMPLETE");
  });

  it("routes expired or unacceptable receipts to recovery, not integration success", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "approved",
      receiptValidation: {
        status: "validated",
        checkedAt: "2026-01-01T00:00:00.000Z",
        signatureAuthentic: true,
        currentlyAcceptable: false,
        invalidationReasons: ["expired"],
      },
    });
    expect(view.primaryAction?.label).toBe("Run another sandbox test");
    expect(view.tone).toBe("caution");
    expect(view.acceptabilityLine).toMatch(/should not authorize/i);
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
    expect(view.primaryAction?.label).toBe("Continue in Integration Studio");
  });

  it("handles receipt storage failures without implying production authorization", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "approved",
      receiptValidation: {
        status: "failed",
        title: "Receipt not found",
        message: "This receipt is no longer available from online storage.",
        recovery: "Run another test.",
        technicalCode: "result_not_found",
      },
    });
    expect(view.primaryAction?.label).toBe("Run another sandbox test");
    expect(view.sandboxOnlyNote).toMatch(/does not grant live access/i);
  });
});
