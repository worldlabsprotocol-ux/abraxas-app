// FILE: scripts/demo/lib/demoProvisionerSigning.test.ts

import { describe, expect, it, vi } from "vitest";

const { FIXTURE_THUMBPRINT, FIXTURE_PRIVATE_JWK } = vi.hoisted(() => ({
  FIXTURE_THUMBPRINT: "ced6e4c144e3dc4ca402657e7094cbda68e2d1401168c5265bb5c86cc34eaeba",
  FIXTURE_PRIVATE_JWK: {
    kty: "OKP",
    crv: "Ed25519",
    x: "zswVB9wd3XKVlRwpCIjwla25BE0bc9aW5t8GXWg71Pw",
    d: "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  },
}));

vi.mock("./expectedDemoSigningKeyThumbprint", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./expectedDemoSigningKeyThumbprint")>();
  return {
    ...actual,
    EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT: FIXTURE_THUMBPRINT,
    isDemoSigningKeyBootstrapConfigured: () => true,
    assertDemoSigningKeyBootstrapConfigured: () => undefined,
  };
});

import {
  canonicalPublicJwkThumbprint,
  DemoProvisionerSigningError,
  validateDemoSigningKeyJson,
} from "./demoProvisionerSigning";
import {
  assertDemoSigningKeyBootstrapConfigured,
  isDemoSigningKeyBootstrapConfigured,
} from "./expectedDemoSigningKeyThumbprint";

describe("demoProvisionerSigning", () => {
  it("accepts the injected test thumbprint fixture", () => {
    const result = validateDemoSigningKeyJson(JSON.stringify(FIXTURE_PRIVATE_JWK));
    expect(result.thumbprint).toBe(FIXTURE_THUMBPRINT);
  });

  it("rejects malformed keys", () => {
    expect(() => validateDemoSigningKeyJson("{")).toThrow(DemoProvisionerSigningError);
    expect(() => validateDemoSigningKeyJson(JSON.stringify({ kty: "RSA" }))).toThrow(
      DemoProvisionerSigningError,
    );
  });

  it("rejects thumbprint mismatch", () => {
    const mismatched = {
      ...FIXTURE_PRIVATE_JWK,
      x: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };
    expect(() => validateDemoSigningKeyJson(JSON.stringify(mismatched))).toThrow(
      /does not match/,
    );
  });

  it("computes stable canonical thumbprints", () => {
    const thumb = canonicalPublicJwkThumbprint({
      kty: "OKP",
      crv: "Ed25519",
      x: FIXTURE_PRIVATE_JWK.x,
    });
    expect(thumb).toBe(FIXTURE_THUMBPRINT);
  });

  it("reports configured under test mock", () => {
    expect(isDemoSigningKeyBootstrapConfigured()).toBe(true);
    expect(() => assertDemoSigningKeyBootstrapConfigured()).not.toThrow();
  });
});
