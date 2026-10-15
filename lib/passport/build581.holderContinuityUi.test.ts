// FILE: lib/passport/build581.holderContinuityUi.test.ts

import { describe, expect, it } from "vitest";
import { resolveHolderIdentitySurface } from "./holderIdentityReconciliation";
import {
  isCanonicalMigrationVisibleSuccess,
  shouldDeferReusableCredentialActions,
} from "./holderIdentityUiCopy";

describe("Build #581 Passport post-migration holder visibility", () => {
  it("shows canonical subject success without deferring credential prep actions", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: "0x" + "1".repeat(64),
      sessionHolderSubjectId: "abx_hs_" + "2".repeat(32),
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: "abx_hs_" + "2".repeat(32),
      idvRowsForLegacyWallet: 1,
      idvApprovedRowsForLegacyWallet: 1,
      ambiguousLegacyConflict: false,
    });
    expect(surface.state).toBe("canonical_subject_ready");
    expect(isCanonicalMigrationVisibleSuccess(surface)).toBe(true);
    expect(shouldDeferReusableCredentialActions(surface)).toBe(false);
  });
});
