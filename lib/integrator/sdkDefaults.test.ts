import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSdkDefaultBaseUrl } from "@/lib/app/publicAppOrigin";
import { SITE_URL } from "@/lib/siteUrl";
import { AbraxasVerifyClient } from "@/lib/verify/sdk";
import { AbraxasConnectClient } from "@/lib/connect/sdk";
import { buildTrustDecision } from "@/lib/verify/trustDecision";
import {
  EXTERNAL_RP_BASE_URL,
  MINIMAL_RP_INTEGRATION_EXAMPLE,
} from "@/lib/externalRelyingPartyIntegration";
import { CREDENTIAL_VERIFY_EXAMPLE } from "@/lib/relyingPartyProgram";
import type { PolicyDecisionRecord } from "@/lib/policy/types";

const ENV_KEYS = [
  "NEXT_PUBLIC_APP_URL",
  "ABRAXAS_ISSUER_URL",
  "VERCEL_URL",
] as const;

const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function clearOriginEnv() {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
}

function restoreOriginEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
}

describe("getSdkDefaultBaseUrl", () => {
  beforeEach(() => clearOriginEnv());
  afterEach(() => restoreOriginEnv());

  it("defaults to canonical production origin when env is unset", () => {
    expect(getSdkDefaultBaseUrl()).toBe(SITE_URL);
    expect(getSdkDefaultBaseUrl()).not.toContain("abraxas-app.vercel.app");
  });

  it("prefers NEXT_PUBLIC_APP_URL for preview/local configuration", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://preview.example.com/";
    expect(getSdkDefaultBaseUrl()).toBe("https://preview.example.com");
  });

  it("prefers explicit baseUrl override on Verify SDK client", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ trust_request_id: "tr_test" }), { status: 200 }),
    );

    const client = new AbraxasVerifyClient({
      apiKey: "abx_test_key",
      baseUrl: "https://partner-override.example.com",
    });
    await client.requestTrust({
      permission: "regulated_purchase",
      redirectUri: "https://partner.example.com/callback",
    });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "https://partner-override.example.com/api/v1/verify/authorize",
    );
    fetchSpy.mockRestore();
  });

  it("uses canonical production origin on Verify SDK when baseUrl is omitted", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ trust_request_id: "tr_test" }), { status: 200 }),
    );

    const client = new AbraxasVerifyClient({ apiKey: "abx_test_key" });
    await client.requestTrust({
      permission: "regulated_purchase",
      redirectUri: "https://partner.example.com/callback",
    });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(`${SITE_URL}/api/v1/verify/authorize`);
    fetchSpy.mockRestore();
  });

  it("prefers explicit baseUrl override on Connect SDK client", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ authorization_request_id: "car_test" }), { status: 200 }),
    );

    const client = new AbraxasConnectClient({
      apiKey: "abx_test_key",
      baseUrl: "https://connect-override.example.com",
    });
    await client.createAuthorizationRequest({
      policyId: "abraxas-booking-v1",
      returnUrl: "https://partner.example.com/callback",
    });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://connect-override.example.com/api/v1/authorize");
    fetchSpy.mockRestore();
  });

  it("uses canonical production origin on Connect SDK when baseUrl is omitted", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ authorization_request_id: "car_test" }), { status: 200 }),
    );

    const client = new AbraxasConnectClient({ apiKey: "abx_test_key" });
    await client.createAuthorizationRequest({
      policyId: "abraxas-booking-v1",
      returnUrl: "https://partner.example.com/callback",
    });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe(`${SITE_URL}/api/v1/authorize`);
    fetchSpy.mockRestore();
  });

  it("buildTrustDecision proof verify_url defaults to canonical production origin", () => {
    const decision: PolicyDecisionRecord = {
      id: "vd_sdk_default",
      request_id: null,
      partner_id: "good-trouble-cannabis",
      subject_id: "0xabc",
      policy_id: "good-trouble-retail-v1",
      policy_version: 1,
      decision: "approved",
      claims_json: {},
      reason_codes: [],
      valid_until: "2026-08-01T00:00:00.000Z",
      decided_at: "2026-07-30T00:00:00.000Z",
      status: "active",
    };

    const td = buildTrustDecision({
      decision,
      receipt: {
        id: "dr_sdk_default",
        verification_decision_id: "vd_sdk_default",
        consent_receipt_id: null,
        partner_id: "good-trouble-cannabis",
        policy_id: "good-trouble-retail-v1",
        policy_version: 1,
        subject_pseudonym_id: "sub_pseudo",
        wallet_binding_ref: null,
        decision_result: "approved",
        reason_codes: [],
        evaluated_claim_refs: [],
        issuer_refs: [],
        decision_context: "production",
        evaluated_at: "2026-07-30T00:00:00.000Z",
        expires_at: "2026-08-01T00:00:00.000Z",
        revoked_at: null,
        status: "active",
        schema_version: "1.0.0",
        payload_hash: "hash",
        signature: "sig",
        signing_key_id: "key1",
        anchor_reference: null,
        idempotency_key: null,
        created_at: "2026-07-30T00:00:00.000Z",
      },
    });

    expect(td.proof?.verify_url).toBe(`${SITE_URL}/api/receipts/dr_sdk_default/public`);
    expect(td.proof?.verify_url).not.toContain("abraxas-app.vercel.app");
  });

  it("integrator examples do not emit stale vercel preview host as default", () => {
    expect(EXTERNAL_RP_BASE_URL).toBe(SITE_URL);
    expect(MINIMAL_RP_INTEGRATION_EXAMPLE).toContain(SITE_URL);
    expect(MINIMAL_RP_INTEGRATION_EXAMPLE).not.toContain("abraxas-app.vercel.app");
    expect(CREDENTIAL_VERIFY_EXAMPLE).toContain(SITE_URL);
    expect(CREDENTIAL_VERIFY_EXAMPLE).not.toContain("abraxas-app.vercel.app");
  });
});
