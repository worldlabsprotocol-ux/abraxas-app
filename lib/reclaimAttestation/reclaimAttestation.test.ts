import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateMethodQualification } from "@/lib/partner/partnerMethodQualification";
import { projectIssuerTrustRegistry } from "@/lib/verification/issuerTrust/project";
import { VERIFICATION_ISSUER_TRUST_RECORDS } from "@/lib/verification/issuerTrust/registry";
import {
  acceptReclaimCallback,
  createReclaimSession,
  findAcceptedReclaimSession,
  forceReclaimStoreUnavailableForTests,
  putReclaimSessionForTests,
  reclaimCallbackAllowlisted,
  reclaimCallbackUrl,
  reclaimIsIntegrationReady,
  reclaimPayloadLeaks,
  resetReclaimSessionsForTests,
  resolveReclaimRuntime,
  setReclaimSdkAdapterForTests,
} from "@/lib/reclaimAttestation";
import { RECLAIM_SANDBOX_MAPPING } from "@/lib/reclaimAttestation/mapping";
import type { ReclaimSdkAdapter } from "@/lib/reclaimAttestation/sdk";
import { overlayReclaimIssuerRecord } from "@/lib/reclaimAttestation/issuer";

if (!process.env.NEXTAUTH_SECRET?.trim()) process.env.NEXTAUTH_SECRET = "reclaim-attestation-test-secret";

let lastContext = { address: "", message: "", callbackUrl: "" };

const sdk: ReclaimSdkAdapter = {
  async createRequest(input) {
    lastContext = { address: input.contextAddress, message: input.sessionRef, callbackUrl: input.callbackUrl };
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

function bindProductionRuntime(): void {
  process.env.ABRAXAS_RUNTIME_ENV = "production";
  process.env.NEXT_PUBLIC_APP_URL = "https://abraxasworld.xyz";
  delete process.env.ABRAXAS_ISSUER_URL;
}

function bindDemoRuntime(): void {
  process.env.ABRAXAS_RUNTIME_ENV = "demo";
  process.env.NEXT_PUBLIC_APP_URL = "https://demo.abraxasworld.xyz";
  delete process.env.ABRAXAS_ISSUER_URL;
}

describe("reclaim private attestation adapter", () => {
  beforeEach(() => {
    resetReclaimSessionsForTests();
    setReclaimSdkAdapterForTests(sdk);
    process.env.RECLAIMPROTOCOL_APP_ID = "test-app-id";
    process.env.RECLAIMPROTOCOL_APP_SECRET = "test-app-secret";
    bindProductionRuntime();
    lastContext = { address: "", message: "", callbackUrl: "" };
  });

  afterEach(() => {
    setReclaimSdkAdapterForTests(null);
    delete process.env.RECLAIMPROTOCOL_APP_ID;
    delete process.env.RECLAIMPROTOCOL_APP_SECRET;
    delete process.env.ABRAXAS_RUNTIME_ENV;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.ABRAXAS_ISSUER_URL;
    resetReclaimSessionsForTests();
  });

  it("creates a server session and returns only safe browser configuration", async () => {
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.browser.session_ref).toMatch(/^rpa_/);
    expect(lastContext.callbackUrl).toBe("https://abraxasworld.xyz/api/reclaim/callback");
    expect(JSON.stringify(created.browser)).not.toMatch(/test-app-secret|app_secret|email|wallet|callback_url|abraxasworld\.xyz\/api\/reclaim\/callback|eligible/);
    expect(reclaimPayloadLeaks(created.browser)).toEqual([]);
    expect(created.record.issued_receipt).toBe(false);
    expect(created.record.provider_id).toBe(RECLAIM_SANDBOX_MAPPING.provider_id);
    expect(lastContext.message).toBe(created.record.session_ref);
    expect(lastContext.address.startsWith("0x")).toBe(true);
  });

  it("allowlists only the runtime-bound Abraxas HTTPS callback", () => {
    const production = resolveReclaimRuntime();
    expect(production.ok).toBe(true);
    if (production.ok) expect(production.runtime).toBe("production");
    expect(reclaimCallbackUrl()).toBe("https://abraxasworld.xyz/api/reclaim/callback");
    expect(reclaimCallbackAllowlisted(reclaimCallbackUrl())).toBe(true);
    expect(reclaimCallbackAllowlisted("https://demo.abraxasworld.xyz/api/reclaim/callback")).toBe(false);
    expect(reclaimCallbackAllowlisted("https://evil.example/api/reclaim/callback")).toBe(false);
    expect(reclaimCallbackAllowlisted("http://abraxasworld.xyz/api/reclaim/callback")).toBe(false);

    bindDemoRuntime();
    const demo = resolveReclaimRuntime();
    expect(demo.ok).toBe(true);
    if (demo.ok) expect(demo.runtime).toBe("demo");
    expect(reclaimCallbackUrl()).toBe("https://demo.abraxasworld.xyz/api/reclaim/callback");
    expect(reclaimCallbackAllowlisted("https://abraxasworld.xyz/api/reclaim/callback")).toBe(false);
    expect(reclaimCallbackAllowlisted("https://demo.abraxasworld.xyz/api/reclaim/callback")).toBe(true);

    process.env.ABRAXAS_RUNTIME_ENV = "preview";
    expect(resolveReclaimRuntime().ok).toBe(false);
    expect(reclaimCallbackUrl()).toBeNull();
    expect(reclaimCallbackAllowlisted("https://abraxasworld.xyz/api/reclaim/callback")).toBe(false);
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

  it("rejects DEMO/Production origin mismatch and user-controlled callback input", async () => {
    bindDemoRuntime();
    const created = await createReclaimSession(createInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(lastContext.callbackUrl).toBe("https://demo.abraxasworld.xyz/api/reclaim/callback");
    expect(JSON.stringify(created.browser)).not.toMatch(/callback_url|demo\.abraxasworld\.xyz\/api\/reclaim\/callback/);

    bindProductionRuntime();
    const crossed = await acceptReclaimCallback({ proofs: proofFor() });
    expect(crossed.ok).toBe(false);
    if (crossed.ok) return;
    expect(crossed.code).toBe("reclaim_origin_mismatch");

    bindDemoRuntime();
    const wrongHost = await acceptReclaimCallback({
      proofs: proofFor(),
      request: new Request("https://abraxasworld.xyz/api/reclaim/callback", {
        method: "POST",
        headers: { host: "abraxasworld.xyz" },
      }),
    });
    expect(wrongHost.ok).toBe(false);
    if (wrongHost.ok) return;
    expect(wrongHost.code).toBe("reclaim_origin_mismatch");

    process.env.NEXT_PUBLIC_APP_URL = "https://evil.example";
    expect(resolveReclaimRuntime().ok).toBe(false);
  });

  it("finds an accepted in-memory session without Map iterator helpers", async () => {
    putReclaimSessionForTests({
      session_ref: "rpa_memory_lookup",
      holder_hmac: "holder-hmac",
      verify_request_hmac: "verify-hmac",
      policy_hmac: "policy-hmac",
      policy_id: "partner-age_21_retail-v1",
      policy_version: 1,
      method_category: "privacy_preserving",
      result_class: "age_21",
      assurance_level: "L1",
      environment: "sandbox",
      mapping_id: "reclaim.sandbox.age_gate",
      provider_id: "reclaim-sandbox-http-provider",
      provider_version: "1",
      nonce_hash: "nonce-hmac",
      context_hmac: "context-hmac",
      callback_ref: "rcb_test",
      status: "accepted",
      proof_digest: "digest-1",
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      accepted_at: new Date().toISOString(),
      cancelled_at: null,
      issued_receipt: false,
    });
    const found = await findAcceptedReclaimSession({
      holderHmac: "holder-hmac",
      verifyRequestHmac: "verify-hmac",
      policyHmac: "policy-hmac",
      environment: "sandbox",
    });
    expect(found?.session_ref).toBe("rpa_memory_lookup");
    expect(found?.status).toBe("accepted");
    expect(await findAcceptedReclaimSession({
      holderHmac: "holder-hmac",
      verifyRequestHmac: "verify-hmac",
      policyHmac: "policy-hmac",
      environment: "production",
    })).toBeNull();

    const storeSource = readFileSync(join(process.cwd(), "lib/reclaimAttestation/store.ts"), "utf8");
    expect(storeSource).not.toMatch(/Array\.from\(memory/);
    expect(storeSource).not.toMatch(/\[\.\.\.memory\.values\(\)\]/);
    expect(storeSource).not.toMatch(/for\s*\(\s*(const|let|var)\s+\w+\s+of\s+memory/);
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
