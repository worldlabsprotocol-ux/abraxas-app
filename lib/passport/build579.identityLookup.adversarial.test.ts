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
      idvApprovedRowsForLegacyWallet: 3,
      ambiguousLegacyConflict: false,
      identityLookupUnavailable: false,
    });
    expect(surface.state).toBe("approved_verification_confirmed");
    expect(surface.detail).toMatch(/approved verification/i);
    expect(shouldSuppressRepeatVerificationNudge(surface)).toBe(true);
  });

  it("migrated schema: IDV rows without canonical subject require operator reconciliation", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 1,
      idvApprovedRowsForLegacyWallet: 1,
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
    expect(surface.detail).toMatch(/do not start again/i);
    expect(surface.detail).not.toMatch(/connection terminated/i);
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
    expect(shouldDeferReusableCredentialActions(surface)).toBe(true);
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
    expect(shouldDeferReusableCredentialActions(surface)).toBe(false);
  });
});

describe("Build #579 countIdentityVerificationsForSessionKeys (mocked pg)", () => {
  it("returns unavailable when no identity columns exist", async () => {
    vi.doMock("@/lib/persistence/pgPool", () => ({
      queryAbraxasPg: vi.fn(async () => ({ rows: [] })),
    }));
    vi.resetModules();
    const { countIdentityVerificationsForSessionKeys: count } = await import(
      "@/lib/persistence/holderIdentityIdvLookup"
    );
    const result = await count({
      sessionSubjectId: SUI,
      columnSchema: { walletAddress: false, suiAddress: false, holderSubjectId: false },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("identity_lookup_unavailable");
    vi.doUnmock("@/lib/persistence/pgPool");
  });

  it("returns unavailable on database query failure", async () => {
    vi.doMock("@/lib/persistence/pgPool", () => ({
      queryAbraxasPg: vi.fn(async (sql: string) => {
        if (typeof sql === "string" && sql.includes("count(*)")) {
          throw new Error("connection terminated unexpectedly");
        }
        return { rows: [{ column_name: "sui_address" }] };
      }),
    }));
    vi.resetModules();
    const { countIdentityVerificationsForSessionKeys: count } = await import(
      "@/lib/persistence/holderIdentityIdvLookup"
    );
    const result = await count({ sessionSubjectId: SUI, suiAddress: SUI });
    expect(result.ok).toBe(false);
    vi.doUnmock("@/lib/persistence/pgPool");
  });
});

describe("Build #579 holderIdentitySurfaceDirect integration (mocked pg)", () => {
  it("legacy sui-only schema: verified rows trigger operator reconciliation when canonical tables exist", async () => {
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
          return { rows: [{ column_name: "sui_address" }] };
        }
        if (typeof sql === "string" && sql.includes("count(*)")) {
          return { rows: [{ c: 2 }] };
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

    expect(surface.state).toBe("reconciliation_operator_required");
    expect(shouldDeferReusableCredentialActions(surface)).toBe(true);
    vi.doUnmock("@/lib/persistence/env");
    vi.doUnmock("@/lib/persistence/pgPool");
  });

  it("conflicting legacy links map to ambiguous_identity_blocked", async () => {
    vi.resetModules();
    vi.doMock("@/lib/persistence/env", () => ({
      isPassportDirectPostgresEnabled: () => true,
    }));
    const HS_A = "abx_hs_" + "a".repeat(32);
    const HS_B = "abx_hs_" + "b".repeat(32);
    const SUI_B = "0x" + "b".repeat(64);
    vi.doMock("@/lib/persistence/pgPool", () => ({
      queryAbraxasPg: vi.fn(async (sql: string, params?: string[]) => {
        if (typeof sql === "string" && sql.includes("information_schema.tables")) {
          return { rows: [{ exists: true }] };
        }
        if (typeof sql === "string" && sql.includes("information_schema.columns")) {
          return { rows: [{ column_name: "sui_address" }] };
        }
        if (typeof sql === "string" && sql.includes("passport_holder_legacy_links")) {
          const key = params?.[1];
          if (key === SUI.toLowerCase()) return { rows: [{ subject_id: HS_A }] };
          if (key === SUI_B.toLowerCase()) return { rows: [{ subject_id: HS_B }] };
        }
        if (typeof sql === "string" && sql.includes("count(*)")) {
          return { rows: [{ c: 0 }] };
        }
        return { rows: [] };
      }),
    }));

    const { loadHolderIdentitySurfaceForSession } = await import("@/lib/persistence/holderIdentitySurfaceDirect");
    const surface = await loadHolderIdentitySurfaceForSession({
      subjectId: SUI_B,
      suiAddress: SUI,
      holderSubjectId: null,
    } as import("@/lib/auth/browserSession").BrowserSession);

    expect(surface.state).toBe("ambiguous_identity_blocked");
    vi.doUnmock("@/lib/persistence/env");
    vi.doUnmock("@/lib/persistence/pgPool");
  });

  it("maps pg failures to identity_lookup_unavailable without leaking errors to UI copy", async () => {
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
          return { rows: [{ column_name: "sui_address" }, { column_name: "holder_subject_id" }] };
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
    expect(surface.detail).toBe(IDENTITY_LOOKUP_UNAVAILABLE_COPY.detail);
    vi.doUnmock("@/lib/persistence/env");
    vi.doUnmock("@/lib/persistence/pgPool");
  });
});
