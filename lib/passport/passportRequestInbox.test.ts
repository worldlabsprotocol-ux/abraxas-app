import { describe, expect, it } from "vitest";
import { projectPassportRequestInboxItem } from "./passportRequestInbox";

describe("Passport request inbox projection", () => {
  it("returns a plain-language continuation without claims or subject identifiers", () => {
    const item = projectPassportRequestInboxItem({
      row: {
        id: "vr-123",
        partner_id: "good-trouble-cannabis",
        policy_id: "age-21",
        requested_action: "browse_storefront",
        created_at: "2026-09-27T10:00:00.000Z",
        expires_at: "2026-09-28T10:00:00.000Z",
      },
      policyName: "Age 21 eligibility",
      sharedResult: "age eligibility",
    });

    expect(item).toMatchObject({
      partner_label: "Good Trouble Cannabis",
      request_title: "Age 21 eligibility",
      purpose: "browse storefront",
      shared_result: "age eligibility",
      continue_href: "/partner/continue?verify_request=vr-123",
    });
    expect(Object.keys(item)).not.toContain("subject_id");
    expect(Object.keys(item)).not.toContain("requested_claims");
  });

  it("uses safe fallback copy", () => {
    const item = projectPassportRequestInboxItem({
      row: {
        id: "vr-456",
        partner_id: "unknown-service",
        policy_id: "unknown-policy",
        requested_action: null,
        created_at: "2026-09-27T10:00:00.000Z",
        expires_at: "2026-09-28T10:00:00.000Z",
      },
      policyName: null,
      sharedResult: null,
    });

    expect(item.request_title).toBe("Passport verification request");
    expect(item.purpose).toBe("Confirm eligibility");
    expect(item.shared_result).toBe("Eligibility result");
  });
});
