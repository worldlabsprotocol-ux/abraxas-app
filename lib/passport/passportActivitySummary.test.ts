import { describe, expect, it } from "vitest";
import { buildPassportAccountActivity } from "./passportActivitySummary";

describe("buildPassportAccountActivity", () => {
  it("combines holder-safe privacy and support updates newest first", () => {
    const items = buildPassportAccountActivity({
      privacyRequests: [{
        request_type: "data_export",
        status: "under_review",
        status_label: "Under review",
        created_at: "2026-09-25T10:00:00.000Z",
        updated_at: "2026-09-26T10:00:00.000Z",
      }],
      supportRequests: [{
        reference: "PS-ABC1234567",
        issue_type: "verification",
        issue_label: "Identity verification",
        status: "received",
        status_label: "Received",
        submitted_at: "2026-09-27T10:00:00.000Z",
      }],
    });

    expect(items).toEqual([
      expect.objectContaining({
        id: "support:PS-ABC1234567",
        kind: "support",
        title: "Identity verification",
        href: "/passport?view=support",
      }),
      expect.objectContaining({
        kind: "privacy",
        title: "Data export requested",
        href: "/passport?view=privacy",
      }),
    ]);
    expect(JSON.stringify(items)).not.toContain("subject");
    expect(JSON.stringify(items)).not.toContain("message");
  });

  it("drops malformed dates and caps the activity feed", () => {
    const supportRequests = Array.from({ length: 25 }, (_, index) => ({
      reference: `PS-${String(index).padStart(10, "0")}`,
      issue_type: "other" as const,
      issue_label: "Something else",
      status: "received" as const,
      status_label: "Received",
      submitted_at: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
    }));
    supportRequests.push({
      reference: "PS-BADDATE000",
      issue_type: "other",
      issue_label: "Something else",
      status: "received",
      status_label: "Received",
      submitted_at: "not-a-date",
    });

    const items = buildPassportAccountActivity({ privacyRequests: [], supportRequests });

    expect(items).toHaveLength(20);
    expect(items[0]?.id).toBe("support:PS-0000000024");
    expect(items.some(item => item.id === "support:PS-BADDATE000")).toBe(false);
  });
});
