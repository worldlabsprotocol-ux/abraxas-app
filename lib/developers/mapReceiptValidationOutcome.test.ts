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

  it("fails closed on invalid signature", () => {
    const state = mapReceiptValidationApiResponse({
      ok: false,
      signature_authentic: false,
      currently_acceptable: false,
    });
    expect(state.status).toBe("failed");
  });
});
