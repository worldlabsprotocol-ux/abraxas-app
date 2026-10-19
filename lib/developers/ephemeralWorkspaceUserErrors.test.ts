// FILE: lib/developers/ephemeralWorkspaceUserErrors.test.ts

import { describe, expect, it } from "vitest";
import { mapWorkspaceUserFacingError } from "./ephemeralWorkspaceUserErrors";

describe("mapWorkspaceUserFacingError", () => {
  it("maps wallet_sign_in_required to session expired copy", () => {
    const row = mapWorkspaceUserFacingError({ code: "wallet_sign_in_required" });
    expect(row.title).toBe("Session expired");
    expect(row.message).not.toContain("wallet_sign_in_required");
  });

  it("maps insufficient evidence without raw code in message", () => {
    const row = mapWorkspaceUserFacingError({ code: "insufficient_evidence_for_policy" });
    expect(row.title).toBe("Evidence required");
    expect(row.technicalCode).toBe("insufficient_evidence_for_policy");
  });
});
