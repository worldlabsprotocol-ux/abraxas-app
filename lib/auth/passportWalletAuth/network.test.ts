// FILE: lib/auth/passportWalletAuth/network.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  canonicalizeSupportedSuiNetwork,
  networkMatchesDeploymentPolicy,
  validatePassportWalletNetworkTriple,
} from "./network";

describe("passport wallet network policy", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUI_NETWORK = "devnet";
  });

  it("accepts exact supported network ids", () => {
    expect(canonicalizeSupportedSuiNetwork("sui:devnet")).toBe("sui:devnet");
    expect(canonicalizeSupportedSuiNetwork("devnet")).toBe("sui:devnet");
  });

  it("rejects malformed extended identifiers", () => {
    expect(canonicalizeSupportedSuiNetwork("sui:devnet:extra")).toBeNull();
    expect(canonicalizeSupportedSuiNetwork("sui:devnet-evil")).toBeNull();
    expect(canonicalizeSupportedSuiNetwork("sui:devnet ")).toBeNull();
    expect(canonicalizeSupportedSuiNetwork("ethereum:mainnet")).toBeNull();
  });

  it("requires triple agreement for verification", () => {
    expect(
      validatePassportWalletNetworkTriple({
        challengedNetwork: "sui:devnet",
        submittedNetwork: "sui:devnet",
      }).ok,
    ).toBe(true);

    expect(
      validatePassportWalletNetworkTriple({
        challengedNetwork: "sui:testnet",
        submittedNetwork: "sui:devnet",
      }).ok,
    ).toBe(false);

    process.env.NEXT_PUBLIC_SUI_NETWORK = "testnet";
    expect(
      validatePassportWalletNetworkTriple({
        challengedNetwork: "sui:devnet",
        submittedNetwork: "sui:devnet",
      }).ok,
    ).toBe(false);
  });

  it("enforces deployment policy on issuance", () => {
    process.env.NEXT_PUBLIC_SUI_NETWORK = "mainnet";
    expect(networkMatchesDeploymentPolicy("sui:mainnet")).toBe(true);
    expect(networkMatchesDeploymentPolicy("sui:devnet")).toBe(false);
  });
});
