// FILE: lib/passport/holderIdentityReconciliation.test.ts

import { describe, expect, it } from "vitest";
import {
  LEGACY_KIND_SUI_ADDRESS,
  LEGACY_KIND_VERIFIED_WALLET_CAIP10,
  planLegacyIdentityBackfill,
  resolveHolderIdentitySurface,
} from "./holderIdentityReconciliation";

const SUI_A = "0x" + "a".repeat(64);
const SUI_B = "0x" + "b".repeat(64);
const HS_A = "abx_hs_" + "c".repeat(32);
const HS_B = "abx_hs_" + "d".repeat(32);

describe("Build #579 holder identity reconciliation", () => {
  it("skips anchors that are already linked", () => {
    const links = new Map([[`${LEGACY_KIND_SUI_ADDRESS}:${SUI_A.toLowerCase()}`, HS_A]]);
    const plan = planLegacyIdentityBackfill({
      anchors: [{ kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_A, evidence: "identity_verifications.wallet_address" }],
      existingLinks: links,
      existingCanonicalSubjects: new Set([HS_A]),
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.rows[0]?.action).toBe("skip_already_linked");
  });

  it("fails closed when two anchors imply different canonical subjects", () => {
    const links = new Map([
      [`${LEGACY_KIND_SUI_ADDRESS}:${SUI_A.toLowerCase()}`, HS_A],
      [`${LEGACY_KIND_SUI_ADDRESS}:${SUI_B.toLowerCase()}`, HS_B],
    ]);
    const plan = planLegacyIdentityBackfill({
      anchors: [
        { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_A, evidence: "identity_verifications" },
        { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI_B, evidence: "identity_verifications" },
      ],
      existingLinks: links,
      existingCanonicalSubjects: new Set([HS_A, HS_B]),
      boundCanonicalSubjectId: HS_A,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(["ambiguous_legacy_mapping", "conflicting_canonical_subjects"]).toContain(plan.code);
  });

  it("blocks unverified wallet strings without verified evidence", () => {
    const plan = planLegacyIdentityBackfill({
      anchors: [
        {
          kind: LEGACY_KIND_VERIFIED_WALLET_CAIP10,
          key: "eip155:1:0xabc",
          evidence: "wallet_bindings.row",
        },
      ],
      existingLinks: new Map(),
      existingCanonicalSubjects: new Set(),
    });
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.rows[0]?.action).toBe("block_unverified_wallet");
  });

  it("surfaces operator reconciliation when legacy IDV exists without canonical subject", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI_A,
      sessionHolderSubjectId: null,
      canonicalSchemaPresent: true,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 2,
      ambiguousLegacyConflict: false,
    });
    expect(surface.state).toBe("reconciliation_operator_required");
    expect(surface.operator_review_required).toBe(true);
  });

  it("surfaces legacy authenticated state when canonical schema is absent", () => {
    const surface = resolveHolderIdentitySurface({
      sessionSubjectId: SUI_A,
      canonicalSchemaPresent: false,
      legacyLinkSubjectId: null,
      idvRowsForLegacyWallet: 1,
      ambiguousLegacyConflict: false,
    });
    expect(surface.state).toBe("legacy_holder_authenticated");
  });
});
