// FILE: lib/institutionalVerification/build586.adversarial.test.ts

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  BUILD_546_FIXTURE_NOW,
  BUILD_546_PARTNER_ID,
  BUILD_546_POLICY_ID,
  BUILD_546_PRIMARY_KEY,
  BUILD_546_RETIRED_KEY,
  BUILD_546_UNKNOWN_KEY,
  build546SampleRecord,
  build546TrustRegistryEnv,
} from "@/lib/institutionalCertification/build546/fixtures";
import { composeHolderPolicyScopedPresentation } from "@/lib/protocol/proofFirst/holderPolicyPresentation";
import {
  activePortableRevocationSnapshotForReceipt,
  createProofFirstPortableRevocationTestContext,
} from "@/lib/protocol/proofFirst/proofFirstTestRevocation";
import {
  build546PortableRevocationIssuerTrust,
  buildSyntheticPortableRevocationSnapshot,
} from "@/lib/protocol/portableRevocation";
import {
  FileReceiptConsumptionStore,
  InMemoryReceiptConsumptionStore,
} from "@/lib/institutionalCertification/build547/receiptConsumptionStore";
import { InMemoryPortableRevocationCheckpointStore } from "@/lib/protocol/portableRevocation";
import {
  verifySignedDecisionReceipt,
  inspectSignedDecisionReceipt,
  verifyHolderTrustPresentation,
  verifyCrossApplicationPresentation,
  digestReceiptVerificationKeyDocument,
  validateFetchedReceiptKeyDocument,
} from "@/lib/institutionalVerification";
import { buildReceiptVerificationKeyDocument } from "@/lib/decisionReceipts/verificationKeyLifecycle";
import { buildInstitutionalVerificationContractDocument } from "@/lib/institutionalVerification/verificationContractDocument";

const TEST_MEMORY = { allow_in_memory_consumption_for_tests: true as const };

describe("Build #586 institutional verification SDK", () => {
  let env: Record<string, string>;
  let portableCtx: ReturnType<typeof createProofFirstPortableRevocationTestContext>;

  beforeEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
    env = build546TrustRegistryEnv();
    Object.assign(process.env, env);
    portableCtx = createProofFirstPortableRevocationTestContext();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("ABRAXAS_") || key.includes("RECEIPT")) delete process.env[key];
    }
  });

  function presentationForRecord(record = build546SampleRecord()) {
    return composeHolderPolicyScopedPresentation({
      signedRecord: record,
      audiencePartnerId: record.partner_id,
    });
  }

  function authorizeInput(record = build546SampleRecord()) {
    return {
      signed_record: record,
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      request_id: "req_586",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      revocation_source: { available: true, status: "active" } as const,
      consumption_store: new InMemoryReceiptConsumptionStore(),
      ...TEST_MEMORY,
    };
  }

  it("valid signed receipt — independently authorized", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(),
      request_id: "req_586_valid",
    });
    expect(result.authorize).toBe(true);
    expect(result.verdict).toBe("valid");
    expect(result.verification_intent).toBe("authorize");
  });

  it("non-contract revocation feed status stale — blocked on authorize", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(),
      request_id: "req_586_stale_hint",
      revocation_source: { available: true, status: "stale" } as { available: true; status: "active" },
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons).toContain("revocation_unavailable");
  });

  it("authorize without consumption store — durable_store_required", async () => {
    const result = await verifySignedDecisionReceipt({
      signed_record: build546SampleRecord(),
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      request_id: "req_586_no_store",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      revocation_source: { available: true, status: "active" },
    });
    expect(result.authorize).toBe(false);
    expect(result.verdict).toBe("blocked");
    expect(result.rejection_reasons).toContain("durable_store_required");
  });

  it("inspect_only never authorizes even when cryptography passes", async () => {
    const result = await inspectSignedDecisionReceipt({
      signed_record: build546SampleRecord(),
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      request_id: "req_586_inspect",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      revocation_source: { available: true, status: "active" },
    });
    expect(result.authorize).toBe(false);
    expect(result.verification_intent).toBe("inspect_only");
    expect(result.underlying.cryptographically_authentic).toBe(true);
  });

  it("invalid signature — explicit rejection", async () => {
    const record = build546SampleRecord();
    const tampered = { ...record, signature: "AA".repeat(44) };
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(tampered),
      request_id: "req_586_sig",
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons).toContain("signature_invalid");
  });

  it("untrusted issuer key — reject", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(build546SampleRecord(BUILD_546_UNKNOWN_KEY)),
      request_id: "req_586_issuer",
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons).toContain("issuer_untrusted");
  });

  it("retired signing key — reject", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(build546SampleRecord(BUILD_546_RETIRED_KEY)),
      request_id: "req_586_retired",
    });
    expect(result.authorize).toBe(false);
  });

  it("wrong tenant policy — reject", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(build546SampleRecord(BUILD_546_PRIMARY_KEY, { policy_id: "wrong-policy" })),
      request_id: "req_586_policy",
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons).toContain("tenant_policy_mismatch");
  });

  it("expired receipt — reject", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(
        build546SampleRecord(BUILD_546_PRIMARY_KEY, { expires_at: "2020-01-01T00:00:00.000Z" }),
      ),
      request_id: "req_586_expired",
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons).toContain("expired");
  });

  it("revoked credential feed — reject", async () => {
    const result = await verifySignedDecisionReceipt({
      ...authorizeInput(),
      request_id: "req_586_revoked",
      revocation_source: { available: true, status: "revoked" },
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons).toContain("revoked");
  });

  it("replay attempt — second consumption denied (durable filesystem store)", async () => {
    const record = build546SampleRecord();
    const dir = mkdtempSync(join(tmpdir(), "abx-586-replay-"));
    const store = new FileReceiptConsumptionStore(dir);
    const input = {
      signed_record: record,
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      request_id: "req_586_replay",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      revocation_source: { available: true, status: "active" } as const,
      consumption_store: store,
    };
    const first = await verifySignedDecisionReceipt(input);
    expect(first.authorize).toBe(true);
    const second = await verifySignedDecisionReceipt({ ...input, request_id: "req_586_replay_2" });
    expect(second.authorize).toBe(false);
    expect(second.rejection_reasons).toContain("replay_detected");
  });

  it("concurrent consumption — only one authorize", async () => {
    const record = build546SampleRecord();
    const dir = mkdtempSync(join(tmpdir(), "abx-586-concurrent-"));
    const store = new FileReceiptConsumptionStore(dir);
    const base = {
      signed_record: record,
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      revocation_source: { available: true, status: "active" } as const,
      consumption_store: store,
    };
    const [a, b] = await Promise.all([
      verifySignedDecisionReceipt({ ...base, request_id: "req_con_a" }),
      verifySignedDecisionReceipt({ ...base, request_id: "req_con_b" }),
    ]);
    const authorized = [a, b].filter((r) => r.authorize);
    expect(authorized.length).toBe(1);
  });

  it("holder presentation with portable revocation — valid", async () => {
    const presentation = presentationForRecord();
    const snapshot = activePortableRevocationSnapshotForReceipt(presentation.signed_decision_receipt.id);
    portableCtx.registerBootstrapForSnapshot(snapshot);
    const result = await verifyHolderTrustPresentation({
      presentation,
      portable_revocation_snapshot: snapshot,
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      request_id: "req_586_pres",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      portable_revocation_issuer_trust: build546PortableRevocationIssuerTrust(),
      portable_revocation_bootstrap_trusts: portableCtx.bootstrapTrusts,
      checkpoint_store: new InMemoryPortableRevocationCheckpointStore(),
      consumption_store: new InMemoryReceiptConsumptionStore(),
      ...TEST_MEMORY,
    });
    expect(result.authorize).toBe(true);
    expect(result.portable_revocation_authenticated).toBe(true);
  });

  it("stale portable revocation snapshot — reject", async () => {
    const presentation = presentationForRecord();
    const receiptId = presentation.signed_decision_receipt.id;
    const fresh = activePortableRevocationSnapshotForReceipt(receiptId);
    const stale = buildSyntheticPortableRevocationSnapshot({
      receiptId,
      sequence: Math.max(0, (fresh.payload.snapshot_sequence ?? 1) - 1),
    });
    portableCtx.registerBootstrapForSnapshot(fresh);
    const result = await verifyHolderTrustPresentation({
      presentation,
      portable_revocation_snapshot: stale,
      relying_party: { partner_id: BUILD_546_PARTNER_ID, policy_id: BUILD_546_POLICY_ID },
      request_id: "req_586_stale",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      portable_revocation_issuer_trust: build546PortableRevocationIssuerTrust(),
      portable_revocation_bootstrap_trusts: portableCtx.bootstrapTrusts,
      checkpoint_store: new InMemoryPortableRevocationCheckpointStore(),
      consumption_store: new InMemoryReceiptConsumptionStore(),
      ...TEST_MEMORY,
    });
    expect(result.authorize).toBe(false);
    expect(result.rejection_reasons.some((r) => r === "revocation_stale")).toBe(true);
  });

  it("cross-application — authorized scope grants, other scope denies", async () => {
    const record = build546SampleRecord(BUILD_546_PRIMARY_KEY, {
      partner_id: "tenant-a",
      policy_id: "tenant-a-policy",
    });
    const presentation = presentationForRecord(record);
    const snapshot = activePortableRevocationSnapshotForReceipt(record.id);
    portableCtx.registerBootstrapForSnapshot(snapshot);
    const result = await verifyCrossApplicationPresentation({
      presentation,
      portable_revocation_snapshot: snapshot,
      authorized_scope: { partner_id: "tenant-a", policy_id: "tenant-a-policy" },
      unauthorized_scope: { partner_id: "tenant-b", policy_id: "tenant-b-policy" },
      request_id_prefix: "req_586_xapp",
      now: BUILD_546_FIXTURE_NOW,
      trust_env: env,
      portable_revocation_issuer_trust: build546PortableRevocationIssuerTrust(),
      portable_revocation_bootstrap_trusts: portableCtx.bootstrapTrusts,
      checkpoint_store: new InMemoryPortableRevocationCheckpointStore(),
      consumption_store: new InMemoryReceiptConsumptionStore(),
      ...TEST_MEMORY,
    });
    expect(result.authorized_application.authorize).toBe(true);
    expect(result.other_application.authorize).toBe(false);
    expect(result.isolation_preserved).toBe(true);
  });

  it("trust contract document includes digest of receipt key material", () => {
    const receiptDoc = buildReceiptVerificationKeyDocument(env);
    if ("ok" in receiptDoc) throw new Error("expected receipt doc");
    const contract = buildInstitutionalVerificationContractDocument(env);
    if ("ok" in contract) throw new Error("expected contract");
    expect(contract.trust_material.receipt_key_document_digest).toBe(
      digestReceiptVerificationKeyDocument(receiptDoc),
    );
    expect(validateFetchedReceiptKeyDocument(receiptDoc)).not.toBeNull();
  });

  it("malformed trust document — rejected", () => {
    expect(validateFetchedReceiptKeyDocument({ document: "wrong" })).toBeNull();
    expect(validateFetchedReceiptKeyDocument({ keys: [{ d: "secret" }] })).toBeNull();
  });
});
