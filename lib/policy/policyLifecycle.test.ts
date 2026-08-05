import { describe, expect, it } from "vitest";
import {
  PolicyImmutabilityError,
  assertPolicyStatusTransition,
  assertPolicyVersionMonotonic,
  assertPublishedPolicyFieldsUnchanged,
  isPolicyDraft,
  isPublishedPolicyStatus,
} from "@/lib/policy/policyLifecycle";

describe("policy lifecycle immutability (P1-1)", () => {
  const published = {
    status: "active",
    id: "good-trouble-retail-v1",
    version: 1,
    partner_id: "good-trouble-cannabis",
    name: "Good Trouble retail",
    rules_json: { minimum_age: 21, sandbox_only: true },
    effective_at: "2026-01-01T00:00:00.000Z",
  };

  it("allows draft status to be edited", () => {
    expect(isPolicyDraft("draft")).toBe(true);
    expect(isPublishedPolicyStatus("draft")).toBe(false);
    expect(() =>
      assertPublishedPolicyFieldsUnchanged(
        { ...published, status: "draft" },
        { rules_json: { minimum_age: 18 } },
      ),
    ).not.toThrow();
  });

  it("rejects mutation of rules on active policy versions", () => {
    expect(isPublishedPolicyStatus("active")).toBe(true);
    expect(() =>
      assertPublishedPolicyFieldsUnchanged(published, {
        rules_json: { minimum_age: 18 },
      }),
    ).toThrow(PolicyImmutabilityError);
  });

  it("rejects mutation of identity fields on deprecated policy versions", () => {
    expect(() =>
      assertPublishedPolicyFieldsUnchanged(
        { ...published, status: "deprecated" },
        { version: 2 },
      ),
    ).toThrow(/version/);
  });

  it("allows status-only transitions for published rows", () => {
    expect(() => assertPolicyStatusTransition("draft", "active")).not.toThrow();
    expect(() => assertPolicyStatusTransition("active", "deprecated")).not.toThrow();
    expect(() => assertPolicyStatusTransition("deprecated", "active")).toThrow(
      PolicyImmutabilityError,
    );
  });

  it("requires monotonic version integers per policy id", () => {
    expect(() => assertPolicyVersionMonotonic([1], 2)).not.toThrow();
    expect(() => assertPolicyVersionMonotonic([1, 2], 2)).toThrow(PolicyImmutabilityError);
  });
});
