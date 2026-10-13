// FILE: lib/auth/passportWalletAuth/network.test.ts

import { describe, expect, it, vi, beforeEach } from "vitest";
import { PASSPORT_WALLET_ACTIONS } from "./contract";
import {
  canonicalizeSupportedSuiNetwork,
  networkMatchesDeploymentPolicy,
  resolveDeploymentSuiNetworkPolicy,
  validatePassportWalletNetworkTriple,
} from "./network";
import { issuePassportWalletAuthChallenge } from "./service";
import * as store from "./store";

describe("passport wallet network policy", () => {
  beforeEach(() => {
    delete process.env.VERCEL_ENV;
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

  it("defaults to devnet only in local development when unset", () => {
    delete process.env.NEXT_PUBLIC_SUI_NETWORK;
    expect(resolveDeploymentSuiNetworkPolicy()).toEqual({ ok: true, network: "sui:devnet" });
  });

  it("rejects missing network on preview and production deployments", () => {
    delete process.env.NEXT_PUBLIC_SUI_NETWORK;
    process.env.VERCEL_ENV = "preview";
    expect(resolveDeploymentSuiNetworkPolicy()).toEqual({ ok: false, code: "network_config_invalid" });

    process.env.VERCEL_ENV = "production";
    expect(resolveDeploymentSuiNetworkPolicy()).toEqual({ ok: false, code: "network_config_invalid" });
  });

  it("rejects malformed deployment network configuration", () => {
    process.env.VERCEL_ENV = "production";
    process.env.NEXT_PUBLIC_SUI_NETWORK = "sui:devnet-evil";
    expect(resolveDeploymentSuiNetworkPolicy()).toEqual({ ok: false, code: "network_config_invalid" });
  });

  it("blocks challenge issuance when deployment network is invalid", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.NEXT_PUBLIC_SUI_NETWORK = "not-a-network";
    process.env.NEXT_PUBLIC_APP_URL = "https://demo.abraxasworld.xyz";
    vi.spyOn(store, "insertPassportWalletChallenge").mockResolvedValue(undefined);

    const issued = await issuePassportWalletAuthChallenge({
      origin: "https://demo.abraxasworld.xyz",
      walletAddress: "0x" + "a".repeat(64),
      suiNetwork: "sui:devnet",
      intendedAction: PASSPORT_WALLET_ACTIONS.passportSignIn,
      sessionContext: "ctx",
    });
    expect(issued.ok).toBe(false);
    if (!issued.ok) expect(issued.code).toBe("network_config_invalid");
  });

  it("blocks verify triple validation when deployment network is invalid", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.NEXT_PUBLIC_SUI_NETWORK;
    expect(
      validatePassportWalletNetworkTriple({
        challengedNetwork: "sui:devnet",
        submittedNetwork: "sui:devnet",
      }),
    ).toEqual({ ok: false, code: "network_config_invalid" });
  });
});
