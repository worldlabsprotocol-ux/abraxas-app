// FILE: lib/passport/build579.passportProductState.test.ts

import { describe, expect, it } from "vitest";
import { resolveReusableCredentialLifecycle } from "./reusableCredential/credentialLifecycle";
import { resolveHolderIdentitySurface } from "./holderIdentityReconciliation";
import { shouldDeferReusableCredentialActions, shouldSuppressRepeatVerificationNudge } from "./holderIdentityUiCopy";

describe("Build #579 Passport product state alignment", () => {
  it("does not imply issuance is operational when storage is disabled", () => {
    const lifecycle = resolveReusableCredentialLifecycle({
      storageEnabled: false,
      possessionKeyRegistered: false,
      verificationRows: [],
      activeIssuerBackedCredentialCount: 0,
      expiredIssuerBackedCredentialCount: 0,
    });
    expect(lifecycle.state).toBe("issuance_unavailable");
    expect(lifecycle.headline).toMatch(/unavailable/i);
  });

  it("defers reusable credential actions when operator reconciliation is required", () => {
    const holder = resolveHolderIdentitySurface({
      sessionSubjectId: "0x" + "a".repeat(64),
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 1,
      ambiguousLegacyConflict: false,
    });
    expect(shouldDeferReusableCredentialActions(holder)).toBe(true);
  });

  it("suppresses repeat-verification nudge when identity lookup is unavailable", () => {
    const holder = resolveHolderIdentitySurface({
      sessionSubjectId: "0x" + "c".repeat(64),
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
      identityLookupUnavailable: true,
    });
    expect(holder.state).toBe("identity_lookup_unavailable");
    expect(shouldSuppressRepeatVerificationNudge(holder)).toBe(true);
    expect(shouldDeferReusableCredentialActions(holder)).toBe(true);
  });

  it("allows institutional flow when canonical subject is ready and credential issued", () => {
    const holder = resolveHolderIdentitySurface({
      sessionSubjectId: "abx_hs_" + "b".repeat(32),
      sessionHolderSubjectId: "abx_hs_" + "b".repeat(32),
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
    });
    expect(holder.state).toBe("canonical_subject_ready");
    expect(shouldDeferReusableCredentialActions(holder)).toBe(false);
  });
});
