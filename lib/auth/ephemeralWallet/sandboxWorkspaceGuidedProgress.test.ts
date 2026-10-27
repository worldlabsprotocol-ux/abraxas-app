// FILE: lib/auth/ephemeralWallet/sandboxWorkspaceGuidedProgress.test.ts

import { afterEach, describe, expect, it } from "vitest";
import {
  getEphemeralSandboxGuidedProgressForSession,
  recordEphemeralSandboxGuidedProgress,
  resetEphemeralSandboxGuidedProgressForTests,
  updateEphemeralSandboxGuidedReceiptValidation,
} from "./sandboxWorkspaceGuidedProgress";

describe("sandboxWorkspaceGuidedProgress", () => {
  afterEach(() => {
    resetEphemeralSandboxGuidedProgressForTests();
  });

  it("records and loads progress by session (memory backend in tests)", async () => {
    await recordEphemeralSandboxGuidedProgress({
      workspace_id: "esbx_test",
      session_id: "sess_a",
      policy_id: "wallet_control",
      decision: "approved",
      receipt_id: "dr_esbx_abc",
      recorded_at: new Date().toISOString(),
    });
    const loaded = await getEphemeralSandboxGuidedProgressForSession("sess_a");
    expect(loaded?.receipt_id).toBe("dr_esbx_abc");
    expect(loaded?.policy_id).toBe("wallet_control");
  });

  it("updates receipt validation without changing receipt id", async () => {
    await recordEphemeralSandboxGuidedProgress({
      workspace_id: "esbx_test",
      session_id: "sess_a",
      policy_id: "wallet_control",
      decision: "approved",
      receipt_id: "dr_esbx_abc",
      recorded_at: new Date().toISOString(),
    });
    const updated = await updateEphemeralSandboxGuidedReceiptValidation({
      sessionId: "sess_a",
      workspaceId: "esbx_test",
      receiptId: "dr_esbx_abc",
      validation: {
        status: "validated",
        checked_at: "2026-01-01T00:00:00.000Z",
        signature_authentic: true,
        currently_acceptable: true,
        invalidation_reasons: [],
      },
    });
    expect(updated.ok).toBe(true);
    const loaded = await getEphemeralSandboxGuidedProgressForSession("sess_a");
    expect(loaded?.receipt_validation?.status).toBe("validated");
  });

  it("rejects validation update when receipt id does not match", async () => {
    await recordEphemeralSandboxGuidedProgress({
      workspace_id: "esbx_test",
      session_id: "sess_a",
      policy_id: "wallet_control",
      decision: "approved",
      receipt_id: "dr_esbx_abc",
      recorded_at: new Date().toISOString(),
    });
    const updated = await updateEphemeralSandboxGuidedReceiptValidation({
      sessionId: "sess_a",
      workspaceId: "esbx_test",
      receiptId: "dr_esbx_other",
      validation: {
        status: "validated",
        checked_at: "2026-01-01T00:00:00.000Z",
        signature_authentic: true,
        currently_acceptable: true,
        invalidation_reasons: [],
      },
    });
    expect(updated.ok).toBe(false);
    if (!updated.ok) expect(updated.code).toBe("receipt_mismatch");
  });
});
