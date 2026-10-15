// FILE: lib/partner/build583.institutionalSandboxFirstVerificationCard.test.ts

import { describe, expect, it } from "vitest";
import {
  deriveInstitutionalCardEvidenceState,
  independentVerificationObserved,
  integrationHealthErrorMessage,
  parseOperationalHealthPayload,
  resolveInstitutionalCardNextAction,
} from "@/lib/partner/launchpad/institutionalSandboxFirstVerificationCardState";

describe("institutionalSandboxFirstVerificationCardState", () => {
  it("parses valid integration health payloads", () => {
    const parsed = parseOperationalHealthPayload({
      ok: true,
      verification_successes: 1,
      status: "healthy",
      institutional_activation: { milestones: [], contract_version: "1.0.0" },
    });
    expect(parsed?.verification_successes).toBe(1);
  });

  it("rejects invalid integration health payloads", () => {
    expect(parseOperationalHealthPayload({ ok: false, error: "unauthorized" })).toBeNull();
    expect(parseOperationalHealthPayload(null)).toBeNull();
  });

  it("maps HTTP statuses to session and retry guidance", () => {
    const expired = integrationHealthErrorMessage({ httpStatus: 401, body: {}, networkError: false });
    expect(expired.sessionExpired).toBe(true);
    const network = integrationHealthErrorMessage({ httpStatus: null, body: null, networkError: true });
    expect(network.retryable).toBe(true);
  });

  it("never treats application existence as verified", () => {
    expect(independentVerificationObserved(null)).toBe(false);
    expect(independentVerificationObserved({ status: "healthy", verification_successes: 0, last_receipt_verified_at: null })).toBe(false);
    expect(independentVerificationObserved({ status: "healthy", verification_successes: 1, last_receipt_verified_at: "2026-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("derives distinct evidence states", () => {
    expect(deriveInstitutionalCardEvidenceState({ kind: "loading" })).toBe("loading");
    expect(deriveInstitutionalCardEvidenceState({ kind: "session_expired", message: "expired" })).toBe("session_expired");
    expect(
      deriveInstitutionalCardEvidenceState({
        kind: "ready",
        health: { status: "healthy", verification_successes: 0, last_receipt_verified_at: null },
      }),
    ).toBe("unavailable");
  });

  it("selects journey next action without implying verification success", () => {
    const action = resolveInstitutionalCardNextAction({ journey: null, activation: undefined });
    expect(action.label).toContain("Create sandbox");
  });
});
