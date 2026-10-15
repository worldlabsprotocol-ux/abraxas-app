// FILE: lib/passport/build580.reconciliationEvidence.adversarial.test.ts

import { describe, expect, it } from "vitest";
import { validatePassportHybridPostgresBinding } from "@/lib/persistence/passportHybridPostgres";
import { computeReconciliationBatchDigest } from "./holderIdentityReconciliationAuth";
import { LEGACY_KIND_SUI_ADDRESS, type ReconciliationPlanRow } from "./holderIdentityReconciliation";

const SUI = "0x" + "a".repeat(64);

describe("Build #580 reconciliation evidence adversarial (static)", () => {
  it("batch digest ignores caller-supplied evidence strings", () => {
    const authoritative: ReconciliationPlanRow[] = [
      {
        anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" },
        action: "create_canonical_subject_and_link",
        reason: "reviewed",
      },
    ];
    const forged: ReconciliationPlanRow[] = [
      {
        anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "operator.forged.evidence.description" },
        action: "create_canonical_subject_and_link",
        reason: "reviewed",
      },
    ];
    expect(computeReconciliationBatchDigest(authoritative)).toBe(computeReconciliationBatchDigest(forged));
  });

  it("mixed approved and blocked rows produce a different digest than approved-only subset", () => {
    const approvedOnly: ReconciliationPlanRow[] = [
      {
        anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "identity_verifications.sui_address" },
        action: "create_canonical_subject_and_link",
        reason: "reviewed",
      },
    ];
    const mixed: ReconciliationPlanRow[] = [
      ...approvedOnly,
      {
        anchor: { kind: LEGACY_KIND_SUI_ADDRESS, key: SUI, evidence: "forged" },
        action: "block_unverified_wallet",
        reason: "blocked",
      },
    ];
    expect(computeReconciliationBatchDigest(approvedOnly)).not.toBe(computeReconciliationBatchDigest(mixed));
  });

  it("rejects hybrid binding when PostgREST and direct Postgres refs disagree", () => {
    const binding = validatePassportHybridPostgresBinding({
      ABRAXAS_PASSPORT_DATABASE_URL: "postgresql://postgres:pw@db.aaa111.supabase.co:5432/postgres",
      NEXT_PUBLIC_SUPABASE_URL: "https://bbb222.supabase.co",
      ABRAXAS_PERSISTENCE_BACKEND: "postgres_direct",
      ABRAXAS_PASSPORT_TRANSACTION_PG: "true",
    });
    expect(binding.ok).toBe(false);
    if (binding.ok) return;
    expect(binding.code).toBe("hybrid_postgrest_direct_project_ref_mismatch");
  });
});
