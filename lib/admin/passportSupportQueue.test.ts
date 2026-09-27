import { describe, expect, it } from "vitest";
import { toAdminPassportSupportItem } from "./passportSupportQueue";

describe("admin Passport support queue", () => {
  it("maps a stored Passport support submission", () => {
    expect(toAdminPassportSupportItem({
      email: "holder@example.com",
      category: "passport-support:account_access",
      message: "[PS-ABCDE12345] Sign-in or account access\n\nI cannot finish signing in.",
      created_at: "2026-09-27T01:00:00.000Z",
    })).toEqual({
      reference: "PS-ABCDE12345",
      email: "holder@example.com",
      issue_type: "account_access",
      issue_label: "Sign-in or account access",
      message: "I cannot finish signing in.",
      status: "received",
      submitted_at: "2026-09-27T01:00:00.000Z",
    });
  });

  it("rejects unrelated, malformed, and incomplete rows", () => {
    expect(toAdminPassportSupportItem({
      email: "holder@example.com",
      category: "general",
      message: "[PS-ABCDE12345] General\n\nHello",
      created_at: "2026-09-27T01:00:00.000Z",
    })).toBeNull();
    expect(toAdminPassportSupportItem({
      email: "holder@example.com",
      category: "passport-support:account_access",
      message: "Missing reference",
      created_at: "2026-09-27T01:00:00.000Z",
    })).toBeNull();
  });
});
