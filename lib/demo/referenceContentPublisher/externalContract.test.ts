// FILE: lib/demo/referenceContentPublisher/externalContract.test.ts
// External-developer contract tests for the reference publisher verification path.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { verifyReferencePublisherCallback } from "./verifyCallback";
import {
  resetReferencePublisherStoreForTests,
  saveReferencePublisherDraft,
} from "./sessionStore";
import { SANDBOX_CONTENT_PUBLISHER_PARTNER_ID } from "@/lib/provenance/constants";
import { resolveReferencePublisherConfig } from "./config";

const POLICY_ID = resolveReferencePublisherConfig("http://localhost:3000").policy_id;

function approvedPublicReceipt(overrides: Record<string, unknown> = {}) {
  return {
    receipt_id: "dr_ref_pub",
    schema_version: "1.0.0",
    partner_id: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
    policy_id: POLICY_ID,
    policy_version: 1,
    decision_result: "approved",
    signature_valid: true,
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    production_usable: false,
    decision_context: "sandbox_only",
    currently_valid: true,
    invalidation_reasons: ["production_not_usable:false"],
    artifact_type: "eligibility_decision_receipt",
    evaluated_claim_refs: [
      { claim_type: "creator_attested", status: "active" },
      { claim_type: "ai_assistance_disclosed", status: "active" },
      { claim_type: "source_integrity_verified", status: "active" },
    ],
    ...overrides,
  };
}

function approvedNarrowResult(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: "1.0.0",
    receipt_id: "dr_ref_pub",
    partner_id: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
    policy_id: POLICY_ID,
    decision: "approved",
    result_family: "content_origin_disclosed",
    provenance: {
      creator_attested: true,
      ai_assistance_disclosed: "none_declared",
      source_integrity_verified: true,
      assertion_classes: {
        creator_attested: "attestation",
        ai_assistance_disclosed: "disclosure",
        source_integrity_verified: "integrity",
      },
    },
    ...overrides,
  };
}

function mockFetch(publicBody: unknown, narrowBody: unknown) {
  return vi.fn(async (url: string) => {
    if (url.includes("/narrow-result")) {
      return new Response(JSON.stringify(narrowBody), { status: 200 });
    }
    if (url.includes("/public")) {
      return new Response(JSON.stringify(publicBody), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  }) as typeof fetch;
}

describe("reference publisher external contract", () => {
  beforeEach(() => {
    resetReferencePublisherStoreForTests();
    saveReferencePublisherDraft({
      publish_attempt_id: "pub_ext",
      title: "Title",
      body: "Body",
      content_hash: "a".repeat(64),
      byte_length: 4,
      created_at: new Date().toISOString(),
      state: "awaiting_proof",
    });
  });

  it("canonical verification path does not import privileged internal modules", () => {
    const source = readFileSync(
      resolve(process.cwd(), "lib/demo/referenceContentPublisher/verifyCallback.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/requireSupabaseAdmin|credential_claims|getReceiptById|decisionReceipts\/service/);
  });

  it("retrieves and validates narrow provenance via public PartnerKit APIs only", async () => {
    const fetchFn = mockFetch(approvedPublicReceipt(), approvedNarrowResult());
    const params = new URLSearchParams({
      publish_attempt_id: "pub_ext",
      receipt_id: "dr_ref_pub",
      status: "approved",
      partner_id: SANDBOX_CONTENT_PUBLISHER_PARTNER_ID,
      policy_id: POLICY_ID,
    });

    const result = await verifyReferencePublisherCallback({
      searchParams: params,
      origin: "http://localhost:3000",
      fetchFn,
    });

    expect(result.errors, result.errors.join(",")).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.published).toBe(true);
    expect(result.provenance?.ai_assistance_disclosed).toBe("none_declared");
    expect(fetchFn).toHaveBeenCalled();
    expect(String(fetchFn.mock.calls.map((call) => call[0]))).toContain("/narrow-result");
    expect(String(fetchFn.mock.calls.map((call) => call[0]))).toContain("/public");
  });

  it("exposes only authorized provenance facts in the narrow result", async () => {
    const narrow = approvedNarrowResult();
    const serialized = JSON.stringify(narrow);
    expect(serialized).not.toContain("artifact_id");
    expect(serialized).not.toContain("content_hash");
    expect(serialized).not.toContain("claim_value");
    expect(serialized).not.toContain("evaluated_claim_refs");
  });

  it("rejects wrong partner narrow results", async () => {
    const fetchFn = mockFetch(
      approvedPublicReceipt(),
      approvedNarrowResult({ partner_id: "other-partner" }),
    );
    const result = await verifyReferencePublisherCallback({
      searchParams: new URLSearchParams({
        publish_attempt_id: "pub_ext",
        receipt_id: "dr_ref_pub",
        status: "approved",
      }),
      origin: "http://localhost:3000",
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.published).toBe(false);
  });

  it("rejects wrong policy narrow results", async () => {
    const fetchFn = mockFetch(
      approvedPublicReceipt(),
      approvedNarrowResult({ policy_id: "other-policy-v1" }),
    );
    const result = await verifyReferencePublisherCallback({
      searchParams: new URLSearchParams({
        publish_attempt_id: "pub_ext",
        receipt_id: "dr_ref_pub",
        status: "approved",
      }),
      origin: "http://localhost:3000",
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.published).toBe(false);
  });

  it("rejects expired receipts", async () => {
    const fetchFn = mockFetch(
      approvedPublicReceipt({
        expires_at: "2020-01-01T00:00:00.000Z",
        status: "expired",
      }),
      approvedNarrowResult(),
    );
    const result = await verifyReferencePublisherCallback({
      searchParams: new URLSearchParams({
        publish_attempt_id: "pub_ext",
        receipt_id: "dr_ref_pub",
        status: "approved",
      }),
      origin: "http://localhost:3000",
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.published).toBe(false);
  });

  it("rejects invalid signatures", async () => {
    const fetchFn = mockFetch(
      approvedPublicReceipt({ signature_valid: false }),
      approvedNarrowResult(),
    );
    const result = await verifyReferencePublisherCallback({
      searchParams: new URLSearchParams({
        publish_attempt_id: "pub_ext",
        receipt_id: "dr_ref_pub",
        status: "approved",
      }),
      origin: "http://localhost:3000",
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.published).toBe(false);
  });

  it("does not resume publication when narrow provenance is missing", async () => {
    const fetchFn = mockFetch(
      approvedPublicReceipt(),
      approvedNarrowResult({ provenance: undefined, decision: "denied" }),
    );
    const result = await verifyReferencePublisherCallback({
      searchParams: new URLSearchParams({
        publish_attempt_id: "pub_ext",
        receipt_id: "dr_ref_pub",
        status: "approved",
      }),
      origin: "http://localhost:3000",
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.published).toBe(false);
  });

  it("does not trust forged callback params without verified receipt", async () => {
    const fetchFn = mockFetch(
      approvedPublicReceipt({ decision_result: "denied" }),
      approvedNarrowResult({ decision: "denied", provenance: undefined }),
    );
    const result = await verifyReferencePublisherCallback({
      searchParams: new URLSearchParams({
        publish_attempt_id: "pub_ext",
        receipt_id: "dr_ref_pub",
        status: "approved",
        decision: "approved",
      }),
      origin: "http://localhost:3000",
      fetchFn,
    });
    expect(result.ok).toBe(false);
    expect(result.published).toBe(false);
  });
});
