import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { resetNativeAccountMemory, nativeAccountMemory } from "@/lib/auth/nativeAccount/memoryStore";
import { createNativeAccountId } from "@/lib/auth/nativeAccount/subjectId";
import { issueAccountSessionToken, ACCOUNT_SESSION_COOKIE } from "@/lib/auth/accountSession";
import { grantPartnerMembershipByInvitation } from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";
import {
  issuePartnerMembershipRecoveryAttestation,
  verifyPartnerMembershipRecoveryAttestationToken,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { issueAdminRecoveryOwnershipApproval } from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval";
import {
  issuePartnerConsoleSessionToken,
  resolvePartnerConsoleSession,
  PARTNER_CONSOLE_SESSION_COOKIE,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import { POST as mintAttestationPOST } from "@/app/api/auth/native/partner-membership-recovery-attestation/route";

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: vi.fn(async () => ({
    partner_id: "tenant-recovery",
    environment: "sandbox",
  })),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => "audit_test_id"),
}));

describe("partner membership recovery (memory)", () => {
  const partnerId = "tenant-recovery";
  const applicationId = "fbea93d2-6660-428d-85c3-8c4e12d89b05";

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

  it("mints attestation from native session and completes admin grant", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const sessionToken = await issueAccountSessionToken(accountId);
    expect(sessionToken).toBeTruthy();

    const mintReq = new NextRequest("http://localhost/api/auth/native/partner-membership-recovery-attestation", {
      method: "POST",
      headers: { cookie: `${ACCOUNT_SESSION_COOKIE}=${sessionToken}` },
      body: JSON.stringify({ partner_id: partnerId, application_id: applicationId }),
    });
    const mintRes = await mintAttestationPOST(mintReq);
    expect(mintRes.status).toBe(200);
    const mintBody = await mintRes.json();
    expect(mintBody.account_id).toBe(accountId);
    expect(typeof mintBody.recovery_attestation).toBe("string");

    const verified = await verifyPartnerMembershipRecoveryAttestationToken(mintBody.recovery_attestation);
    expect(verified).toBeTruthy();
    const ownershipApproval = await issueAdminRecoveryOwnershipApproval({
      verifiedAttestation: verified!,
      approverActorId: "platform_operator",
      reason: "Integration test — provisioning review recorded",
    });
    expect(ownershipApproval.ok).toBe(true);

    const grant = await grantPartnerMembershipByInvitation({
      accountId,
      partnerId,
      applicationId,
      reason: "Integration test recovery grant",
      approverActorId: "platform_operator",
      recoveryAttestationToken: mintBody.recovery_attestation,
      adminOwnershipApprovalToken: ownershipApproval.ok
        ? ownershipApproval.adminOwnershipApprovalToken
        : undefined,
    });
    expect(grant.ok).toBe(true);
    if (!grant.ok) return;
    expect(grant.alreadyMember).toBe(false);
    expect(grant.role).toBe("operator");

    const consoleToken = await issuePartnerConsoleSessionToken({
      partnerId,
      environment: "sandbox",
      authKind: "account",
      accountId,
      membershipRole: "operator",
    });
    const consoleReq = new NextRequest("http://localhost/", {
      headers: { cookie: `${PARTNER_CONSOLE_SESSION_COOKIE}=${consoleToken}` },
    });
    const consoleSession = await resolvePartnerConsoleSession(consoleReq);
    expect(consoleSession?.partnerId).toBe(partnerId);

    nativeAccountMemory.revokeMembership(accountId, partnerId);
    const afterRevoke = await resolvePartnerConsoleSession(consoleReq);
    expect(afterRevoke).toBeNull();
  });

  it("rejects a consumed attestation when membership is not yet granted", async () => {
    const accountId = createNativeAccountId();
    nativeAccountMemory.insertAccount(accountId);
    const issued = await issuePartnerMembershipRecoveryAttestation({
      accountId,
      partnerId,
      applicationId,
    });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;

    const verified = await verifyPartnerMembershipRecoveryAttestationToken(issued.attestationToken);
    expect(verified).toBeTruthy();
    expect(nativeAccountMemory.consumeRecoveryAttestation(verified!)).toBe(true);

    const grant = await grantPartnerMembershipByInvitation({
      accountId,
      partnerId,
      applicationId,
      reason: "Should fail because attestation already consumed",
      approverActorId: "platform_operator",
      recoveryAttestationToken: issued.attestationToken,
    });
    expect(grant.ok).toBe(false);
    if (grant.ok) return;
    expect([
      "recovery_attestation_already_consumed_or_expired",
      "admin_ownership_approval_required",
    ]).toContain(grant.code);
  });
});
