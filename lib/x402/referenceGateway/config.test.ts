import { describe, expect, it } from "vitest";
import { resolveReferenceGatewayConfig, REFERENCE_GATEWAY_ENV } from "./config";
import { BASE_SEPOLIA_USDC_CAIP19 } from "./constants";

const completeEnv = {
  [REFERENCE_GATEWAY_ENV.enabled]: "true",
  [REFERENCE_GATEWAY_ENV.partnerId]: "pilot-partner",
  [REFERENCE_GATEWAY_ENV.policyId]: "pilot-policy-v1",
  [REFERENCE_GATEWAY_ENV.abraxasBaseUrl]: "https://abraxas.example",
  [REFERENCE_GATEWAY_ENV.facilitatorUrl]: "https://facilitator.example",
  [REFERENCE_GATEWAY_ENV.payTo]: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  [REFERENCE_GATEWAY_ENV.resourceUrl]: "https://partner.example/resource",
};

describe("resolveReferenceGatewayConfig", () => {
  it("is disabled unless explicitly enabled", () => {
    const result = resolveReferenceGatewayConfig({});
    expect(result.enabled).toBe(false);
    expect(result.config).toBeNull();
  });

  it("requires operator-supplied partner and facilitator values when enabled", () => {
    const result = resolveReferenceGatewayConfig({
      [REFERENCE_GATEWAY_ENV.enabled]: "true",
    });
    expect(result.enabled).toBe(true);
    expect(result.config).toBeNull();
    expect(result.missing).toContain(REFERENCE_GATEWAY_ENV.partnerId);
    expect(result.missing).toContain(REFERENCE_GATEWAY_ENV.facilitatorUrl);
  });

  it("resolves full testnet config when env is complete and valid", () => {
    const result = resolveReferenceGatewayConfig(completeEnv);

    expect(result.config?.network).toBe("eip155:84532");
    expect(result.config?.priceAssetCaip19).toBe(BASE_SEPOLIA_USDC_CAIP19);
    expect(result.config?.allowSandbox).toBe(true);
    expect(result.validation?.valid).toBe(true);
  });

  it("rejects invalid operator config at startup", () => {
    const result = resolveReferenceGatewayConfig({
      ...completeEnv,
      [REFERENCE_GATEWAY_ENV.payTo]: "not-an-address",
      [REFERENCE_GATEWAY_ENV.abraxasBaseUrl]: "http://insecure.example",
    });

    expect(result.config).toBeNull();
    expect(result.validation?.valid).toBe(false);
    expect(result.validation?.errors).toContain("pay_to_must_be_valid_evm_address");
    expect(result.validation?.errors).toContain("abraxas_base_url_must_be_https");
  });
});
