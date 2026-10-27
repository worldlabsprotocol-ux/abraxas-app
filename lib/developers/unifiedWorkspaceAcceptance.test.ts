// FILE: lib/developers/unifiedWorkspaceAcceptance.test.ts

import { describe, expect, it } from "vitest";
import {
  buildUnifiedWorkspaceContinuitySnapshot,
  queryParamsMustNotAuthorizePartnerAdmin,
  unifiedWorkspaceAcceptanceMet,
} from "./unifiedWorkspaceAcceptance";

describe("unifiedWorkspaceAcceptance", () => {
  it("treats server guided progress as wallet proof restoration", () => {
    const snapshot = buildUnifiedWorkspaceContinuitySnapshot({
      pathname: "/developers/ephemeral-sandbox",
      search: "?integration=1&pack=wallet_control",
      guidedProgress: {
        workspace_id: "esbx_1",
        session_id: "sess",
        policy_id: "wallet_control",
        decision: "approved",
        receipt_id: "dr_esbx_x",
        recorded_at: "2026-01-01T00:00:00.000Z",
      },
      clientHasWalletProof: false,
      clientReceiptValidationStatus: "idle",
    });
    expect(snapshot.wallet_proof_restored).toBe(true);
    expect(unifiedWorkspaceAcceptanceMet(snapshot)).toBe(true);
  });

  it("does not treat query params alone as partner admin", () => {
    expect(
      queryParamsMustNotAuthorizePartnerAdmin("?integration=1&partner_id=fake"),
    ).toBe(true);
  });
});
