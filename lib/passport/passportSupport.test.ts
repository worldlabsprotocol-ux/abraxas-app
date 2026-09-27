import { describe, expect, it } from "vitest";
import {
  isPassportSupportIssue,
  normalizePassportSupportMessage,
  parsePassportSupportCategory,
  passportSupportBodyFromMessage,
  passportSupportCategory,
  passportSupportIssueLabel,
  toPassportSupportHistoryItem,
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

  it("reads old categories as received and writes explicit workflow status", () => {
    expect(parsePassportSupportCategory("passport-support:verification"))
      .toEqual({ issue: "verification", status: "received" });
    expect(passportSupportCategory("verification", "in_review"))
      .toBe("passport-support:verification:in_review");
    expect(parsePassportSupportCategory("passport-support:verification:invalid"))
      .toBeNull();
  });

  it("maps stored rows to a privacy-minimized holder history", () => {
    expect(toPassportSupportHistoryItem({
      category: "passport-support:verification:resolved",
      message: "[PS-12345ABCDE] Identity verification\n\nSensitive original message",
      created_at: "2026-09-27T00:00:00.000Z",
    })).toEqual({
      reference: "PS-12345ABCDE",
      issue_type: "verification",
      issue_label: "Identity verification",
      status: "resolved",
      status_label: "Resolved",
      submitted_at: "2026-09-27T00:00:00.000Z",
    });
  });

  it("keeps the original message available only to the admin contract", () => {
    expect(passportSupportBodyFromMessage(
      "[PS-12345ABCDE] Identity verification\n\nSensitive original message",
    )).toBe("Sensitive original message");
  });

  it("rejects unrelated or malformed stored rows", () => {
    expect(toPassportSupportHistoryItem({
      category: "general",
      message: "[PS-12345ABCDE] Other",
      created_at: "2026-09-27T00:00:00.000Z",
    })).toBeNull();
    expect(toPassportSupportHistoryItem({
      category: "passport-support:verification",
      message: "missing reference",
      created_at: "2026-09-27T00:00:00.000Z",
    })).toBeNull();
  });
});
