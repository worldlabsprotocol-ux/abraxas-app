// FILE: lib/decisionReceipts/v1_1_0/demoMigrationReadiness.test.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planV11DedicatedBackfillFromRows } from "@/lib/decisionReceipts/v1_1_0/backfillPlan";
import { isReceiptIssuanceAuthorizable } from "@/lib/decisionReceipts/issuanceFinalization";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { verifyRecordSignatureWithRegistry } from "@/lib/decisionReceipts/verificationKeyLifecycle/resolve.server";
import { build546SampleRecord, build546TrustRegistryEnv } from "@/lib/institutionalCertification/build546/fixtures";

describe("Build #849 Demo migration readiness (read-only)", () => {
  it("Demo snapshot backfill dry-run: all v1.0.0 rows rejected (no sidecar v1.1)", () => {
    const rows = JSON.parse(
      readFileSync(join(process.cwd(), "scripts/demo/fixtures/demo-receipt-snapshot.json"), "utf8"),
    ) as Record<string, unknown>[];
    const plan = planV11DedicatedBackfillFromRows(rows);
    expect(plan.eligible).toBe(0);
    expect(plan.already_final).toBe(0);
    expect(plan.conflict).toBe(0);
    expect(plan.reject).toBe(9);
    expect(plan.rows.every(r => r.reasons.includes("not_v11"))).toBe(true);
  });

  it("pending_finalization receipts stay non-authorizable", () => {
    const pending: DecisionReceiptRecord = {
      ...build546SampleRecord(),
      status: "pending_finalization",
      issuance_finalized_at: null,
    };
    expect(isReceiptIssuanceAuthorizable(pending)).toBe(false);
  });

  it("legacy v1.0.0 operational verification unchanged", () => {
    Object.assign(process.env, build546TrustRegistryEnv());
    const v10 = build546SampleRecord();
    expect(verifyRecordSignatureWithRegistry(v10)).toBe(true);
  });
});
