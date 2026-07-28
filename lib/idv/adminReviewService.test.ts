// FILE: lib/idv/adminReviewService.test.ts

import { describe, expect, it } from "vitest";
import { resolveReviewerDecision } from "./adminReviewService";

describe("resolveReviewerDecision", () => {
  it("maps approve + human_review engine to approved", () => {
    expect(resolveReviewerDecision("approve", "human_review")).toBe("approved");
  });

  it("maps approve + auto_approve engine to approved", () => {
    expect(resolveReviewerDecision("approve", "auto_approve")).toBe("approved");
  });

  it("maps approve + reject engine to approved_override", () => {
    expect(resolveReviewerDecision("approve", "reject")).toBe("approved_override");
  });

  it("maps reject to rejected regardless of engine", () => {
    expect(resolveReviewerDecision("reject", "human_review")).toBe("rejected");
    expect(resolveReviewerDecision("reject", null)).toBe("rejected");
  });

  it("maps request_resubmission to resubmission_requested", () => {
    expect(resolveReviewerDecision("request_resubmission", "human_review")).toBe("resubmission_requested");
  });
});
