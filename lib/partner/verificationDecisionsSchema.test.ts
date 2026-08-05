import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isMissingIdempotencyKeyColumnError,
  isVerificationDecisionIdempotencyKeyAvailable,
  markVerificationDecisionIdempotencyKeyAbsent,
  markVerificationDecisionIdempotencyKeyAvailable,
  resetVerificationDecisionSchemaProbeForTests,
} from "@/lib/partner/verificationDecisionsSchema";

const selectMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  requireSupabaseAdmin: () => ({
    from: () => ({
      select: (...args: unknown[]) => selectMock(...args),
    }),
  }),
}));

describe("verificationDecisionsSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVerificationDecisionSchemaProbeForTests();
  });

  it("detects missing idempotency_key column errors", () => {
    expect(isMissingIdempotencyKeyColumnError({ code: "42703", message: "column does not exist" })).toBe(true);
    expect(
      isMissingIdempotencyKeyColumnError({
        message: 'column verification_decisions.idempotency_key does not exist',
      }),
    ).toBe(true);
    expect(isMissingIdempotencyKeyColumnError({ message: "connection refused" })).toBe(false);
  });

  it("probes available when select succeeds", async () => {
    selectMock.mockReturnValue({ limit: async () => ({ error: null }) });
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).resolves.toBe(true);
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).resolves.toBe(true);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it("probes absent when column is missing", async () => {
    selectMock.mockReturnValue({
      limit: async () => ({
        error: { code: "42703", message: 'column "idempotency_key" does not exist' },
      }),
    });
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).resolves.toBe(false);
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).resolves.toBe(false);
    expect(selectMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces unexpected probe errors", async () => {
    selectMock.mockReturnValue({
      limit: async () => ({ error: { message: "permission denied for table verification_decisions" } }),
    });
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).rejects.toThrow("permission denied");
  });

  it("allows explicit cache marks for tests", async () => {
    markVerificationDecisionIdempotencyKeyAbsent();
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).resolves.toBe(false);
    expect(selectMock).not.toHaveBeenCalled();

    resetVerificationDecisionSchemaProbeForTests();
    markVerificationDecisionIdempotencyKeyAvailable();
    await expect(isVerificationDecisionIdempotencyKeyAvailable()).resolves.toBe(true);
    expect(selectMock).not.toHaveBeenCalled();
  });
});
