// FILE: lib/custody/custody.test.ts

import { describe, expect, it } from "vitest";
import { assertNoPiiInPublicView, toPublicView } from "@/lib/decisionReceipts/views";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildPartnerWebhookPayload } from "@/lib/partner/webhooks/webhookPayloadContract";
import { provenanceReceiptIsPublicSafe } from "@/lib/provenance/publicReceipt";
import { GOOD_TROUBLE_L0_SEMANTICS } from "./goodTroubleCustody";
import { PROVENANCE_FORBIDDEN_RETENTION } from "./provenanceCustody";
import {
  assertCustodySafePayload,
  assertPersistAllowed,
  detectRawEvidenceMarkers,
  isChainEligibleStorageClass,
} from "./guardrails";
import {
  noopChainCommitmentAdapter,
  validateChainCommitmentInput,
} from "./chainCommitmentAdapter";
import {
  TOKEN2022_DECISION,
  TOKEN2022_IMPLEMENTATION_STATUS,
  token2022RequiredForVerification,
} from "./token2022Evaluation";
import { DATA_CUSTODY_MAP, custodyEntryById } from "./dataCustodyMap";
import { STORAGE_CLASS_RULES } from "./storageClassification";
import { RECOVERY_NON_GOALS } from "./recoveryModel";
import { LEGAL_CLAIMS_NOT_MADE } from "./privacyThreatModel";
import { CUSTODY_PRINCIPLE } from "./index";

const RAW_EVIDENCE_SAMPLE = {
  date_of_birth: "1995-12-01",
  legal_name: "Jane Doe",
  document_image: "base64...",
  selfie: "raw-bytes",
  claim_value: { outcome: "over_21" },
};

const SAFE_CHAIN_INPUT = {
  subjectBindingHash: "a".repeat(64),
  policyHash: "b".repeat(64),
  partnerHash: "c".repeat(64),
  resultCategoryHash: "d".repeat(64),
  receiptPayloadHash: "e".repeat(64),
};

function receiptRecord(): DecisionReceiptRecord {
  return {
    id: "dr_custody_ok",
    schema_version: "1.0.0",
    verification_decision_id: "dec-1",
    consent_receipt_id: null,
    policy_id: "good-trouble-age_21_retail-v1",
    policy_version: 1,
    partner_id: "good-trouble",
    subject_pseudonym_id: "pseudo_gt",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["eligible"],
    evaluated_claim_refs: [{
      claim_id: "cl_1",
      claim_type: "self_attested_age_band",
      issuer_id: "abraxas",
      status: "active",
      issued_at: "2026-01-01T00:00:00.000Z",
      expires_at: "2026-01-02T00:00:00.000Z",
    }],
    issuer_refs: ["abraxas"],
    decision_context: "production",
    evaluated_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-01-02T00:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: "k1",
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("custody architecture foundation", () => {
  it("defines storage classes with explicit minimization rules", () => {
    expect(Object.keys(STORAGE_CLASS_RULES)).toHaveLength(8);
    expect(STORAGE_CLASS_RULES.raw_evidence.partnerDisclosure).toBe("never");
    expect(STORAGE_CLASS_RULES.raw_evidence.chainEligible).toBe(false);
    expect(STORAGE_CLASS_RULES.commitment.chainEligible).toBe(true);
    expect(STORAGE_CLASS_RULES.receipt.publicReceiptEligible).toBe(true);
    expect(CUSTODY_PRINCIPLE).toMatch(/without unnecessarily possessing/i);
  });

  it("maps sensitive data flows with audit classifications", () => {
    expect(DATA_CUSTODY_MAP.length).toBeGreaterThanOrEqual(10);
    const dob = custodyEntryById("dob_l0_transient");
    expect(dob?.storageClass).toBe("raw_evidence");
    expect(dob?.rawNecessary).toBe(true);
    const ledger = custodyEntryById("self_attestation_ledger");
    expect(ledger?.storageClass).toBe("derived_fact");
    expect(ledger?.rawNecessary).toBe(false);
    const artifact = custodyEntryById("content_artifact_hash");
    expect(artifact?.storageClass).toBe("commitment");
  });
});

describe("custody guardrails", () => {
  it("blocks raw evidence from public receipts", () => {
    const result = assertCustodySafePayload(RAW_EVIDENCE_SAMPLE, "public_receipt");
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.code === "raw_evidence_marker")).toBe(true);
  });

  it("blocks raw evidence from partner webhooks", () => {
    const result = assertCustodySafePayload(RAW_EVIDENCE_SAMPLE, "partner_webhook");
    expect(result.ok).toBe(false);
  });

  it("blocks sensitive evidence from chain commitments", () => {
    const bad = {
      ...SAFE_CHAIN_INPUT,
      subjectBindingHash: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig",
    };
    const result = assertCustodySafePayload(bad, "chain_commitment");
    expect(result.ok).toBe(false);
  });

  it("allows hash-only chain commitments", () => {
    expect(validateChainCommitmentInput(SAFE_CHAIN_INPUT)).toEqual({ ok: true });
    const record = noopChainCommitmentAdapter.buildCommitment(SAFE_CHAIN_INPUT);
    expect(noopChainCommitmentAdapter.validateCommitment(record)).toEqual({ ok: true });
    expect(isChainEligibleStorageClass("commitment")).toBe(true);
    expect(isChainEligibleStorageClass("raw_evidence")).toBe(false);
  });

  it("prohibits persisting raw evidence on partner surfaces", () => {
    expect(assertPersistAllowed("raw_evidence", "partner_webhook").ok).toBe(false);
    expect(assertPersistAllowed("derived_fact", "database_persist").ok).toBe(true);
  });

  it("detects raw evidence field markers recursively", () => {
    const hits = detectRawEvidenceMarkers({ nested: { date_of_birth: "1990-01-01" } });
    expect(hits.some((h) => h.includes("date_of_birth"))).toBe(true);
  });
});

describe("partner surfaces remain narrow", () => {
  it("public receipt passes custody guardrails and schema version", () => {
    const view = toPublicView(receiptRecord());
    expect(view.schema_version).toBe("1.0.0");
    expect(() => assertNoPiiInPublicView(view)).not.toThrow();
    expect(view.evaluated_claim_refs.every((ref) => !("claim_value" in (ref as object)))).toBe(true);
  });

  it("webhook payload excludes PII and passes custody guardrails", () => {
    const payload = buildPartnerWebhookPayload({
      eventId: "evt_1",
      eventType: "decision.receipt.issued",
      occurredAt: "2026-01-01T00:00:00.000Z",
      partnerId: "good-trouble",
      policyId: "good-trouble-age_21_retail-v1",
      receiptId: "dr_1",
      outcome: "approved",
    });
    expect(payload.must_reverify).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(/date_of_birth|legal_name|sui_address/);
    expect(assertCustodySafePayload(payload, "partner_webhook").ok).toBe(true);
  });

  it("does not expose wallet address in webhook by default", () => {
    const payload = buildPartnerWebhookPayload({
      eventId: "evt_2",
      eventType: "decision.receipt.issued",
      occurredAt: "2026-01-01T00:00:00.000Z",
      partnerId: "good-trouble",
      outcome: "approved",
    });
    expect(Object.keys(payload)).not.toContain("wallet_address");
    expect(Object.keys(payload)).not.toContain("sui_address");
  });
});

describe("derived facts without raw evidence", () => {
  it("Good Trouble L0 retains age band not DOB", () => {
    expect(GOOD_TROUBLE_L0_SEMANTICS.isGovernmentIdProof).toBe(false);
    expect(GOOD_TROUBLE_L0_SEMANTICS.partnerDoesNotReceive).toContain("DOB");
    const ledger = custodyEntryById("self_attestation_ledger");
    expect(ledger?.currentStorage).toMatch(/age_band/);
    expect(ledger?.retention).toMatch(/24h|TTL/i);
  });

  it("provenance forbids raw artifact retention in public surfaces", () => {
    expect(PROVENANCE_FORBIDDEN_RETENTION).toContain("Raw media bytes in database");
    const safeView = toPublicView({
      ...receiptRecord(),
      policy_id: "content_source_integrity-v1",
    });
    expect(provenanceReceiptIsPublicSafe(safeView)).toBe(true);
  });
});

describe("optional chain and Token-2022", () => {
  it("core evaluation works without blockchain", () => {
    const record = noopChainCommitmentAdapter.buildCommitment(SAFE_CHAIN_INPUT);
    expect(record.optional).toBe(true);
    expect(record.anchorReference).toBeNull();
  });

  it("Token-2022 is not required or implemented", () => {
    expect(TOKEN2022_IMPLEMENTATION_STATUS).toBe("not_implemented");
    expect(TOKEN2022_DECISION.implemented).toBe(false);
    expect(TOKEN2022_DECISION.mandatory).toBe(false);
    expect(token2022RequiredForVerification()).toBe(false);
  });
});

describe("recovery and legal boundaries", () => {
  it("rejects browser-only storage as credential authority", () => {
    expect(RECOVERY_NON_GOALS.some((g) => /browser-only/i.test(g))).toBe(true);
  });

  it("does not make unsupported legal claims", () => {
    expect(LEGAL_CLAIMS_NOT_MADE.some((c) => /not legal advice/i.test(c))).toBe(true);
    expect(LEGAL_CLAIMS_NOT_MADE.some((c) => /does not eliminate/i.test(c))).toBe(true);
  });
});
