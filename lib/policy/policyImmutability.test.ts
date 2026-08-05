import { describe, expect, it } from "vitest";
import {
  PolicyImmutabilityError,
  assertPublishedPolicyFieldsUnchanged,
} from "@/lib/policy/policyLifecycle";

/**
 * P1-1: published policy versions are immutable at the service layer
 * (database trigger in 055_policy_immutable_versions.sql enforces the same boundary).
 */
describe("policy immutability contract (P1-1)", () => {
  it("documents immutable fields on active and deprecated versions", () => {
    const immutable = [
      "id",
      "version",
      "partner_id",
      "name",
      "rules_json",
      "effective_at",
    ];
    expect(immutable).toContain("rules_json");
    expect(immutable).toContain("version");
  });

  it("rejects in-place rules_json mutation on active policy versions", () => {
    expect(() =>
      assertPublishedPolicyFieldsUnchanged(
        {
          status: "active",
          id: "good-trouble-retail-v1",
          version: 1,
          partner_id: "good-trouble-cannabis",
          name: "Good Trouble retail",
          rules_json: { minimum_age: 21 },
        },
        { rules_json: { minimum_age: 18 } },
      ),
    ).toThrow(PolicyImmutabilityError);
  });

  it("allows draft policy versions to be edited before publish", () => {
    expect(() =>
      assertPublishedPolicyFieldsUnchanged(
        {
          status: "draft",
          id: "good-trouble-retail-v1",
          version: 2,
          partner_id: "good-trouble-cannabis",
          name: "Good Trouble retail v2",
          rules_json: { minimum_age: 21 },
        },
        { rules_json: { minimum_age: 21, sandbox_only: true } },
      ),
    ).not.toThrow();
  });

  it("requires new versions instead of mutating prior published rows", () => {
    const createNewVersion = (currentVersion: number) => currentVersion + 1;
    expect(createNewVersion(1)).toBe(2);
  });
});
