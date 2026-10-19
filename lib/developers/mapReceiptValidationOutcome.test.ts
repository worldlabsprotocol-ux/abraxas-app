// FILE: lib/developers/mapReceiptValidationOutcome.test.ts

import { describe, expect, it } from "vitest";
import { mapReceiptValidationApiResponse } from "./mapReceiptValidationOutcome";

describe("mapReceiptValidationApiResponse", () => {
  it("maps successful independent validation", () => {
    const state = mapReceiptValidationApiResponse({
      ok: true,
      checked_at: "2026-01-01T00:00:00.000Z",
      signature_authentic: true,
      currently_acceptable: true,
      invalidation_reasons: [],
    });
    expect(state.status).toBe("validated");
    if (state.status !== "validated") return;
    expect(state.signatureAuthentic).toBe(true);
    expect(state.currentlyAcceptable).toBe(true);
  });

  it("uses sandbox-accurate copy when standalone crypto is false", () => {
    const state = mapReceiptValidationApiResponse({
      ok: true,
      checked_at: "2026-01-01T00:00:00.000Z",
      signature_authentic: true,
      currently_acceptable: true,
      standalone_cryptographic_verification: false,
      server_record_integrity_verified: true,
      signature_authentic_basis: "sandbox_server_record_and_policy_gates",
    });
    expect(state.status).toBe("validated");
    if (state.status !== "validated") return;
    expect(state.verificationSummary).toContain("not standalone registry-backed");
  });

  it("fails closed on invalid signature", () => {
    const state = mapReceiptValidationApiResponse({
      ok: false,
      signature_authentic: false,
      currently_acceptable: false,
    });
    expect(state.status).toBe("failed");
  });

  it("uses sandbox-accurate failure copy", () => {
    const state = mapReceiptValidationApiResponse({
      signature_authentic: false,
      standalone_cryptographic_verification: false,
      signature_authentic_basis: "sandbox_server_record_and_policy_gates",
    });
    expect(state.status).toBe("failed");
    if (state.status !== "failed") return;
    expect(state.message).toContain("sandbox test receipt");
  });
});
