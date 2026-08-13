// FILE: scripts/demo/lib/expectedDemoSigningKeyThumbprint.test.ts

import { describe, expect, it } from "vitest";
import {
  assertDemoSigningKeyBootstrapConfigured,
  DemoSigningKeyBootstrapError,
  EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT,
  isDemoSigningKeyBootstrapConfigured,
} from "./expectedDemoSigningKeyThumbprint";

describe("expectedDemoSigningKeyThumbprint", () => {
  it("ships unconfigured for live apply", () => {
    expect(EXPECTED_DEMO_SIGNING_KEY_THUMBPRINT).toBeNull();
    expect(isDemoSigningKeyBootstrapConfigured()).toBe(false);
  });

  it("fails closed with demo_signing_key_not_configured", () => {
    expect(() => assertDemoSigningKeyBootstrapConfigured()).toThrow(DemoSigningKeyBootstrapError);
    try {
      assertDemoSigningKeyBootstrapConfigured();
    } catch (error) {
      expect((error as DemoSigningKeyBootstrapError).code).toBe("demo_signing_key_not_configured");
    }
  });
});
