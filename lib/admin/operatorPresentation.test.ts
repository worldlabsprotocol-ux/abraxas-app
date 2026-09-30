// FILE: lib/admin/operatorPresentation.test.ts

import { describe, expect, it } from "vitest";
import {
  appProductionDecisionLabel,
  bindingProductionStatusLabel,
  operatorEmptyQueueCopy,
  presentAppProductionQueueItem,
  presentBindingProductionQueueItem,
  productionAuthorizationScopeWarning,
} from "./operatorPresentation";

describe("operatorPresentation", () => {
  it("distinguishes pending review from approved application states", () => {
    expect(appProductionDecisionLabel("pending")).toBe("Needs review");
    expect(appProductionDecisionLabel("approved")).toBe("Activated");
    expect(appProductionDecisionLabel("rejected")).toBe("Rejected");
  });

  it("labels binding production_approved separately from production_active", () => {
    expect(bindingProductionStatusLabel("production_approved")).toBe("Approved — not yet active");
    expect(bindingProductionStatusLabel("production_active")).toBe("Production active");
    expect(bindingProductionStatusLabel("production_requested")).toBe("Production requested");
  });

  it("presents application queue items with decision-first copy", () => {
    const pending = presentAppProductionQueueItem({
      appLabel: "Good Trouble",
      policyId: "good-trouble-age_21_retail-v1",
      policyVersion: 1,
      decisionStatus: "pending",
      submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      sandboxReadinessClass: "ready",
      webhookHealthClass: "ready",
      testConsoleClass: "ready",
    });
    expect(pending.stateLabel).toBe("Needs review");
    expect(pending.stateTone).toBe("needs_review");
    expect(pending.reviewType).toContain("Application production");
  });

  it("presents binding queue items as binding-scoped", () => {
    const binding = presentBindingProductionQueueItem({
      appLabel: "Good Trouble",
      packId: "residency_us",
      resultFamily: "US residency",
      policyVersion: 1,
      bindingRole: "secondary",
      productionStatus: "production_under_review",
      decisionStatus: "pending",
      submittedAt: new Date().toISOString(),
      verifiedReceipts: 0,
      requestVolume: 2,
      blockers: ["verified_receipts_missing"],
    });
    expect(binding.reasonEntered).toContain("Secondary policy binding");
    expect(binding.nextAction).toContain("this binding only");
    expect(binding.stateTone).toBe("blocked");
  });

  it("warns that application activation does not authorize every binding", () => {
    expect(productionAuthorizationScopeWarning("application")).toContain("does not authorize every configured policy binding");
    expect(productionAuthorizationScopeWarning("binding")).toContain("this policy binding only");
  });

  it("uses honest empty queue copy", () => {
    const copy = operatorEmptyQueueCopy("identity review");
    expect(copy.title).toContain("Nothing needs review");
    expect(copy.body).toContain("identity review");
  });
});
