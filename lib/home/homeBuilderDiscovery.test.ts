/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  HOME_BUILDER_DISCOVERY_STORAGE_KEY,
  matchHomeBuilderPolicy,
  readHomeBuilderDiscoveryIntent,
  writeHomeBuilderDiscoveryIntent,
} from "./homeBuilderDiscovery";

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("homepage policy choice continuity", () => {
  it("restores a valid choice in a new tab without treating it as authorization", () => {
    writeHomeBuilderDiscoveryIntent({ platform: "website", policyPackId: "age_21_retail" });
    window.sessionStorage.clear();

    expect(readHomeBuilderDiscoveryIntent()?.policyPackId).toBe("age_21_retail");
    expect(matchHomeBuilderPolicy([{ policy_id: "wallet_control" }, { policy_id: "age_21_retail" }]))
      .toEqual({ policy_id: "age_21_retail" });
    expect(matchHomeBuilderPolicy([{ policy_id: "wallet_control" }])).toBeUndefined();
  });

  it("rejects stale and malformed cross-tab choices", () => {
    const stale = {
      platform: "website",
      policyPackId: "wallet_control",
      updatedAt: new Date(Date.now() - 61 * 60 * 1000).toISOString(),
    };
    window.localStorage.setItem(HOME_BUILDER_DISCOVERY_STORAGE_KEY, JSON.stringify(stale));
    expect(readHomeBuilderDiscoveryIntent()).toBeNull();

    window.localStorage.setItem(HOME_BUILDER_DISCOVERY_STORAGE_KEY, JSON.stringify({
      platform: "unknown",
      policyPackId: "wallet_control",
      updatedAt: new Date().toISOString(),
    }));
    expect(readHomeBuilderDiscoveryIntent()).toBeNull();
  });
});