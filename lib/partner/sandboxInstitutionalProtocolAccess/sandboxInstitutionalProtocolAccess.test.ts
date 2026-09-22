import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SEQUENCE,
  isSandboxInstitutionalProtocolAccessPolicyId,
  sandboxInstitutionalProtocolAccessProductionDenied,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { buildLaunchpadPolicyId } from "@/lib/partner/launchpad/policyCatalog";
import { POLICY_PACKS, policyPackIsInstitutionalProtocolAccess } from "@/lib/partner/launchpad/policyPacks";
import { planIssuersForPack } from "@/lib/verification/issuerTrust/match";
import { planEligibilityMethods } from "@/lib/partner/eligibilityMethods";
import { isInstitutionalPolicyId } from "@/lib/organizationEligibility/chainCommitments";
import {
  createOrganizationConsent,
  issueOrganizationEligibility,
  organizationLeaks,
  projectOrganizationPublicView,
  resetOrganizationConsentForTests,
  resetOrganizationEligibilityForTests,
  resolveInstitutionalAttestationCommitments,
  revokeOrganizationEligibility,
} from "@/lib/organizationEligibility";
import { planInstitutionalTestnetGate } from "@/lib/partner/testnetGateDeploymentKit/plan";
import { partnerFlowActionsForTemplate } from "@/lib/partner/launchpad/partnerFlowRequest/contract";
import { POST as createApp } from "@/app/api/launchpad/applications/route";
import { NextRequest } from "next/server";

describe("reviewed sandbox institutional protocol-access policy", () => {
  beforeEach(() => {
    resetOrganizationConsentForTests();
    resetOrganizationEligibilityForTests();
    process.env.VITEST = "1";
    process.env.NODE_ENV = "test";
  });
  afterEach(() => {
    resetOrganizationConsentForTests();
    resetOrganizationEligibilityForTests();
  });

  it("pins the exact reviewed policy id and version for every partner", () => {
    expect(buildLaunchpadPolicyId("acme", SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID))
      .toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID);
    expect(buildLaunchpadPolicyId("other", SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID))
      .toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID);
    expect(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION).toBe(1);
    expect(isInstitutionalPolicyId(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID)).toBe(true);
    expect(policyPackIsInstitutionalProtocolAccess(POLICY_PACKS.sandbox_institutional_protocol_access)).toBe(true);
    expect(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_NOTICE.toLowerCase()).toContain("not live kyb");
  });

  it("qualifies only the reviewed organization-eligibility issuer at L2", () => {
    const pack = POLICY_PACKS.sandbox_institutional_protocol_access;
    const plan = planIssuersForPack(pack);
    expect(plan.availability).toBe("approved_verification_method");
    expect(plan.entries.every((row) => row.method_category === "privacy_preserving")).toBe(true);
    expect(plan.entries.some((row) => row.label.toLowerCase().includes("organization"))).toBe(true);
    const methods = planEligibilityMethods({
      pack,
      existingProofCompatible: true,
      partnerAgeCheckConfigured: true,
      partnerAgeCheckAssurance: "L4",
      privacyPreservingAvailable: true,
      browseSelfAttestAllowed: true,
    });
    expect(methods.methods.find((row) => row.id === "privacy_preserving")?.qualifies).toBe(true);
    expect(methods.methods.find((row) => row.id === "reuse_existing_proof")?.qualifies).toBe(false);
    expect(methods.methods.find((row) => row.id === "self_attestation")?.qualifies).toBe(false);
    expect(methods.methods.find((row) => row.id === "identity_liveness")?.qualifies).toBe(false);
    expect(methods.methods.find((row) => row.id === "account_login")?.qualifies).toBe(false);
    expect(methods.methods.find((row) => row.id === "partner_age_check")?.qualifies).toBe(false);
  });

  it("denies production and unmapped results with typed reasons", async () => {
    expect(sandboxInstitutionalProtocolAccessProductionDenied("production", SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID)).toBe(true);
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "production",
    })).rejects.toMatchObject({ code: "environment_mismatch" });
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "consent_required" });
  });

  it("binds a fresh organization_eligible result to the reviewed policy without PII", async () => {
    const consent = createOrganizationConsent({
      partnerHmac: "x",
      result_category: "organization_eligible",
      purpose: "sandbox protocol access demo",
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    const { organizationPartnerHmac } = await import("@/lib/organizationEligibility");
    const liveConsent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "organization_eligible",
      purpose: "sandbox protocol access demo",
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    expect(consent.consent_ref).toBeTruthy();
    const issued = await issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: liveConsent.consent_ref,
    });
    expect(issued.result_category).toBe("organization_eligible");
    expect(JSON.stringify(issued)).not.toMatch(/legal_name|beneficial_owner|wallet_address|rpc_url|private_key/i);
    const bound = await resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    expect(bound.require_institutional).toBe(true);
    expect(bound.record?.currently_valid).toBe(true);
  });

  it("generates a V2 institutional Solana plan from the pinned policy", () => {
    const planned = planInstitutionalTestnetGate({
      target: "institutional-solana-devnet",
      bindings: {
        partner_id: "acme",
        application_id: "app-1",
        policy_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
        policy_version: 1,
        signer_key_id: "solana-attestation-test-1",
      },
    });
    expect(planned.ok).toBe(true);
    if (!planned.ok) return;
    expect(planned.envelope.network_id).toBe("solana_devnet");
    expect(planned.envelope.solana_v2?.message_len).toBe(468);
    expect(planned.envelope.institutional?.require_institutional).toBe(true);
    expect(planned.envelope.bindings.action_type).toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION);
    expect(planned.envelope.bindings.action_scope).toBe(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE);
    expect(planned.envelope.registry_manifest).toBeNull();
    expect(JSON.stringify(planned.envelope)).not.toMatch(/legal_name|beneficial_owner|private_key|rpc_url/);
    expect(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SEQUENCE[0]).toBe("Create sandbox app");
    expect(partnerFlowActionsForTemplate(SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID)).toEqual([
      "institutional_protocol_access",
    ]);
  });

  it("rejects browser authority overrides on Launchpad create", async () => {
    const req = new NextRequest("http://localhost/api/launchpad/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        application_name: "Gate",
        policy_template_id: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
        policy_id: "forged",
        policy_version: 99,
        environment: "sandbox",
        return_url: "https://example.com/cb",
      }),
    });
    const res = await createApp(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(isSandboxInstitutionalProtocolAccessPolicyId("forged")).toBe(false);
  });

  it("denies revocation, cross-partner, and cross-policy reuse", async () => {
    const { organizationPartnerHmac } = await import("@/lib/organizationEligibility");
    const liveConsent = createOrganizationConsent({
      partnerHmac: organizationPartnerHmac("acme"),
      result_category: "organization_eligible",
      purpose: "sandbox protocol access demo",
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      action_scope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    });
    const issued = await issueOrganizationEligibility({
      partnerId: "acme",
      consent_ref: liveConsent.consent_ref,
    });
    const publicView = projectOrganizationPublicView(issued);
    expect(publicView.result).toBe("approved");
    expect(organizationLeaks(publicView)).toEqual([]);
    expect(JSON.stringify(publicView)).not.toMatch(/legal name|registration|beneficial|private_key|rpc_url/i);
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "other-partner",
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
      action: "enable_protocol_access",
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "action_mismatch" });
    await revokeOrganizationEligibility({ organization_ref: issued.organization_ref, partnerId: "acme" });
    await expect(resolveInstitutionalAttestationCommitments({
      partnerId: "acme",
      policyId: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
      policyVersion: 1,
      action: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_ACTION,
      actionScope: SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_SCOPE,
      environment: "sandbox",
    })).rejects.toMatchObject({ code: "organization_revoked" });
  });
});
