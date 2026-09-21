import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { AbraxasPartnerKit } from "@/lib/partner/integrationKit/client";
import { POLICY_FIT_CATEGORIES } from "@/lib/partner/integrationStudio/policyFit/contract";
import { POLICY_FIT_CATEGORY_TO_PACK } from "@/lib/partner/integrationStudio/policyFit/contract";
import { sanitizeProposalPayload } from "@/lib/partner/policyProposal/sanitize";
import { deriveReleaseShape } from "@/lib/partner/policyReleaseCandidate/sanitize";
import { POLICY_RC_RESULTS } from "@/lib/partner/policyReleaseCandidate/contract";
import {
  ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
  ELIGIBILITY_PRESENTATION_VERSION,
  audienceHash,
  completePresentationHolderResultForTests,
  createPresentationRequest,
  eligibilityWellKnownDocument,
  eligibilityPresentationSchemaDocument,
  forceEligibilityStoreUnavailableForTests,
  issueEligibilityPresentation,
  presentationLeaks,
  putSourceReceiptForTests,
  resetEligibilityPresentationsForTests,
  resetSourceReceiptsForTests,
  revokePresentationsForReceipt,
  verifyEligibilityPresentation,
} from "@/lib/eligibilityPresentation";
import { ELIGIBILITY_PLANNING_CATEGORIES, isEligibilityPlanningCategory } from "@/lib/eligibilityPresentation/planning";
import { GET as wellKnownGet } from "@/app/.well-known/abraxas-eligibility/route";
import { GET as schemaGet } from "@/app/api/v1/eligibility-presentations/schema/route";
import { POST as requestPost } from "@/app/api/v1/eligibility-presentations/requests/route";
import { POST as issuePost } from "@/app/api/v1/eligibility-presentations/issue/route";

const KEY = generateTestSigningKeyPair();
process.env.ABRAXAS_SIGNING_KEY_ID = KEY.signingKeyId;
process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(KEY.publicKeyJwk);
process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
process.env.VITEST = "1";

const authenticatePartnerMock = vi.fn();
vi.mock("@/lib/partner/partnerAuth", () => ({
  authenticatePartner: (...args: unknown[]) => authenticatePartnerMock(...args),
}));

function receipt(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  return {
    id: "dr_ep_1",
    schema_version: "1.0.0",
    verification_decision_id: "dec-ep-1",
    consent_receipt_id: "cr_ep_1",
    policy_id: "acme-age_21_retail-v1",
    policy_version: 1,
    partner_id: "acme",
    subject_pseudonym_id: "ps_ep",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["eligible"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-09-21T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: KEY.signingKeyId,
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-09-21T00:00:00.000Z",
    ...overrides,
  };
}

const requestBody = {
  policy_id: "acme-age_21_retail-v1",
  policy_version: 1,
  purpose: "Confirm adult retail eligibility",
  action: "retail_access",
  action_scope: "sandbox:protocol_access",
  environment: "sandbox" as const,
  result_category: "age_21",
  verifier_nonce: "nonce-one-time-alpha",
};

async function completeHolder(requestRef: string, overrides: Partial<DecisionReceiptRecord> = {}) {
  const record = receipt(overrides);
  putSourceReceiptForTests(record);
  await completePresentationHolderResultForTests({ requestRef, receipt: record, partnerId: "acme" });
  return record;
}

describe("eligibility presentation protocol", () => {
  beforeEach(() => {
    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    authenticatePartnerMock.mockReset();
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: { partnerId: "acme" } });
  });

  afterEach(() => {
    forceEligibilityStoreUnavailableForTests(false);
  });

  it("publishes a versioned envelope schema and well-known document", async () => {
    const schema = eligibilityPresentationSchemaDocument();
    expect(schema.media_type).toBe(ELIGIBILITY_PRESENTATION_MEDIA_TYPE);
    expect(schema.schema_version).toBe(ELIGIBILITY_PRESENTATION_VERSION);
    expect(schema.canonical_serialization).toMatch(/sorted object keys/);
    const known = eligibilityWellKnownDocument();
    expect(known.signing_keys).toBe("/api/receipts/verification-keys");
    expect(known.receipt_verification).toBe("/api/receipts/{id}/public");
    expect(known.presentation_sufficient_alone).toBe(false);
    expect(known.bearer_credential).toBe(false);
    expect(known.parallel_signing_trust).toBe(false);
    expect(known.planning.utila_integration ?? known.planning.categories[0].utila_integration).toBe(false);
    const wellKnown = await wellKnownGet();
    expect(wellKnown.status).toBe(200);
    const schemaRes = await schemaGet();
    expect(schemaRes.status).toBe(200);
    expect(presentationLeaks(await wellKnown.json())).toEqual([]);
  });

  it("binds audience, nonce, policy, version, action, and environment", async () => {
    const created = await createPresentationRequest({ ...requestBody, partnerId: "acme" });
    await completeHolder(created.request_ref);
    const envelope = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: requestBody.verifier_nonce,
    });
    expect(envelope.payload.audience_hash).toBe(audienceHash("acme"));
    expect(envelope.payload.issuer).toBe("abraxas");
    expect(presentationLeaks(envelope)).toEqual([]);

    const expected = {
      audience_hash: audienceHash("acme"),
      verifier_nonce: requestBody.verifier_nonce,
      policy_id: requestBody.policy_id,
      policy_version: 1,
      action: "retail_access",
      environment: "sandbox" as const,
    };
    const fetchOk = async () => ({
      receipt_id: "dr_ep_1",
      currently_valid: true,
      decision_result: "approved",
      status: "active",
      policy_id: requestBody.policy_id,
    });
    expect((await verifyEligibilityPresentation({
      envelope,
      expected: { ...expected, audience_hash: audienceHash("other") },
      fetchReceipt: fetchOk,
    })).reason).toBe("audience_mismatch");

    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    const created2 = await createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-one-time-beta" });
    await completeHolder(created2.request_ref);
    const envelope2 = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created2.request_ref,
      verifier_nonce: "nonce-one-time-beta",
    });
    expect((await verifyEligibilityPresentation({
      envelope: envelope2,
      expected: { ...expected, verifier_nonce: "nonce-one-time-beta", action: "membership_access" },
      fetchReceipt: fetchOk,
    })).reason).toBe("action_mismatch");
  });

  it("requires fresh consent and denies cross-partner issuance", async () => {
    const created = await createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-consent" });
    await expect(completeHolder(created.request_ref, { consent_receipt_id: null }))
      .rejects.toMatchObject({ code: "consent_required" });
    await expect(issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-consent",
    })).rejects.toMatchObject({ code: "no_completed_result" });

    await expect(completeHolder(created.request_ref, { partner_id: "other" }))
      .rejects.toMatchObject({ code: "cross_partner" });
  });

  it("consumes the verifier nonce once and fails replay, expiry, revocation, and withdrawal", async () => {
    const created = await createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-replay" });
    await completeHolder(created.request_ref);
    const envelope = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-replay",
    });
    const expected = {
      audience_hash: audienceHash("acme"),
      verifier_nonce: "nonce-replay",
      policy_id: requestBody.policy_id,
      policy_version: 1,
      action: "retail_access",
      environment: "sandbox" as const,
    };
    const first = await verifyEligibilityPresentation({
      envelope,
      expected,
      fetchReceipt: async () => ({
        receipt_id: "dr_ep_1",
        currently_valid: true,
        decision_result: "approved",
        status: "active",
        policy_id: requestBody.policy_id,
      }),
    });
    expect(first.ok).toBe(true);
    expect(first.presentation_sufficient).toBe(false);
    const replay = await verifyEligibilityPresentation({
      envelope,
      expected,
      fetchReceipt: async () => ({
        receipt_id: "dr_ep_1",
        currently_valid: true,
        decision_result: "approved",
        status: "active",
      }),
    });
    expect(replay.ok).toBe(false);
    expect(replay.reason).toBe("replayed");

    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    const created2 = await createPresentationRequest({
      ...requestBody,
      partnerId: "acme",
      verifier_nonce: "nonce-revoke",
    });
    await completeHolder(created2.request_ref);
    const envelope2 = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created2.request_ref,
      verifier_nonce: "nonce-revoke",
    });
    await revokePresentationsForReceipt("dr_ep_1");
    const revoked = await verifyEligibilityPresentation({
      envelope: envelope2,
      expected: { ...expected, verifier_nonce: "nonce-revoke" },
      fetchReceipt: async () => ({
        receipt_id: "dr_ep_1",
        currently_valid: false,
        revoked: true,
        status: "revoked",
      }),
    });
    expect(revoked.reason).toBe("revoked");

    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    const created3 = await createPresentationRequest({
      ...requestBody,
      partnerId: "acme",
      verifier_nonce: "nonce-withdraw",
    });
    await completeHolder(created3.request_ref);
    const envelope3 = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created3.request_ref,
      verifier_nonce: "nonce-withdraw",
    });
    const withdrawn = await verifyEligibilityPresentation({
      envelope: envelope3,
      expected: { ...expected, verifier_nonce: "nonce-withdraw" },
      fetchReceipt: async () => ({
        receipt_id: "dr_ep_1",
        currently_valid: false,
        withdrawn: true,
        status: "active",
      }),
    });
    expect(withdrawn.reason).toBe("revoked");
  });

  it("requires partner kit receipt re-fetch and never treats the envelope as a grant", async () => {
    const created = await createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-kit" });
    await completeHolder(created.request_ref);
    const envelope = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-kit",
    });
    let fetched = 0;
    const kit = new AbraxasPartnerKit({
      partnerId: "acme",
      policyId: requestBody.policy_id,
      policyVersion: 1,
      environment: "sandbox",
      fetchFn: async () => {
        fetched += 1;
        return new Response(JSON.stringify({
          receipt_id: "dr_ep_1",
          currently_valid: true,
          decision_result: "approved",
          status: "active",
          policy_id: requestBody.policy_id,
          policy_version: 1,
          partner_id: "acme",
          schema_version: "1.0.0",
          signature_valid: true,
        }), { status: 200 });
      },
    });
    const result = await kit.verifyEligibilityPresentation(envelope, {
      verifier_nonce: "nonce-kit",
      policy_id: requestBody.policy_id,
      policy_version: 1,
      action: "retail_access",
      environment: "sandbox",
    });
    expect(fetched).toBeGreaterThan(0);
    expect(result.presentation_sufficient).toBe(false);
    expect(result.receipt_refetch_required).toBe(true);
  });

  it("keeps KYC/KYB planning categories out of live packs and release candidates", () => {
    for (const category of ELIGIBILITY_PLANNING_CATEGORIES) {
      expect(isEligibilityPlanningCategory(category)).toBe(true);
      expect((POLICY_FIT_CATEGORIES as readonly string[]).includes(category)).toBe(false);
      expect(POLICY_FIT_CATEGORY_TO_PACK[category as never]).toBeUndefined();
      expect((POLICY_RC_RESULTS as readonly string[]).includes(category)).toBe(false);
    }
    const payload = sanitizeProposalPayload({
      action: "retail_access",
      result_needed: "organization_eligible",
      partner_receives: ["eligibility_result"],
      stays_private: ["date_of_birth", "holder_wallet"],
      environment: "sandbox",
      platform: "http_generic",
      capabilities: ["reusable_result"],
      confirm: true,
    });
    expect(payload?.result_needed).toBe("organization_eligible");
    expect(deriveReleaseShape(payload!, {
      confirm: true,
      result_category: "organization_eligible",
      shared_result: ["eligibility_result"],
      withheld: ["date_of_birth", "holder_wallet"],
    })).toBeNull();
  });

  it("does not leak evidence, keys, wallets, callbacks, or Utila/Circle side effects", async () => {
    const created = await createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-leak" });
    await completeHolder(created.request_ref);
    const envelope = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-leak",
    });
    const blob = JSON.stringify(envelope).toLowerCase();
    expect(blob).not.toMatch(/legal_name|date_of_birth|beneficial_owner|claims_json|wallet_address|callback_url|abx_live_|utila|circle|createtransfer|placeorder/);
    expect(envelope.payload).not.toHaveProperty("d");
    authenticatePartnerMock.mockResolvedValue(null);
    const denied = await requestPost(new NextRequest("http://localhost/api/v1/eligibility-presentations/requests", {
      method: "POST",
      body: JSON.stringify(requestBody),
    }));
    expect(denied.status).toBe(401);
  });

  it("fails closed when the store is unavailable", async () => {
    forceEligibilityStoreUnavailableForTests(true);
    await expect(createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-store" }))
      .rejects.toMatchObject({ code: "schema_unavailable" });
  });

  it("documents the protocol without browser verifiers or Utila integration", () => {
    const docs = readFileSync(join(process.cwd(), "app/docs/eligibility-presentation-protocol/page.tsx"), "utf8");
    expect(docs).toContain("ELIGIBILITY_PRESENTATION_MEDIA_TYPE");
    expect(docs).toContain("not a transferable identity passport");
    expect(docs.toLowerCase()).toContain("cannot self-publish");
    expect(docs).not.toMatch(/window\.ethereum|app_secret|ABRAXAS_SIGNING_KEY/);
    expect(docs).toContain("never send a receipt_id");
  });

  it("rejects forged receipt_id bodies and derives only a completed bound result", async () => {
    const created = await createPresentationRequest({ ...requestBody, partnerId: "acme", verifier_nonce: "nonce-forge" });
    const withId = await issuePost(new NextRequest("http://localhost/api/v1/eligibility-presentations/issue", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer abx_test_placeholder" },
      body: JSON.stringify({
        request_ref: created.request_ref,
        verifier_nonce: "nonce-forge",
        receipt_id: "dr_forged",
      }),
    }));
    expect(withId.status).toBe(400);
    expect(await withId.json()).toEqual({ error: "invalid_input" });

    await expect(issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-forge",
    })).rejects.toMatchObject({ code: "no_completed_result" });

    await expect(completeHolder(created.request_ref, { policy_id: "other-policy-v1" }))
      .rejects.toMatchObject({ code: "policy_mismatch" });
    await expect(completeHolder(created.request_ref, { decision_context: "production" }))
      .rejects.toMatchObject({ code: "environment_mismatch" });
    await expect(completeHolder(created.request_ref, { revoked_at: "2026-09-21T00:00:00.000Z", status: "revoked" }))
      .rejects.toMatchObject({ code: "receipt_invalid" });

    await completeHolder(created.request_ref);
    await expect(issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "wrong-nonce-xxxx",
    })).rejects.toMatchObject({ code: "nonce_mismatch" });

    const issued = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-forge",
    });
    expect(issued.presentation_sufficient ?? false).toBe(false);
    await expect(issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-forge",
    })).rejects.toMatchObject({ code: "replayed" });
  });

  it("keeps receipt_id out of partner issue schemas, docs, and starter kits", () => {
    const issueRoute = readFileSync(join(process.cwd(), "app/api/v1/eligibility-presentations/issue/route.ts"), "utf8");
    expect(issueRoute).not.toMatch(/record\.receipt_id|ISSUE_REQUEST_KEYS = \["request_ref", "receipt_id"\]/);
    const issueLib = readFileSync(join(process.cwd(), "lib/eligibilityPresentation/issue.ts"), "utf8");
    expect(issueLib).toContain('ISSUE_REQUEST_KEYS = ["request_ref", "verifier_nonce"]');
    expect(issueLib).not.toMatch(/input\.receipt_id/);
    const examples = readFileSync(join(process.cwd(), "lib/eligibilityPresentation/examples.ts"), "utf8");
    expect(examples).toContain("request_ref: requestRef");
    expect(examples).toContain("Do not send receipt_id");
    expect(examples).not.toMatch(/"receipt_id"|receipt_id:/);
    const docs = readFileSync(join(process.cwd(), "app/docs/eligibility-presentation-protocol/page.tsx"), "utf8");
    expect(docs.toLowerCase()).toContain("never send a receipt_id");
    const starter = readFileSync(join(process.cwd(), "lib/partner/starterKit/files.ts"), "utf8");
    expect(starter).toContain("eligibilityPresentationServerExample");
  });
});
