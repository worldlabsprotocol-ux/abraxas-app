import { describe, expect, it } from "vitest";
import {
  partnerFlowReceiptOutcomeFromResolution,
  partnerFlowReceiptOutcomeHolderNote,
  partnerFlowReceiptOutcomeOperatorLabel,
  resolvePartnerFlowReceiptOutcome,
} from "@/lib/partner/partnerFlowReceiptOutcome";

describe("partnerFlowReceiptOutcome", () => {
  it("maps resolution paths to operator outcomes", () => {
    expect(partnerFlowReceiptOutcomeFromResolution("issued")).toBe("issued");
    expect(partnerFlowReceiptOutcomeFromResolution("active_session")).toBe("reused");
    expect(partnerFlowReceiptOutcomeFromResolution("verification_request")).toBe("replayed");
    expect(partnerFlowReceiptOutcomeFromResolution("idempotency_key")).toBe("replayed");
    expect(partnerFlowReceiptOutcomeFromResolution("insert_race")).toBe("replayed");
  });

  it("resolves legacy replay_status when receipt_outcome is absent", () => {
    expect(resolvePartnerFlowReceiptOutcome({ replay_status: "issued" })).toBe("issued");
    expect(resolvePartnerFlowReceiptOutcome({ replay_status: "idempotent_replay" })).toBe("replayed");
    expect(resolvePartnerFlowReceiptOutcome({})).toBeNull();
  });

  it("prefers explicit receipt_outcome over replay_status", () => {
    expect(
      resolvePartnerFlowReceiptOutcome({ receipt_outcome: "reused", replay_status: "idempotent_replay" }),
    ).toBe("reused");
  });

  it("provides holder and operator copy for reuse", () => {
    expect(partnerFlowReceiptOutcomeHolderNote("reused")).toMatch(/existing approval/i);
    expect(partnerFlowReceiptOutcomeOperatorLabel("reused")).toMatch(/reused/i);
    expect(partnerFlowReceiptOutcomeHolderNote("issued")).toBeNull();
  });
});
