// FILE: lib/assetMonitoring/feeds/registryAssuranceFeed.test.ts

import { describe, expect, it } from "vitest";
import { runRegistryAssuranceFeed } from "./registryAssuranceFeed";

describe("runRegistryAssuranceFeed", () => {
  it("emits signals for assets without L4 monitoring", () => {
    const signals = runRegistryAssuranceFeed(new Date("2026-07-18"));
    expect(signals.some(s => s.assetId === "ABX-RE-RES-002")).toBe(true);
    expect(signals[0]?.source).toBe("registry_assurance_feed");
  });
});
