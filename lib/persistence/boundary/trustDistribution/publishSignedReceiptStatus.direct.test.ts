import { describe, expect, it, vi } from "vitest";

vi.mock("@abraxas/independent-verifier", () => ({
  RECEIPT_STATUS_STATEMENT_DOCUMENT: "status", RECEIPT_STATUS_STATEMENT_SCHEMA_VERSION: "1",
  signReceiptStatusStatementForTests: ({ payload }: { payload: Record<string, unknown> }) => ({ payload }),
}));
vi.mock("./statusVersionCheckpoint", () => ({ nextSignedStatusVersion: async () => 2 }));
vi.mock("@/lib/decisionReceipts/views", () => ({ resolveReceiptStatus: () => "active" }));

import { publishSignedReceiptStatusFromSovereignEvaluation } from "./publishSignedReceiptStatus";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import type { SovereignCurrentValidityResult } from "../sovereignCurrentValidity/evaluate";

const record = { id: "dr_withdrawn", partner_id: "partner-a", policy_id: "policy-a",
  policy_version: 2, decision_context: "sandbox_only" } as DecisionReceiptRecord;
const evaluation = { store_available: true, checked_at: new Date().toISOString(),
  lifecycle_status: "revoked", invalidation_reasons: ["receipt_revoked"],
  superseded: false, claims_current: false, evidence_current: false,
} as SovereignCurrentValidityResult;
const env = { ABRAXAS_STATUS_SIGNER_PRIVATE_JWK: JSON.stringify({ kty: "OKP" }) };

describe("signed status after sovereign withdrawal", () => {
  it("publishes revoked status even when the exported receipt row was previously active", async () => {
    const result = await publishSignedReceiptStatusFromSovereignEvaluation({
      record, evaluation, signedIssuerAuthorityEnvironment: "demo", env,
    });
    expect(result).toHaveProperty("payload.receipt_status", "revoked");
  });

  it("does not sign a misleading active statement when validity is indeterminate", async () => {
    const result = await publishSignedReceiptStatusFromSovereignEvaluation({
      record, evaluation: { ...evaluation, lifecycle_status: "invalidated" },
      signedIssuerAuthorityEnvironment: "demo", env,
    });
    expect(result).toEqual({ ok: false, reason: "authoritative_validity_indeterminate" });
  });
});
