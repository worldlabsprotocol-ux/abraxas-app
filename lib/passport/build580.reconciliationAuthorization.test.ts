// FILE: lib/passport/build580.reconciliationAuthorization.test.ts

import { describe, expect, it } from "vitest";
import {
  computeReconciliationBatchDigest,
  validateReconciliationExecutionBatch,
  verifyReconciliationExecutionAuthorization,
} from "./holderIdentityReconciliationAuth";
import { LEGACY_KIND_SUI_ADDRESS, type ReconciliationPlanRow } from "./holderIdentityReconciliation";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";
import type { ReconciliationDatabaseBinding } from "./reconciliationDatabaseBinding";

const SUI = "0x" + "5".repeat(64);

const rows: ReconciliationPlanRow[] = [
  {
    anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" },
    action: "create_canonical_subject_and_link",
    reason: "test",
  },
];

function disposableBinding(ref = "abraxas_sovereign_disposable"): ReconciliationDatabaseBinding {
  return {
    ok: true,
    bindingMode: "disposable_local_test",
    derivedProjectRef: ref,
    postgrestProjectRef: null,
    configuredCrossCheckRef: null,
  };
}

function productionBinding(): ReconciliationDatabaseBinding {
  return {
    ok: true,
    bindingMode: "supabase_dual_identity",
    derivedProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    postgrestProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    configuredCrossCheckRef: PRODUCTION_SUPABASE_PROJECT_REF,
  };
}

describe("Build #580 reconciliation execution authorization", () => {
  it("rejects batches containing blocked plan actions", () => {
    const mixed: ReconciliationPlanRow[] = [
      ...rows,
      {
        anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "forged" },
        action: "block_ambiguous",
        reason: "blocked",
      },
    ];
    const integrity = validateReconciliationExecutionBatch(mixed);
    expect(integrity.ok).toBe(false);
    if (integrity.ok) return;
    expect(integrity.code).toBe("unsupported_batch_row");
  });

  it("allows dry run with connection-derived database binding only", () => {
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "dry_run",
      rows,
      databaseBinding: disposableBinding(),
    });
    expect(auth.ok).toBe(true);
  });

  it("rejects execute without registered digest and operator id", () => {
    const digest = computeReconciliationBatchDigest(rows);
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "execute",
      rows,
      databaseBinding: disposableBinding(),
      credentials: {
        batchDigest: digest,
        operatorAuthorizationId: "op-12345678",
        expiresAtMs: Date.now() + 60_000,
      },
      env: {},
    });
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.code).toBe("execution_disabled");
  });

  it("rejects execute when batch digest does not match submitted rows", () => {
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "execute",
      rows,
      databaseBinding: disposableBinding(),
      credentials: {
        batchDigest: "deadbeef",
        operatorAuthorizationId: "op-12345678",
        expiresAtMs: Date.now() + 60_000,
      },
      env: {
        ABRAXAS_RECONCILIATION_EXECUTION_ENABLED: "true",
        ABRAXAS_OPERATOR_RECONCILIATION_AUTH_ID: "op-12345678",
        ABRAXAS_RECONCILIATION_BATCH_DIGEST: "deadbeef",
      },
    });
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.code).toBe("batch_digest_mismatch");
  });

  it("requires founder authorization for Production database ref", () => {
    const digest = computeReconciliationBatchDigest(rows);
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "execute",
      rows,
      databaseBinding: productionBinding(),
      credentials: {
        batchDigest: digest,
        operatorAuthorizationId: "op-12345678",
        expiresAtMs: Date.now() + 60_000,
      },
      env: {
        ABRAXAS_RECONCILIATION_EXECUTION_ENABLED: "true",
        ABRAXAS_OPERATOR_RECONCILIATION_AUTH_ID: "op-12345678",
        ABRAXAS_RECONCILIATION_BATCH_DIGEST: digest,
      },
    });
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.code).toBe("founder_production_execution_not_authorized");
  });

  it("rejects configured project ref that disagrees with derived connection identity", () => {
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "dry_run",
      rows,
      databaseBinding: {
        ok: false,
        code: "configured_ref_overrides_derived_identity",
        detail: "Configured project ref cross-check disagrees with connection-derived identity.",
      },
    });
    expect(auth.ok).toBe(false);
    if (auth.ok) return;
    expect(auth.code).toBe("configured_ref_overrides_derived_identity");
  });
});
