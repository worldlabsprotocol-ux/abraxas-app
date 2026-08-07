import { describe, expect, it } from "vitest";
import { resolveReferenceGatewayConfig, REFERENCE_GATEWAY_ENV } from "./config";

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

  it("resolves full testnet config when env is complete", () => {
    const result = resolveReferenceGatewayConfig({
      [REFERENCE_GATEWAY_ENV.enabled]: "true",
      [REFERENCE_GATEWAY_ENV.partnerId]: "pilot-partner",
      [REFERENCE_GATEWAY_ENV.policyId]: "pilot-policy-v1",
      [REFERENCE_GATEWAY_ENV.abraxasBaseUrl]: "https://abraxas.example",
      [REFERENCE_GATEWAY_ENV.facilitatorUrl]: "https://facilitator.example",
      [REFERENCE_GATEWAY_ENV.payTo]: "0xabc",
      [REFERENCE_GATEWAY_ENV.resourceUrl]: "https://partner.example/resource",
    });

    expect(result.config?.network).toBe("eip155:84532");
    expect(result.config?.allowSandbox).toBe(true);
  });
});
