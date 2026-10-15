// FILE: lib/passport/build580.holderContinuityUi.test.ts

import { describe, expect, it } from "vitest";
import { resolveHolderIdentitySurface, IDENTITY_LOOKUP_UNAVAILABLE_COPY } from "./holderIdentityReconciliation";
import { shouldDeferReusableCredentialActions, shouldSuppressRepeatVerificationNudge } from "./holderIdentityUiCopy";

const SUI = "0x" + "2".repeat(64);
const HS = "abx_hs_" + "3".repeat(32);

describe("Build #580 Passport holder continuity UI", () => {
  it("legacy migration pending keeps existing verification recognized", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: false,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 2,
      idvApprovedRowsForLegacyWallet: 2,
      ambiguousLegacyConflict: false,
    });
    expect(surface.state).toBe("approved_verification_confirmed");
    expect(surface.detail).toMatch(/approved verification/i);
    expect(shouldSuppressRepeatVerificationNudge(surface)).toBe(true);
  });

  it("lookup unavailable suppresses repeat verification and defers issuance", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
      identityLookupUnavailable: true,
    });
    expect(surface.headline).toBe(IDENTITY_LOOKUP_UNAVAILABLE_COPY.headline);
    expect(shouldSuppressRepeatVerificationNudge(surface)).toBe(true);
    expect(shouldDeferReusableCredentialActions(surface)).toBe(true);
  });

  it("canonical subject ready allows institutional flow", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: HS,
      sessionHolderSubjectId: HS,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 1,
      idvApprovedRowsForLegacyWallet: 1,
      ambiguousLegacyConflict: false,
    });
    expect(surface.state).toBe("canonical_subject_ready");
    expect(shouldDeferReusableCredentialActions(surface)).toBe(false);
  });
});
