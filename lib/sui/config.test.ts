// FILE: lib/sui/config.test.ts

import { afterEach, describe, expect, it } from "vitest";
import {
  getSuiDeployment,
  isSuiMainnetDeployed,
  resolveSuiDeployment,
} from "./config";

describe("resolveSuiDeployment", () => {
  const prevNetwork = process.env.SUI_NETWORK;

  afterEach(() => {
    if (prevNetwork === undefined) delete process.env.SUI_NETWORK;
    else process.env.SUI_NETWORK = prevNetwork;
  });

  it("uses devnet deployment when SUI_NETWORK is devnet", () => {
    process.env.SUI_NETWORK = "devnet";
    const resolved = resolveSuiDeployment();
    expect(resolved.source).toBe("devnet");
    expect(resolved.deployment.packageId).toMatch(/^0x/);
    expect(resolved.mainnetPackageMissing).toBe(false);
  });

  it("does not fall back to devnet packageId when mainnet requested but unpublished", () => {
    process.env.SUI_NETWORK = "mainnet";
    const resolved = resolveSuiDeployment();
    expect(resolved.source).toBe("mainnet");
    expect(resolved.mainnetPackageMissing).toBe(true);
    expect(resolved.deployment.packageId).toBe("");
    expect(getSuiDeployment().packageId).toBe("");
    expect(isSuiMainnetDeployed()).toBe(false);
  });
});
