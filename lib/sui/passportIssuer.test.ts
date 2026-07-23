import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  getSponsorEnvDiagnostics,
  isPassportIssuerConfigured,
} from "./passportIssuer";

describe("passportIssuer configuration", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it("reports missing sponsor key", () => {
    delete process.env.SUI_SPONSOR_SECRET_KEY;
    delete process.env.SUI_ISSUER_SECRET_KEY;
    delete process.env.SUI_ISSUANCE_CAP_OBJECT_ID;
    const d = getSponsorEnvDiagnostics();
    expect(d.sponsor_key_status).toBe("missing");
    expect(d.issuer_fully_configured).toBe(false);
  });

  it("rejects malformed issuance cap length", () => {
    process.env.SUI_ISSUANCE_CAP_OBJECT_ID = "0xshort";
    const d = getSponsorEnvDiagnostics();
    expect(d.issuance_cap_length_ok).toBe(false);
    expect(d.issuer_fully_configured).toBe(false);
  });

  it("accepts valid cap format when key is valid", () => {
    process.env.SUI_ISSUANCE_CAP_OBJECT_ID =
      "0x" + "a".repeat(64);
    // Without a real key, issuer_fully_configured stays false
    delete process.env.SUI_SPONSOR_SECRET_KEY;
    const d = getSponsorEnvDiagnostics();
    expect(d.issuance_cap_length_ok).toBe(true);
    expect(d.issuer_fully_configured).toBe(false);
  });

  it("isPassportIssuerConfigured is false in production without valid diagnostics", () => {
    process.env.VERCEL = "1";
    process.env.SUI_SPONSOR_SECRET_KEY = "not-a-key";
    process.env.SUI_ISSUANCE_CAP_OBJECT_ID = "0x" + "b".repeat(64);
    expect(isPassportIssuerConfigured()).toBe(false);
  });
});
