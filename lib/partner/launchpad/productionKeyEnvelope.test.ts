// FILE: lib/partner/launchpad/productionKeyEnvelope.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  decryptProductionKeyForReveal,
  encryptProductionKeyForReveal,
} from "@/lib/partner/launchpad/productionKeyEnvelope";

describe("production key envelope", () => {
  beforeEach(() => {
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "browser-session-secret-32chars";
  });

  it("encrypts and decrypts for one time reveal", () => {
    const appId = "00000000-0000-4000-8000-000000000001";
    const encrypted = encryptProductionKeyForReveal(appId, "abx_live_example_key_material");
    expect(encrypted).toBeTruthy();
    const decrypted = decryptProductionKeyForReveal(appId, encrypted!);
    expect(decrypted).toBe("abx_live_example_key_material");
  });

  it("rejects wrong application binding", () => {
    const encrypted = encryptProductionKeyForReveal("app-a", "abx_live_example_key_material");
    expect(decryptProductionKeyForReveal("app-b", encrypted!)).toBeNull();
  });
});
