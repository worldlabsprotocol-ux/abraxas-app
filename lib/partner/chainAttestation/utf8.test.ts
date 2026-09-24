import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { keccak256 } from "viem";
import { utf8Bytes } from "./utf8";
import { hashUtf8 } from "./hashes";
import { fingerprintPublicVerifier } from "@/lib/partner/chainAttestationSignerLifecycle/safety";

describe("protocol UTF-8 hashing in production bundles", () => {
  it("keeps literal UTF-8 for hex-looking values and Unicode", () => {
    expect(Array.from(utf8Bytes("0x12"))).toEqual([48, 120, 49, 50]);
    expect(Array.from(utf8Bytes("é"))).toEqual([0xc3, 0xa9]);
    expect(hashUtf8("0x12")).toBe(keccak256(new Uint8Array([48, 120, 49, 50])));
    expect(fingerprintPublicVerifier(" 0xAB ")).toBe(hashUtf8("0xab"));
  });

  it("does not import the unavailable viem stringToBytes helper in server routes", () => {
    for (const path of [
      "lib/partner/chainAttestationSignerLifecycle/registry.ts",
      "lib/partner/chainAttestationSignerLifecycle/safety.ts",
      "lib/partner/chainAttestation/hashes.ts",
      "lib/organizationEligibility/opaque.ts",
      "lib/partner/onchainVerifierConformance/vectors.ts",
      "lib/partner/onchainGateDeployments/digests.ts",
      "lib/partner/testnetGateDeploymentKit/institutional.ts",
      "lib/partner/testnetGateDeploymentKit/plan.ts",
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toMatch(/import\s*\{[^}]*stringToBytes[^}]*\}\s*from\s*["']viem["']/s);
    }
  });
});
