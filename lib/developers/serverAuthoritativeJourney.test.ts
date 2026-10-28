// FILE: lib/developers/serverAuthoritativeJourney.test.ts

import { describe, expect, it } from "vitest";
import { buildServerAuthoritativeJourneySnapshot } from "./serverAuthoritativeJourney";

const validatedProgress = {
  workspace_id: "esbx_1",
  session_id: "sess_1",
  policy_id: "wallet_control",
  decision: "approved",
  receipt_id: "rcpt_1",
  recorded_at: new Date().toISOString(),
  receipt_validation: {
    status: "validated" as const,
    checked_at: new Date().toISOString(),
    signature_authentic: true,
    currently_acceptable: true,
    invalidation_reasons: [],
  },
};

describe("buildServerAuthoritativeJourneySnapshot", () => {
  it("locks policy when validated wallet proof and workspace active", () => {
    const snapshot = buildServerAuthoritativeJourneySnapshot({
      guidedProgress: validatedProgress,
      workspaceExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(snapshot?.policy_locked).toBe(true);
    expect(snapshot?.studio_pack_id).toBe("wallet_control");
    expect(snapshot?.workflow_phase).toBe("integration_ready");
  });

  it("does not lock when workspace expired", () => {
    const snapshot = buildServerAuthoritativeJourneySnapshot({
      guidedProgress: validatedProgress,
      workspaceExpiresAt: new Date(Date.now() - 60_000).toISOString(),
      now: new Date(),
    });
    expect(snapshot?.policy_locked).toBe(false);
    expect(snapshot?.policy_lock_reasons).toContain("workspace_expired");
  });

  it("does not lock when policy is not authorized for sandbox", () => {
    const snapshot = buildServerAuthoritativeJourneySnapshot({
      guidedProgress: {
        ...validatedProgress,
        policy_id: "revoked_production_policy",
      },
      workspaceExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(snapshot?.policy_locked).toBe(false);
    expect(snapshot?.policy_lock_reasons).toContain("policy_not_authorized");
    expect(snapshot?.studio_pack_id).toBeNull();
  });

  it("does not lock on wallet signature alone without validated receipt", () => {
    const snapshot = buildServerAuthoritativeJourneySnapshot({
      guidedProgress: {
        ...validatedProgress,
        receipt_validation: {
          status: "failed",
          checked_at: new Date().toISOString(),
          signature_authentic: false,
          currently_acceptable: false,
          invalidation_reasons: ["signature_invalid"],
        },
      },
      workspaceExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(snapshot?.policy_locked).toBe(false);
    expect(snapshot?.policy_lock_reasons).toContain("wallet_proof_not_validated");
  });

  it("does not lock when receipt validation is stale (currently unacceptable)", () => {
    const snapshot = buildServerAuthoritativeJourneySnapshot({
      guidedProgress: {
        ...validatedProgress,
        receipt_validation: {
          ...validatedProgress.receipt_validation!,
          currently_acceptable: false,
        },
      },
      workspaceExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(snapshot?.policy_locked).toBe(false);
  });
});
