// FILE: scripts/demo/lib/expectedDemoSigningKeyThumbprint.test.ts

import { describe, expect, it } from "vitest";
import {
  assertDemoSigningKeyBootstrapConfigured,
  EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT,
  isDemoSigningKeyBootstrapConfigured,
} from "./expectedDemoSigningKeyThumbprint";

describe("expectedDemoSigningKeyThumbprint", () => {
  it("ships with reviewed demo signing public thumbprint configured", () => {
    expect(EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT).not.toBeNull();
    expect(EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT).toMatch(/^[0-9a-f]{64}$/);
    expect(EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT).toHaveLength(64);
  });

  it("enables live apply bootstrap checks", () => {
    expect(isDemoSigningKeyBootstrapConfigured()).toBe(true);
    expect(() => assertDemoSigningKeyBootstrapConfigured()).not.toThrow();
  });
});
