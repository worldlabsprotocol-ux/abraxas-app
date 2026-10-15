// FILE: lib/passport/build580.reconciliationAuthorization.test.ts

import { describe, expect, it } from "vitest";
import {
  computeReconciliationBatchDigest,
  verifyReconciliationExecutionAuthorization,
} from "./holderIdentityReconciliationAuth";
import { LEGACY_KIND_SUI_ADDRESS, type ReconciliationPlanRow } from "./holderIdentityReconciliation";
import { PRODUCTION_SUPABASE_PROJECT_REF } from "./productionMigrationRelease";

const SUI = "0x" + "5".repeat(64);

const rows: ReconciliationPlanRow[] = [
  {
    anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" },
    action: "create_canonical_subject_and_link",
    reason: "test",
  },
];

describe("Build #580 reconciliation execution authorization", () => {
  it("allows dry run with verified database binding only", () => {
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "dry_run",
      rows,
      boundDatabaseProjectRef: "abraxas_sovereign_disposable",
    });
    expect(auth.ok).toBe(true);
  });

  it("rejects execute without registered digest and operator id", () => {
    const digest = computeReconciliationBatchDigest(rows);
    const auth = verifyReconciliationExecutionAuthorization({
      mode: "execute",
      rows,
      boundDatabaseProjectRef: "abraxas_sovereign_disposable",
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
      boundDatabaseProjectRef: "abraxas_sovereign_disposable",
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
      boundDatabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
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
});
