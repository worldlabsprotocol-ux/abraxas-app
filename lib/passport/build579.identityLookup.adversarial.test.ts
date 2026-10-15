// FILE: lib/passport/build579.identityLookup.adversarial.test.ts

import { describe, expect, it, vi } from "vitest";
import {
  IDENTITY_LOOKUP_UNAVAILABLE_COPY,
  resolveHolderIdentitySurface,
} from "./holderIdentityReconciliation";
import { shouldDeferReusableCredentialActions, shouldSuppressRepeatVerificationNudge } from "./holderIdentityUiCopy";

const SUI = "0x" + "e".repeat(64);
const HS = "abx_hs_" + "f".repeat(32);

describe("Build #579 adversarial identity lookup surfaces", () => {
  it("legacy Production schema: verified holder stays legacy-authenticated without re-verify nudge", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: false,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 3,
      ambiguousLegacyConflict: false,
      identityLookupUnavailable: false,
    });
    expect(surface.state).toBe("legacy_holder_authenticated");
    expect(surface.detail).toMatch(/existing verification remains/i);
    expect(shouldSuppressRepeatVerificationNudge(surface)).toBe(false);
  });

  it("migrated schema: IDV rows without canonical subject require operator reconciliation", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 1,
      ambiguousLegacyConflict: false,
    });
    expect(surface.state).toBe("reconciliation_operator_required");
    expect(shouldDeferReusableCredentialActions(surface)).toBe(true);
  });

  it("database failure must not downgrade to zero-IDV legacy path", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
      identityLookupUnavailable: true,
    });
    expect(surface.state).toBe("identity_lookup_unavailable");
    expect(surface.headline).toBe(IDENTITY_LOOKUP_UNAVAILABLE_COPY.headline);
    expect(surface.detail).toMatch(/do not start verification again/i);
    expect(shouldSuppressRepeatVerificationNudge(surface)).toBe(true);
    expect(shouldDeferReusableCredentialActions(surface)).toBe(true);
  });

  it("conflicting legacy links stay blocked ahead of lookup unavailable", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: HS,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: true,
      identityLookupUnavailable: true,
    });
    expect(surface.state).toBe("ambiguous_identity_blocked");
  });

  it("existing verified holder continuity when canonical subject already in session", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: HS,
      sessionHolderSubjectId: HS,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 0,
      ambiguousLegacyConflict: false,
      identityLookupUnavailable: true,
    });
    expect(surface.state).toBe("canonical_subject_ready");
  });
});

describe("Build #579 holderIdentitySurfaceDirect integration (mocked pg)", () => {
  it("maps pg column errors to identity_lookup_unavailable", async () => {
    vi.resetModules();
    vi.doMock("@/lib/persistence/env", () => ({
      isPassportDirectPostgresEnabled: () => true,
    }));
    vi.doMock("@/lib/persistence/pgPool", () => ({
      queryAbraxasPg: vi.fn(async (sql: string) => {
        if (typeof sql === "string" && sql.includes("information_schema.tables")) {
          return { rows: [{ exists: true }] };
        }
        if (typeof sql === "string" && sql.includes("information_schema.columns")) {
          return { rows: [{ exists: true }] };
        }
        if (typeof sql === "string" && sql.includes("identity_verifications")) {
          throw new Error("connection terminated unexpectedly");
        }
        if (typeof sql === "string" && sql.includes("passport_holder_legacy_links")) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
    }));

    const { loadHolderIdentitySurfaceForSession } = await import("@/lib/persistence/holderIdentitySurfaceDirect");
    const surface = await loadHolderIdentitySurfaceForSession({
      subjectId: SUI,
      suiAddress: SUI,
      holderSubjectId: null,
    } as import("@/lib/auth/browserSession").BrowserSession);

    expect(surface.state).toBe("identity_lookup_unavailable");
    vi.doUnmock("@/lib/persistence/env");
    vi.doUnmock("@/lib/persistence/pgPool");
  });
});
