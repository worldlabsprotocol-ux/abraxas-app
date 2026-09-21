import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import {
  ORGANIZATION_DEMO_SQL_EDITOR,
  ORGANIZATION_MIGRATION_FILE,
  ORGANIZATION_PUBLIC_RESULT_FIELDS,
  ORGANIZATION_NO_WALLET_KYB,
  createOrganizationConsent,
  hashOrganizationSubjectBinding,
  issueOrganizationEligibility,
  loadOrganizationEligibility,
  mapReviewedOrganizationIssuer,
  organizationLeaks,
  organizationPartnerHmac,
  organizationPolicyPublicCatalog,
  projectOrganizationPublicView,
  resetOrganizationConsentForTests,
  resetOrganizationEligibilityForTests,
  revokeOrganizationEligibility,
  resolveInstitutionalAttestationCommitments,
  organizationCommitment,
  actorCommitment,
} from "@/lib/organizationEligibility";
import { VERIFICATION_ISSUER_TRUST_RECORDS } from "@/lib/verification/issuerTrust/registry";
import { deriveReleaseShape } from "@/lib/partner/policyReleaseCandidate/sanitize";
import { POLICY_RC_RESULTS } from "@/lib/partner/policyReleaseCandidate/contract";
import { ELIGIBILITY_PLANNING_CATEGORIES } from "@/lib/eligibilityPresentation/planning";
import {
  completePresentationHolderResultForTests,
  createPresentationRequest,
  issueEligibilityPresentation,
  putSourceReceiptForTests,
  resetEligibilityPresentationsForTests,
  resetSourceReceiptsForTests,
  verifyEligibilityPresentation,
} from "@/lib/eligibilityPresentation";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { generateTestSigningKeyPair } from "@/lib/decisionReceipts/signing";
import { POST as consentPost } from "@/app/api/v1/organization-eligibility/consent/route";
import { POST as issuePost } from "@/app/api/v1/organization-eligibility/issue/route";
import { generateStarterKit } from "@/lib/partner/starterKit/generate";
import { validateStarterKitInput } from "@/lib/partner/starterKit/validate";
import { studioSnippetForPath } from "@/lib/partner/integrationStudio";

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
    id: "dr_org_1",
    schema_version: "1.0.0",
    verification_decision_id: "dec-org-1",
    consent_receipt_id: "cr_org_1",
    policy_id: "authorized_signer",
    policy_version: 1,
    partner_id: "acme",
    subject_pseudonym_id: "ps_org",
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

describe("private organization eligibility", () => {
  beforeEach(() => {
    resetOrganizationEligibilityForTests();
    resetOrganizationConsentForTests();
    resetEligibilityPresentationsForTests();
    resetSourceReceiptsForTests();
    authenticatePartnerMock.mockResolvedValue({ ok: true, ctx: { partnerId: "acme" } });
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("binds exact organization, actor, partner, policy, action, and environment", async () => {
    const consent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "authorized_signer",
      purpose: "Confirm one named protocol action",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    const issued = await issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: consent.consent_ref,
      organization_seed: "org-seed",
      actor_seed: "act-seed",
      subject_binding_hash: hashOrganizationSubjectBinding("0xabc"),
    });
    expect(issued.partner_hmac).toBe(organizationPartnerHmac("acme"));
    expect(issued.policy_id).toBe("authorized_signer");
    expect(issued.action).toBe("enable_protocol_access");
    expect(issued.environment).toBe("sandbox");
    const view = projectOrganizationPublicView(issued);
    expect(view.result).toBe("approved");
    expect(view.currently_valid).toBe(true);
    for (const field of ORGANIZATION_PUBLIC_RESULT_FIELDS) {
      expect(view).toHaveProperty(field);
    }
    expect(organizationLeaks(view)).toEqual([]);
  });

  it("requires a reviewed issuer mapping and rejects wallet-only KYB", () => {
    expect(mapReviewedOrganizationIssuer({
      issuer_key: "reclaim.privacy_preserving",
      result_category: "organization_eligible",
    }).ok).toBe(false);
    expect(mapReviewedOrganizationIssuer({
      issuer_key: "abraxas.wallet_control",
      result_category: "authorized_signer",
    }).reason).toBe("wallet_only_kyb");
    const wallet = VERIFICATION_ISSUER_TRUST_RECORDS.find((row) => row.method_category === "wallet_control");
    expect(wallet).toBeTruthy();
    expect(mapReviewedOrganizationIssuer({
      issuer_key: wallet!.issuer_key,
      result_category: "authorized_signer",
    }).reason).toBe("wallet_only_kyb");
    expect(mapReviewedOrganizationIssuer({
      issuer_key: "abraxas.organization_eligibility",
      result_category: "authorized_signer",
    }).ok).toBe(true);
  });

  it("requires fresh consent and fails closed after expiry, revocation, and withdrawal", async () => {
    await expect(issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: "missing",
    })).rejects.toMatchObject({ code: "consent_required" });

    const consent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "jurisdiction_eligible",
      purpose: "Confirm jurisdiction",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    const issued = await issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: consent.consent_ref,
      now: Date.now() - 16 * 60 * 1000,
    });
    const expired = await loadOrganizationEligibility(issued.organization_ref);
    expect(expired?.status).toBe("expired");
    expect(projectOrganizationPublicView(expired!).result).toBe("expired");

    const liveConsent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "organization_eligible",
      purpose: "Confirm organization",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    const live = await issueOrganizationEligibility({ partnerId: "acme", consent_ref: liveConsent.consent_ref });
    await revokeOrganizationEligibility({ partnerId: "acme", organization_ref: live.organization_ref });
    expect(projectOrganizationPublicView((await loadOrganizationEligibility(live.organization_ref))!).result).toBe("revoked");

    const withdrawConsent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "institutional_counterparty_eligible",
      purpose: "Confirm counterparty",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    const withdraw = await issueOrganizationEligibility({ partnerId: "acme", consent_ref: withdrawConsent.consent_ref });
    await revokeOrganizationEligibility({ partnerId: "acme", organization_ref: withdraw.organization_ref, withdraw: true });
    expect((await loadOrganizationEligibility(withdraw.organization_ref))?.status).toBe("withdrawn");
  });

  it("denies presentations and hashed chain bindings after revocation", async () => {
    const consent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "authorized_signer",
      purpose: "Confirm signer",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    const org = await issueOrganizationEligibility({ partnerId: "acme", consent_ref: consent.consent_ref });
    const request = await createPresentationRequest({
      partnerId: "acme",
      policy_id: "authorized_signer",
      policy_version: 1,
      purpose: "Confirm signer",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
      result_category: "authorized_signer",
      verifier_nonce: "nonce-org-1234",
    });
    putSourceReceiptForTests(receipt());
    await completePresentationHolderResultForTests({
      requestRef: request.request_ref,
      receipt: receipt(),
      partnerId: "acme",
    });
    const envelope = await issueEligibilityPresentation({
      partnerId: "acme",
      request_ref: request.request_ref,
      verifier_nonce: "nonce-org-1234",
    });
    expect(envelope.payload.result_category).toBe("authorized_signer");

    await revokeOrganizationEligibility({ partnerId: "acme", organization_ref: org.organization_ref });
    const verified = await verifyEligibilityPresentation({
      envelope,
      expected: {
        audience_hash: envelope.payload.audience_hash,
        verifier_nonce: "nonce-org-1234",
        policy_id: "authorized_signer",
        policy_version: 1,
        action: "enable_protocol_access",
        environment: "sandbox",
      },
      fetchReceipt: async () => ({
        receipt_id: "dr_org_1",
        currently_valid: true,
        status: "active",
        decision_result: "approved",
        policy_id: "authorized_signer",
        policy_version: 1,
        partner_id: "acme",
      }),
    });
    expect(verified.ok).toBe(false);
    expect(verified.presentation_sufficient).toBe(false);
  });

  it("never leaks raw organization, KYB, issuer evidence, or Utila/payment side effects", () => {
    const catalog = organizationPolicyPublicCatalog();
    expect(catalog.self_publishable).toBe(false);
    expect(catalog.automatically_active).toBe(false);
    expect(catalog.live_policy).toBe(false);
    expect(catalog.wallet_kyb_notice).toBe(ORGANIZATION_NO_WALLET_KYB);
    expect(organizationLeaks({ legal_name: "Acme LLC", beneficial_owner: "x" })).toContain("legal_name");
    const migration = readFileSync(join(process.cwd(), "supabase/migrations", ORGANIZATION_MIGRATION_FILE), "utf8");
    expect(migration).toContain("organization_eligibility_records");
    expect(migration).toContain("service_role");
    expect(migration).toContain(ORGANIZATION_DEMO_SQL_EDITOR);
    expect(migration).not.toMatch(/legal_name|tax_id|beneficial_owner|callback_url/);
    const src = [
      readFileSync(join(process.cwd(), "lib/organizationEligibility/issue.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/organizationEligibility/examples.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/partner/chainAttestation/examples.ts"), "utf8"),
      readFileSync(join(process.cwd(), "lib/partner/evmGate/examples.ts"), "utf8"),
    ].join("\n");
    expect(src).not.toMatch(/createTransfer|sendTransaction|circle|utila\.api|mainnet\.infura/i);
    expect(src).not.toContain("organization_binding_hash");
  });

  it("keeps organization policies on the proposal → RC catalog path without live publish", () => {
    for (const id of ELIGIBILITY_PLANNING_CATEGORIES) {
      expect(POLICY_RC_RESULTS).toContain(id);
    }
    const shape = deriveReleaseShape({
      action: "retail_access",
      result_needed: "authorized_signer",
      partner_receives: ["eligibility_result"],
      stays_private: ["date_of_birth"],
      environment: "sandbox",
      platform: "http_generic",
      capabilities: ["reusable_result"],
    }, {
      confirm: true,
      action: "retail_access",
      result_category: "authorized_signer",
      shared_result: ["eligibility_result"],
      withheld: ["date_of_birth"],
      method_category: "privacy_preserving",
      minimum_assurance: "L2",
      environment: "sandbox",
      action_scopes: ["sandbox:protocol_access"],
      disclosure_profile: "result_only",
      compatibility_impact: "policy_review",
      policy_label: "reviewed_gate_authorized_signer",
    });
    expect(shape?.result_category).toBe("authorized_signer");
    expect(shape?.live_policy).toBe(false);
    expect(shape?.publishes_catalog).toBe(false);
  });

  it("serves partner consent/issue APIs without browser authority", async () => {
    const consentRes = await consentPost(new NextRequest("http://localhost/api/v1/organization-eligibility/consent", {
      method: "POST",
      body: JSON.stringify({
        result_category: "authorized_signer",
        purpose: "Confirm signer",
        action: "enable_protocol_access",
        action_scope: "sandbox:protocol_access",
        environment: "sandbox",
        issuer: "reclaim.privacy_preserving",
      }),
    }));
    expect(consentRes.status).toBe(400);

    const okConsent = await consentPost(new NextRequest("http://localhost/api/v1/organization-eligibility/consent", {
      method: "POST",
      body: JSON.stringify({
        result_category: "authorized_signer",
        purpose: "Confirm signer",
        action: "enable_protocol_access",
        action_scope: "sandbox:protocol_access",
        environment: "sandbox",
      }),
    }));
    expect(okConsent.status).toBe(200);
    const consentJson = await okConsent.json() as { consent_ref: string };
    const issued = await issuePost(new NextRequest("http://localhost/api/v1/organization-eligibility/issue", {
      method: "POST",
      body: JSON.stringify({ consent_ref: consentJson.consent_ref }),
    }));
    expect(issued.status).toBe(200);
    const json = await issued.json() as { result: string; currently_valid: boolean };
    expect(json.result).toBe("approved");
    expect(json.currently_valid).toBe(true);
  });

  it("ships Studio and Starter Kit institutional eligibility gate without funds movement", () => {
    const snippet = studioSnippetForPath("institutional_eligibility_gate");
    expect(snippet.title).toBe("Institutional eligibility gate");
    expect(snippet.code).toContain("/api/v1/organization-eligibility");
    const validated = validateStarterKitInput({
      pack_id: "age_21_retail",
      path: "institutional_eligibility_gate",
      runtime: "typescript_nextjs",
      capabilities: [],
    });
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const kit = generateStarterKit(validated.selection);
    expect(kit.ok).toBe(true);
    if (!kit.ok) return;
    expect(kit.files.some((file) => file.path === "src/lib/organization-eligibility.ts")).toBe(true);
    expect(kit.files.map((file) => file.contents).join("\n")).not.toMatch(/createTransfer|utila\.api|legal_name/);
  });

  it("resolves opaque chain commitments from the current organization result only", async () => {
    const consent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "organization_eligible",
      purpose: "Confirm one named protocol action",
      action: "enable_protocol_access",
      action_scope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    const issued = await issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: consent.consent_ref,
      organization_seed: "org-chain",
      actor_seed: "act-chain",
      subject_binding_hash: hashOrganizationSubjectBinding("wallet-a"),
    });
    const resolved = await resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: "organization_eligible",
      policyVersion: 1,
      action: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    expect(resolved.require_institutional).toBe(true);
    expect(resolved.organization_commitment).toBe(organizationCommitment(issued.organization_ref));
    expect(resolved.actor_commitment).toBe(actorCommitment(issued.actor_ref));
    expect(resolved.subject_binding_hash).toBe(issued.subject_binding_hash);
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: "organization_eligible",
      policyVersion: 1,
      action: "other_action",
      actionScope: "sandbox:protocol_access",
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "consent_required" });
    await revokeOrganizationEligibility({ organization_ref: issued.organization_ref, partnerId: "acme", withdraw: true });
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: "organization_eligible",
      policyVersion: 1,
      action: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "organization_revoked" });
    const personal = await resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: "age_21_plus",
      policyVersion: 1,
      action: "enable_protocol_access",
      actionScope: "sandbox:protocol_access",
      environment: "sandbox",
    });
    expect(personal.require_institutional).toBe(false);
    expect(personal.organization_commitment).toMatch(/^0x0+$/);
  });
});
