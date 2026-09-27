import { describe, expect, it } from "vitest";
import type { PassportActivityItem } from "./contract";
import { filterPassportConnections, summarizePassportConnections } from "./connections";

function item(activityRef: string, current: boolean): PassportActivityItem {
  return {
    activity_ref: activityRef,
    partner_label: "Example service",
    policy_label: "Eligibility",
    version_summary: "Current reviewed policy",
    state: current ? "approved" : "revoked",
    state_label: current ? "Approved" : "Revoked",
    decided_at: "2026-09-27T10:00:00.000Z",
    shared_result_category: "eligible",
    purpose: "Account access",
    partner_received: "Eligibility result",
    withheld: ["underlying evidence"],
    evidence_not_shared: "Private evidence was not shared.",
    sandbox_only: false,
    current,
    recovery: null,
    partner_entry_href: null,
    reuse_consent_notice: null,
  };
}

describe("Passport connection grouping", () => {
  const current = item("pa_current", true);
  const historical = item("pa_history", false);
  const items = [current, historical];

  it("summarizes current and historical results", () => {
    expect(summarizePassportConnections(items)).toEqual({
      current: 1,
      history: 1,
      total: 2,
    });
  });

  it("filters without changing the underlying holder-safe records", () => {
    expect(filterPassportConnections(items, "current")).toEqual([current]);
    expect(filterPassportConnections(items, "history")).toEqual([historical]);
    expect(filterPassportConnections(items, "all")).toEqual(items);
  });
});
