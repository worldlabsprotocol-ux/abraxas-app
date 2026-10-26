// FILE: lib/decisionReceipts/issuanceSchemaCompatibility.test.ts

import { describe, expect, it, beforeEach } from "vitest";
import { mapReceiptRow } from "@/lib/decisionReceipts/mapReceiptRow";
import {
  isReceiptIssuanceAuthorizable,
} from "@/lib/decisionReceipts/issuanceFinalization";
import { parseIssuanceFinalizationSchemaFromEnv } from "@/lib/decisionReceipts/issuanceSchemaCapability";
import { resetIssuanceFinalizationSchemaCapabilityCache } from "@/lib/decisionReceipts/issuanceSchemaCapability.server";

describe("mapReceiptRow legacy vs migrated schema", () => {
  it("preserves undefined when issuance_finalized_at column is absent", () => {
    const row = {
      id: "dr_1",
      verification_decision_id: "d1",
      consent_receipt_id: null,
      partner_id: "p",
      policy_id: "pol",
      policy_version: 1,
      subject_pseudonym_id: "sub",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      status: "active",
      schema_version: "1.0.0",
      payload_hash: "h",
      signature: "s",
      signing_key_id: "k",
      anchor_reference: null,
      idempotency_key: null,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const mapped = mapReceiptRow(row);
    expect(mapped.issuance_finalized_at).toBeUndefined();
    expect(isReceiptIssuanceAuthorizable(mapped)).toBe(true);
  });

  it("maps explicit null as incomplete staged receipt", () => {
    const mapped = mapReceiptRow({
      id: "dr_2",
      verification_decision_id: "d2",
      consent_receipt_id: null,
      partner_id: "p",
      policy_id: "pol",
      policy_version: 1,
      subject_pseudonym_id: "sub",
      wallet_binding_ref: null,
      decision_result: "approved",
      reason_codes: [],
      evaluated_claim_refs: [],
      issuer_refs: [],
      decision_context: "production",
      evaluated_at: "2026-01-01T00:00:00.000Z",
      expires_at: null,
      revoked_at: null,
      status: "active",
      issuance_finalized_at: null,
      schema_version: "1.0.0",
      payload_hash: "h",
      signature: "s",
      signing_key_id: "k",
      anchor_reference: null,
      idempotency_key: null,
      created_at: "2026-01-01T00:00:00.000Z",
    });
    expect(isReceiptIssuanceAuthorizable(mapped)).toBe(false);
  });
});

describe("issuance schema capability env gate", () => {
  beforeEach(() => {
    resetIssuanceFinalizationSchemaCapabilityCache();
  });

  it("forces legacy mode without staged issuance", () => {
    expect(parseIssuanceFinalizationSchemaFromEnv({ DECISION_RECEIPT_ISSUANCE_FINALIZATION_SCHEMA: "legacy" }))
      .toEqual({ mode: "legacy", stagedIssuanceEnabled: false });
  });

  it("enables staged issuance when migration 151 is declared", () => {
    expect(parseIssuanceFinalizationSchemaFromEnv({ DECISION_RECEIPT_ISSUANCE_FINALIZATION_SCHEMA: "v151" }))
      .toEqual({ mode: "v151", stagedIssuanceEnabled: true });
  });
});

