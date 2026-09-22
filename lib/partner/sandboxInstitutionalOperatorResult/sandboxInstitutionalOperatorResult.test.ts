import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import {
  completePresentationHolderResultForTests,
  createPresentationRequest,
  issueEligibilityPresentation,
  putSourceReceiptForTests,
  resetEligibilityPresentationsForTests,
  resetSourceReceiptsForTests,
  verifyEligibilityPresentation,
} from "@/lib/eligibilityPresentation";
import {
  issueOrganizationEligibility,
  organizationPartnerHmac,
  resetOrganizationConsentForTests,
  resetOrganizationEligibilityForTests,
  resolveInstitutionalAttestationCommitments,
} from "@/lib/organizationEligibility";
import { createOrganizationConsent } from "@/lib/organizationEligibility";
import { planInstitutionalTestnetGate } from "@/lib/partner/testnetGateDeploymentKit/plan";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import {
  SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE,
  SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL,
  bindFreshConsentToOperatorSandboxResult,
  issueOperatorSandboxInstitutionalResult,
  putOperatorLaunchpadAppForTests,
  resetOperatorLaunchpadAppsForTests,
  resetOperatorSandboxInstitutionalAuditForTests,
  revokeOperatorSandboxInstitutionalResult,
} from "@/lib/partner/sandboxInstitutionalOperatorResult";
import { POST as operatorPost, GET as operatorGet } from "@/app/api/admin/sandbox-institutional-result/route";
import { resetLaunchpadRateLimitStoreForTests } from "@/lib/partner/launchpad/rateLimit";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";

const KEY = generateTestSigningKeyPair();
process.env.ABRAXAS_SIGNING_KEY_ID = KEY.signingKeyId;
process.env.ABRAXAS_PUBLIC_KEY = JSON.stringify(KEY.publicKeyJwk);
process.env.ABRAXAS_SIGNING_KEY = JSON.stringify(KEY.privateKeyJwk);
process.env.VITEST = "1";
process.env.NODE_ENV = "test";
process.env.ADMIN_PIN = "";

function app(overrides: Partial<LaunchpadApplicationRow> = {}): LaunchpadApplicationRow {
  return {
    id: "app-inst-1",
    public_slug: "inst-app",
    partner_id: "acme",
    application_name: "Institutional sandbox",
    display_name: "Institutional sandbox",
    environment: "sandbox",
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policy_version: 1,
    policy_template_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    allowed_return_urls: ["https://partner.example/callback"],
    api_key_id: "key-1",
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: "active",
    idempotency_key: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function receipt(overrides: Partial<DecisionReceiptRecord> = {}): DecisionReceiptRecord {
  return {
    id: "dr_op_1",
    schema_version: "1.0.0",
    verification_decision_id: "dec-op-1",
    consent_receipt_id: "cr_op_1",
    policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
    policy_version: 1,
    partner_id: "acme",
    subject_pseudonym_id: "ps_op",
    wallet_binding_ref: null,
    decision_result: "approved",
    reason_codes: ["eligible"],
    evaluated_claim_refs: [],
    issuer_refs: [],
    decision_context: "sandbox_only",
    evaluated_at: "2026-09-22T00:00:00.000Z",
    expires_at: "2099-01-01T00:00:00.000Z",
    status: "active",
    payload_hash: "hash",
    signature: "sig",
    signing_key_id: KEY.signingKeyId,
    anchor_reference: null,
    revoked_at: null,
    idempotency_key: null,
    created_at: "2026-09-22T00:00:00.000Z",
    ...overrides,
  };
}

describe("operator sandbox institutional test result", () => {
  beforeEach(() => {
    resetOrganizationEligibilityForTests();
    resetOrganizationConsentForTests();
    resetOperatorLaunchpadAppsForTests();
    resetOperatorSandboxInstitutionalAuditForTests();
    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    resetLaunchpadRateLimitStoreForTests();
    putOperatorLaunchpadAppForTests(app());
  });

  it("issues a short-lived sandbox_test_only result pinned to the reviewed policy", async () => {
    const issued = await issueOperatorSandboxInstitutionalResult({
      applicationId: "app-inst-1",
      confirm: true,
    });
    expect(issued.purpose).toBe(SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL);
    expect(issued.environment).toBe("sandbox");
    expect(issued.action).toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION);
    expect(issued.consent_bound).toBe(false);
    expect(JSON.stringify(issued)).not.toMatch(/legal_name|beneficial_owner|wallet_address|private_key|callback/i);
    expect(SANDBOX_INSTITUTIONAL_OPERATOR_NOTICE).toContain("not a live KYB");
  });

  it("requires confirmation and rejects partner self-issue for this action", async () => {
    await expect(issueOperatorSandboxInstitutionalResult({
      applicationId: "app-inst-1",
      confirm: false,
    })).rejects.toMatchObject({ code: "confirmation_required" });
    const consent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "organization_eligible",
      purpose: "try to self issue",
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    await expect(issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: consent.consent_ref,
    })).rejects.toMatchObject({ code: "operator_result_required" });
  });

  it("binds fresh consent then presentation and V2 attestation eligibility", async () => {
    await issueOperatorSandboxInstitutionalResult({ applicationId: "app-inst-1", confirm: true });
    await bindFreshConsentToOperatorSandboxResult({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    const created = await createPresentationRequest({
      partnerId: "acme",
      policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policy_version: 1,
      purpose: "sandbox institutional demo",
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
      result_category: "organization_eligible",
      verifier_nonce: "nonce-operator-1",
    });
    const rec = receipt();
    putSourceReceiptForTests(rec);
    await completePresentationHolderResultForTests({
      requestRef: created.request_ref,
      receipt: rec,
      partnerId: "acme",
    });
    const envelope = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: created.request_ref,
      verifier_nonce: "nonce-operator-1",
    });
    const verified = await verifyEligibilityPresentation({
      envelope,
      expected: {
        audience_hash: created.audience_hash,
        verifier_nonce: "nonce-operator-1",
        policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
        policy_version: 1,
        action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
        environment: "sandbox",
      },
      fetchReceipt: async () => ({
        receipt_id: rec.id,
        currently_valid: true,
        decision_result: "approved",
        status: "active",
        policy_id: rec.policy_id,
        policy_version: 1,
        partner_id: "acme",
      }),
    });
    expect(verified.ok).toBe(true);
    const bound = await resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    expect(bound.require_institutional).toBe(true);
    expect(bound.record?.purpose).toBe(SANDBOX_INSTITUTIONAL_OPERATOR_RESULT_LABEL);
    const planned = planInstitutionalTestnetGate({
      target: "institutional-solana-devnet",
      bindings: {
        partner_id: "acme",
        application_id: "app-inst-1",
        policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
        policy_version: 1,
        signer_key_id: "solana-attestation-test-1",
      },
    });
    expect(planned.ok).toBe(true);
  });

  it("denies expiry, revocation, cross-partner, production, and replay", async () => {
    const issued = await issueOperatorSandboxInstitutionalResult({ applicationId: "app-inst-1", confirm: true });
    await expect(issueOperatorSandboxInstitutionalResult({
      applicationId: "app-inst-1",
      confirm: true,
    })).rejects.toMatchObject({ code: "replayed" });
    await bindFreshConsentToOperatorSandboxResult({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "other",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "consent_required" });
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "production",
    })).rejects.toMatchObject({ code: "environment_mismatch" });
    putOperatorLaunchpadAppForTests(app({ id: "app-other", partner_id: "other" }));
    await expect(revokeOperatorSandboxInstitutionalResult({
      organizationRef: issued.organization_ref,
      applicationId: "app-other",
      confirm: true,
    })).rejects.toMatchObject({ code: "cross_partner" });
    await revokeOperatorSandboxInstitutionalResult({
      organizationRef: issued.organization_ref,
      applicationId: "app-inst-1",
      confirm: true,
    });
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "organization_revoked" });
    putOperatorLaunchpadAppForTests(app({ id: "app-expired" }));
    await issueOperatorSandboxInstitutionalResult({
      applicationId: "app-expired",
      confirm: true,
      now: Date.now() - 6 * 60 * 1000,
    });
    await expect(bindFreshConsentToOperatorSandboxResult({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "expired" });
  });

  it("rejects unauthenticated, CSRF-missing, override, and Production API attempts", async () => {
    process.env.ADMIN_PIN = "secret-pin";
    const unauth = await operatorPost(new NextRequest("http://localhost/api/admin/sandbox-institutional-result", {
      method: "POST",
      body: JSON.stringify({ application_id: "app-inst-1", confirm: true }),
    }));
    expect(unauth.status).toBe(401);
    process.env.ADMIN_PIN = "";
    const csrf = await operatorPost(new NextRequest("http://localhost/api/admin/sandbox-institutional-result", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ application_id: "app-inst-1", confirm: true }),
    }));
    expect(csrf.status).toBe(403);
    const override = await operatorPost(new NextRequest("http://localhost/api/admin/sandbox-institutional-result", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({
        application_id: "app-inst-1",
        confirm: true,
        policy_id: "forged",
        environment: "production",
      }),
    }));
    expect(override.status).toBe(400);
    const ok = await operatorPost(new NextRequest("http://localhost/api/admin/sandbox-institutional-result", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ application_id: "app-inst-1", confirm: true }),
    }));
    expect(ok.status).toBe(200);
    const json = await ok.json() as { result_label: string; organization_ref: string };
    expect(json.result_label).toBe("sandbox_test_only");
    const listed = await operatorGet(new NextRequest("http://localhost/api/admin/sandbox-institutional-result?application_id=app-inst-1"));
    expect(listed.status).toBe(200);
  });
});
