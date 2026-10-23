import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetNativeAccountMemory, nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { createNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import {
  issuePartnerMembershipRecoveryAttestation,
  verifyPartnerMembershipRecoveryAttestationToken,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { grantPartnerMembershipByInvitation } from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";
import { issueAdminRecoveryOwnershipApproval } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval";

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: vi.fn(async () => ({
    partner_id: "tenant-victim",
    environment: "sandbox",
    application_name: "Victim App",
    display_name: "Victim App",
    status: "active",
    created_at: "2026-10-21T00:00:00.000Z",
  })),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => "audit_adversarial"),
}));

const PARTNER = "tenant-victim";
const APP = "fbea93d2-6660-428d-85c3-8c4e12d89b05";

describe("partner membership recovery adversarial", () => {
  beforeEach(() => {
    resetNativeAccountMemory();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NODE_ENV = "test";
    process.env.ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED = "true";
    process.env.ABRAXAS_NATIVE_ACCOUNT_MEMORY = "1";
    process.env.ABRAXAS_ACCOUNT_SESSION_SECRET = "01234567890123456789012345678901";
    process.env.ABRAXAS_BROWSER_SESSION_SECRET = "01234567890123456789012345678901";
    process.env.NEXT_PUBLIC_APP_URL = "https://demo.abraxasworld.xyz";
  });

  it("blocks foreign account grant without admin ownership approval", async () => {
    const attacker = createNativeAccountId();
    const victimOwner = createNativeAccountId();
    nativeAccountMemory.insertAccount(attacker);
    nativeAccountMemory.insertAccount(victimOwner);
    nativeAccountMemory.recordEnrollment({
      account_id: victimOwner,
      partner_id: PARTNER,
      application_id: APP,
    });

    const issued = await issuePartnerMembershipRecoveryAttestation({
      accountId: attacker,
      partnerId: PARTNER,
      applicationId: APP,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const grant = await grantPartnerMembershipByInvitation({
      accountId: attacker,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "Attacker attempting foreign application access",
      approverActorId: "platform_operator",
      recoveryAttestationToken: issued.attestationToken,
    });
    expect(grant).toEqual({ ok: false, code: "application_entitlement_conflict" });
  });

  it("blocks unbound application grant without admin ownership approval token", async () => {
    const requester = createNativeAccountId();
    nativeAccountMemory.insertAccount(requester);

    const issued = await issuePartnerMembershipRecoveryAttestation({
      accountId: requester,
      partnerId: PARTNER,
      applicationId: APP,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const grant = await grantPartnerMembershipByInvitation({
      accountId: requester,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "Unbound app without ownership approval",
      approverActorId: "platform_operator",
      recoveryAttestationToken: issued.attestationToken,
    });
    expect(grant).toEqual({ ok: false, code: "admin_ownership_approval_required" });
  });

  it("allows grant after admin ownership review for unbound application", async () => {
    const requester = createNativeAccountId();
    nativeAccountMemory.insertAccount(requester);

    const issued = await issuePartnerMembershipRecoveryAttestation({
      accountId: requester,
      partnerId: PARTNER,
      applicationId: APP,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const verified = await verifyPartnerMembershipRecoveryAttestationToken(issued.attestationToken);
    expect(verified).toBeTruthy();

    const approval = await issueAdminRecoveryOwnershipApproval({
      verifiedAttestation: verified!,
      approverActorId: "platform_operator",
      reason: "Reviewed provisioning audit — founder identity matched out of band",
    });
    expect(approval.ok).toBe(true);
    if (!approval.ok) return;

    const grant = await grantPartnerMembershipByInvitation({
      accountId: requester,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "Authorized recovery after ownership review",
      approverActorId: "platform_operator",
      recoveryAttestationToken: issued.attestationToken,
      adminOwnershipApprovalToken: approval.adminOwnershipApprovalToken,
    });
    expect(grant.ok).toBe(true);
  });

  it("rejects expired recovery attestation at verification", async () => {
    vi.useFakeTimers();
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const issued = await issuePartnerMembershipRecoveryAttestation({
      accountId,
      partnerId: PARTNER,
      applicationId: APP,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    vi.advanceTimersByTime(16 * 60 * 1000);
    const verified = await verifyPartnerMembershipRecoveryAttestationToken(issued.attestationToken);
    expect(verified).toBeNull();
    vi.useRealTimers();
  });
});
