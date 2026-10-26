// FILE: lib/decisionReceipts/v1_1_0/demoMigrationPreflight.test.ts

import { describe, expect, it } from "vitest";
import { inferMigration151152153State } from "@/lib/decisionReceipts/v1_1_0/demoMigrationPreflight";

describe("demo migration 151/152/153 preflight inference", () => {
  it("detects pre-151 demo-like schema", () => {
    const state = inferMigration151152153State({
      columns: [],
      rpc: [],
      statusConstraints: [{
        conname: "decision_receipts_status_check",
        def: "CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'revoked'::text])))",
      }],
    });
    expect(state.migration_151).toBe("absent");
    expect(state.migration_152).toBe("absent");
    expect(state.migration_153).toBe("absent");
    expect(state.status_allows_pending_finalization).toBe(false);
  });

  it("detects fully applied chain", () => {
    const state = inferMigration151152153State({
      columns: [
        { column_name: "issuance_finalized_at" },
        { column_name: "application_binding_ref" },
        { column_name: "evidence_commitment" },
        { column_name: "evidence_commitment_manifest" },
        { column_name: "v11_issuance_phase" },
      ],
      rpc: [{ proname: "abraxas_finalize_v11_receipt_atomic", args: "p_receipt_id text", security_definer: true }],
      statusConstraints: [{
        conname: "decision_receipts_status_check",
        def: "pending_finalization",
      }],
    });
    expect(state.migration_151).toBe("applied");
    expect(state.migration_152).toBe("applied");
    expect(state.migration_153).toBe("applied");
    expect(state.status_allows_pending_finalization).toBe(true);
  });
});
