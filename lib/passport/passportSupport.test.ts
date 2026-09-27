import { describe, expect, it } from "vitest";
import {
  isPassportSupportIssue,
  normalizePassportSupportMessage,
  passportSupportIssueLabel,
} from "./passportSupport";

describe("Passport support requests", () => {
  it("accepts only documented issue types", () => {
    expect(isPassportSupportIssue("verification")).toBe(true);
    expect(isPassportSupportIssue("admin_override")).toBe(false);
    expect(isPassportSupportIssue(null)).toBe(false);
  });

  it("trims valid messages and rejects empty or oversized input", () => {
    expect(normalizePassportSupportMessage("  Verification keeps loading.  "))
      .toBe("Verification keeps loading.");
    expect(normalizePassportSupportMessage("too short")).toBeNull();
    expect(normalizePassportSupportMessage("x".repeat(2001))).toBeNull();
  });

  it("provides plain-language labels for the support queue", () => {
    expect(passportSupportIssueLabel("partner_request"))
      .toBe("Shared result or partner request");
  });
});
