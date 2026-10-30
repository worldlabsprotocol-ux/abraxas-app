// FILE: lib/developers/ephemeralWorkspaceCompletion.test.ts

import { describe, expect, it } from "vitest";
import { buildEphemeralSandboxCompletionView } from "./ephemeralWorkspaceCompletion";
import { DEVELOPER_WORKSPACE_STUDIO_SOURCE } from "./sandboxIntegrationHandoff";

describe("buildEphemeralSandboxCompletionView", () => {
  it("links approved wallet control results to unified workspace with pack, path, and create focus", () => {
    const view = buildEphemeralSandboxCompletionView({
      policyId: "wallet_control",
      policyLabel: "Wallet Control",
      decision: "approved",
      receiptValidation: { status: "idle" },
    });
    expect(view.headline).toBe("Check your proof");
    expect(view.statusEyebrow).toBe("Wallet control confirmed");
    expect(view.primaryAction?.kind).toBe("check_proof");
    expect(view.primaryAction?.label).toBe("Check your proof");
    expect(view.secondaryAction).toBeNull();
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
    expect(view.acceptabilityLine).toMatch(/not currently valid/i);
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
    expect(view.primaryAction?.label).toBe("Connect your application");
    expect(view.primaryAction?.kind).toBe("link");

    const inlineView = buildEphemeralSandboxCompletionView({
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
      inlineIntegrationHandoff: true,
    });
    expect(inlineView.primaryAction?.kind).toBe("inline_integrate");
    expect(inlineView.primaryAction?.href).toBeUndefined();

    expect(view.headline).toBe("Your proof checks out");
    expect(view.applicationHandoff?.title).toBe("Put it in your app");
    expect(view.applicationHandoff?.steps.some((s) => s.state === "current")).toBe(true);
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
