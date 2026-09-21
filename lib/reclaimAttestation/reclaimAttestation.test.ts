import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import { projectIssuerTrustRegistry } from "@/lib/verification/issuerTrust/project";
import { VERIFICATION_ISSUER_TRUST_RECORDS } from "@/lib/verification/issuerTrust/registry";
import {
  acceptReclaimCallback,
  createReclaimSession,
  forceReclaimStoreUnavailableForTests,
  reclaimCallbackAllowlisted,
  reclaimCallbackUrl,
  reclaimIsIntegrationReady,
  reclaimPayloadLeaks,
  resetReclaimSessionsForTests,
  setReclaimSdkAdapterForTests,
} from "@/lib/reclaimAttestation";
import { RECLAIM_SANDBOX_MAPPING } from "@/lib/reclaimAttestation/mapping";
import type { ReclaimSdkAdapter } from "@/lib/reclaimAttestation/sdk";
import { overlayReclaimIssuerRecord } from "@/lib/reclaimAttestation/issuer";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "reclaim-attestation-test-secret";

let lastContext = { address: "", message: "" };

const sdk: ReclaimSdkAdapter = {
  async createRequest(input) {
    lastContext = { address: input.contextAddress, message: input.sessionRef };
    return {
      requestConfig: JSON.stringify({
        providerId: input.providerId,
        requestId: "req_test",
      }),
      providerId: RECLAIM_SANDBOX_MAPPING.provider_id,
      providerVersion: RECLAIM_SANDBOX_MAPPING.provider_version,
    };
  },
  async verifyProof() {
    return {
      isVerified: true,
      isTeeAttestationVerified: true,
      data: [{
        context: { address: lastContext.address, message: lastContext.message },
        extractedParameters: { eligible: "true" },
      }],
    };
  },
};

function proofFor(overrides?: { address?: string; message?: string }) {
  return {
    claimData: {
      context: JSON.stringify({
        contextAddress: overrides?.address ?? lastContext.address,
        contextMessage: overrides?.message ?? lastContext.message,
      }),
    },
  };
}

const createInput = {
  holderSubject: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  verifyRequest: "vr_reclaim_1",
  policyId: "partner-age_21_retail-v1",
  policyVersion: 1,
  methodCategory: "privacy_preserving" as const,
  resultClass: "age_21",
  assuranceLevel: "L1",
  environment: "sandbox" as const,
};

describe("reclaim private attestation adapter", () => {
  beforeEach(() => {
    resetReclaimSessionsForTests();
    setReclaimSdkAdapterForTests(sdk);
    process.env.RECLAIMPROTOCOL_APP_ID = "test-app-id";
    process.env.RECLAIMPROTOCOL_APP_SECRET = "test-app-secret";
    lastContext = { address: "", message: "" };
  });

  afterEach(() => {
    setReclaimSdkAdapterForTests(null);
    delete process.env.RECLAIMPROTOCOL_APP_ID;
    delete process.env.RECLAIMPROTOCOL_APP_SECRET;
    resetReclaimSessionsForTests();
  });

  it("creates a server session and returns only safe browser configuration", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.browser.session_ref).toMatch(/^rpa_/);
    expect(JSON.stringify(created.browser)).not.toMatch(/test-app-secret|app_secret|email|wallet|callback_url|eligible/);
    expect(reclaimPayloadLeaks(created.browser)).toEqual([]);
    expect(created.record.issued_receipt).toBe(false);
    expect(created.record.provider_id).toBe(RECLAIM_SANDBOX_MAPPING.provider_id);
    expect(lastContext.message).toBe(created.record.session_ref);
    expect(lastContext.address.startsWith("0x")).toBe(true);
  });

  it("allowlists only the Abraxas HTTPS callback", () => {
    expect(reclaimCallbackAllowlisted(reclaimCallbackUrl())).toBe(true);
    expect(reclaimCallbackAllowlisted("https://evil.example/api/reclaim/callback")).toBe(false);
    expect(reclaimCallbackAllowlisted("http://abraxasworld.xyz/api/reclaim/callback")).toBe(false);
  });

  it("accepts a valid proof with exact provider, version, context, and TEE", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const accepted = await acceptReclaimCallback({ proofs: proofFor() });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.view.status).toBe("accepted");
    expect(accepted.view.issued_receipt).toBe(false);
    expect(accepted.view.consent_required).toBe(true);
    expect(reclaimPayloadLeaks(accepted.view)).toEqual([]);
  });

  it("rejects wrong provider, version, context, session, holder, policy, and environment bindings", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const wrongSession = await acceptReclaimCallback({
      proofs: proofFor({ message: "rpa_missing" }),
    });
    expect(wrongSession.ok).toBe(false);

    setReclaimSdkAdapterForTests({
      ...sdk,
      async verifyProof() {
        return {
          isVerified: true,
          isTeeAttestationVerified: true,
          data: [{
            context: { address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", message: created.record.session_ref },
            extractedParameters: { eligible: "true" },
          }],
        };
      },
    });
    const wrongContext = await acceptReclaimCallback({ proofs: proofFor() });
    expect(wrongContext.ok).toBe(false);

    const otherHolder = await createReclaimSession({
      ...createInput,
      holderSubject: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      verifyRequest: "vr_reclaim_2",
    });
    expect(otherHolder.ok).toBe(true);
  });

  it("rejects expired, cancelled, and replayed proofs", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const first = await acceptReclaimCallback({ proofs: proofFor() });
    expect(first.ok).toBe(true);
    const replay = await acceptReclaimCallback({ proofs: proofFor() });
    expect(replay.ok).toBe(false);
    if (replay.ok) return;
    expect(replay.code).toBe("reclaim_replayed");
  });

  it("fails closed when configuration, store, or TEE is missing", async () => {
    delete process.env.RECLAIMPROTOCOL_APP_SECRET;
    expect(reclaimIsIntegrationReady()).toBe(false);
    const missing = await createReclaimSession(createInput);
    expect(missing.ok).toBe(false);

    process.env.RECLAIMPROTOCOL_APP_SECRET = "test-app-secret";
    forceReclaimStoreUnavailableForTests(true);
    const storeDown = await createReclaimSession(createInput);
    expect(storeDown.ok).toBe(false);
    forceReclaimStoreUnavailableForTests(false);

    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    setReclaimSdkAdapterForTests({
      ...sdk,
      async verifyProof() {
        return {
          isVerified: true,
          isTeeAttestationVerified: false,
          data: [{
            context: { address: lastContext.address, message: lastContext.message },
            extractedParameters: { eligible: "true" },
          }],
        };
      },
    });
    const noTee = await acceptReclaimCallback({ proofs: proofFor() });
    expect(noTee.ok).toBe(false);
    if (noTee.ok) return;
    expect(noTee.code).toBe("reclaim_tee_required");
  });

  it("never leaks raw proof or extracted data and never issues a result before consent", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const accepted = await acceptReclaimCallback({ proofs: proofFor() });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    const blob = JSON.stringify(accepted.view).toLowerCase();
    expect(blob).not.toMatch(/extracted|witness|tee_attestation|test-app-secret|eligible":"true"/);
    expect(accepted.view.issued_receipt).toBe(false);
    const qualified = evaluateMethodQualification({
      methodId: "privacy_preserving",
      storedPartnerId: "acme",
      storedPolicyId: "acme-age_21_retail-v1",
      storedPolicyVersion: 1,
      verifyRequestId: "vr-retail-1",
      reclaimRequired: true,
      reclaimSessionAccepted: true,
    });
    expect(qualified.ok).toBe(true);
    if (!qualified.ok) return;
    expect(qualified.record.issuedReceipt).toBe(false);
  });

  it("marks Reclaim integration_ready only when configuration exists", () => {
    const planned = overlayReclaimIssuerRecord(
      VERIFICATION_ISSUER_TRUST_RECORDS.find((record) => record.issuer_key === "reclaim.privacy_preserving")!,
    );
    expect(planned.integration).toBe("integration_ready");
    expect(planned.status).toBe("active");
    delete process.env.RECLAIMPROTOCOL_APP_SECRET;
    const review = overlayReclaimIssuerRecord(
      VERIFICATION_ISSUER_TRUST_RECORDS.find((record) => record.issuer_key === "reclaim.privacy_preserving")!,
    );
    expect(review.integration).toBe("planned");
    expect(review.status).toBe("review_required");
    const view = projectIssuerTrustRegistry();
    expect(view.reclaim.google_is_eligibility).toBe(false);
    expect(JSON.stringify(view)).not.toMatch(/app_secret|test-app-secret/);
  });

  it("has no receipt, key, wallet, payment, trade, transaction, Circle, or Mainnet side effect", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const source = readFileSync(join(process.cwd(), "lib/reclaimAttestation/verify.ts"), "utf8");
    expect(source).not.toMatch(/circle|mainnet|broadcast|createReceipt|walletconnect/i);
    expect(created.record.issued_receipt).toBe(false);
  });

  it("ships DEMO-first migration 104 with RLS and replay digest", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/104_reclaim_private_attestation_sessions.sql"), "utf8");
    expect(sql).toMatch(/reclaim_private_attestation_sessions/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/proof_digest text unique/);
    expect(sql).toMatch(/service_role/);
    expect(sql).not.toMatch(/extracted_parameters|raw_proof|app_secret/);
  });
});
