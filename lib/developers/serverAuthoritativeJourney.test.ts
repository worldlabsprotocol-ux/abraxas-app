// FILE: lib/developers/serverAuthoritativeJourney.test.ts

import { describe, expect, it } from "vitest";
import { buildServerAuthoritativeJourneySnapshot } from "./serverAuthoritativeJourney";

describe("buildServerAuthoritativeJourneySnapshot", () => {
  it("locks policy when validated wallet proof exists", () => {
    const snapshot = buildServerAuthoritativeJourneySnapshot({
      guidedProgress: {
        workspace_id: "esbx_1",
        session_id: "sess_1",
        policy_id: "wallet_control",
        decision: "approved",
        receipt_id: "rcpt_1",
        recorded_at: new Date().toISOString(),
        receipt_validation: {
          status: "validated",
          checked_at: new Date().toISOString(),
          signature_authentic: true,
          currently_acceptable: true,
          invalidation_reasons: [],
        },
      },
    });
    expect(snapshot?.policy_locked).toBe(true);
    expect(snapshot?.workflow_phase).toBe("integration_ready");
  });
});
