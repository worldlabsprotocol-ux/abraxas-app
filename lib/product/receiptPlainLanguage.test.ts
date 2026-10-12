import { describe, expect, it } from "vitest";
import type { DecisionReceiptDisplayModel } from "@/lib/protocol/decisionReceiptDisplay";
import {
  buildReceiptPlainSummary,
  RECEIPT_ADVANCED_TOGGLE,
  RECEIPT_PLAIN_LABELS,
} from "@/lib/product/receiptPlainLanguage";
import {
  RECEIPT_ADVANCED_TOGGLE as STORY_ADVANCED_TOGGLE,
  RECEIPT_PLAIN_LABELS as STORY_PLAIN_LABELS,
} from "@/lib/product/productStoryCopy";

describe("receiptPlainLanguage contract", () => {
  it("re-exports RECEIPT_ADVANCED_TOGGLE from productStoryCopy (build-517 regression)", () => {
    expect(RECEIPT_ADVANCED_TOGGLE).toBe(STORY_ADVANCED_TOGGLE);
    expect(RECEIPT_ADVANCED_TOGGLE).toBe("Signature and verification details");
  });

  it("re-exports RECEIPT_PLAIN_LABELS from productStoryCopy", () => {
    expect(RECEIPT_PLAIN_LABELS).toEqual(STORY_PLAIN_LABELS);
  });
});

function minimalModel(overrides: Partial<DecisionReceiptDisplayModel> = {}): DecisionReceiptDisplayModel {
  return {
    receiptId: "dr_plain_test",
    visualStatus: "verified",
    statusLabel: "Verified",
    resultLabel: "21+ verified",
    disclosedResult: "approved",
    policyLabel: "Age 21+ retail",
    policyId: "partner-age_21_retail-v1",
    policyVersion: 1,
    partnerName: "Good Trouble",
    partnerId: "good-trouble",
    validUntil: "Oct 1, 2026",
    environment: "production",
    environmentLabel: "Production",
    signatureValid: true,
    currentlyValid: true,
    protectedFields: [],
    sharedLabel: "Eligibility answer",
    ...overrides,
  };
}

describe("buildReceiptPlainSummary", () => {
  it("maps live display model to plain-language fields", () => {
    const summary = buildReceiptPlainSummary(minimalModel());
    expect(summary.checked).toBe("Age 21+ retail");
    expect(summary.shared).toBe("21+ verified");
    expect(summary.recipient).toBe("Good Trouble");
    expect(summary.valid).toBe("Oct 1, 2026");
    expect(summary.next).toMatch(/close this confirmation/i);
  });

  it("warns when on-chain proof is not yet confirmed", () => {
    const summary = buildReceiptPlainSummary(
      minimalModel({
        solanaProvenance: { status: "submitted", proof_confirmed: false },
      }),
    );
    expect(summary.next).toMatch(/pending/i);
    expect(summary.next).not.toMatch(/finalized|confirmed on chain/i);
  });

  it("directs holder to re-request when validity lapsed", () => {
    const summary = buildReceiptPlainSummary(
      minimalModel({ visualStatus: "expired", currentlyValid: false, validUntil: null }),
    );
    expect(summary.valid).toBe("Expired");
    expect(summary.next).toMatch(/no longer valid/i);
  });

  it("labels sandbox receipts as non-production", () => {
    const summary = buildReceiptPlainSummary(
      minimalModel({ visualStatus: "sandbox", environment: "sandbox" }),
    );
    expect(summary.next).toMatch(/sandbox test/i);
  });
});
