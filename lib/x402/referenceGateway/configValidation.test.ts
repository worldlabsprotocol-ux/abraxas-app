import { describe, expect, it } from "vitest";
import {
  BASE_SEPOLIA_CAIP2,
  BASE_SEPOLIA_USDC_CAIP19,
} from "./constants";
import { validateReferenceGatewayConfigInput } from "./configValidation";

const validInput = {
  partnerId: "pilot-partner",
  policyId: "pilot-policy-v1",
  abraxasPublicReceiptBaseUrl: "https://abraxas.example",
  facilitatorUrl: "https://facilitator.example",
  payTo: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  resourceUrl: "https://partner.example/resource",
  priceAmount: "10000",
  priceAssetCaip19: BASE_SEPOLIA_USDC_CAIP19,
  network: BASE_SEPOLIA_CAIP2,
};

describe("validateReferenceGatewayConfigInput", () => {
  it("accepts valid Base Sepolia testnet operator config", () => {
    const result = validateReferenceGatewayConfigInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects non-HTTPS URLs", () => {
    const result = validateReferenceGatewayConfigInput({
      ...validInput,
      abraxasPublicReceiptBaseUrl: "http://abraxas.example",
      facilitatorUrl: "ftp://facilitator.example",
      resourceUrl: "not-a-url",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("abraxas_base_url_must_be_https");
    expect(result.errors).toContain("facilitator_url_must_be_https");
    expect(result.errors).toContain("resource_url_must_be_https");
  });

  it("rejects wrong network", () => {
    const result = validateReferenceGatewayConfigInput({
      ...validInput,
      network: "eip155:1",
    });
    expect(result.errors).toContain("network_must_be_base_sepolia");
  });

  it("rejects invalid pay_to address", () => {
    const result = validateReferenceGatewayConfigInput({
      ...validInput,
      payTo: "not-an-address",
    });
    expect(result.errors).toContain("pay_to_must_be_valid_evm_address");
  });

  it("rejects non-positive price amount", () => {
    expect(validateReferenceGatewayConfigInput({ ...validInput, priceAmount: "0" }).errors)
      .toContain("price_amount_must_be_positive_atomic_units");
    expect(validateReferenceGatewayConfigInput({ ...validInput, priceAmount: "-1" }).errors)
      .toContain("price_amount_must_be_positive_atomic_units");
    expect(validateReferenceGatewayConfigInput({ ...validInput, priceAmount: "abc" }).errors)
      .toContain("price_amount_must_be_positive_atomic_units");
  });

  it("rejects unofficial USDC CAIP-19 asset identifier", () => {
    const result = validateReferenceGatewayConfigInput({
      ...validInput,
      priceAssetCaip19: "eip155:84532/erc20:0x0000000000000000000000000000000000000001",
    });
    expect(result.errors).toContain("price_asset_must_be_official_base_sepolia_usdc_caip19");
  });
});
