import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  grantPartnerMembershipByInvitation,
  isValidNativeAccountSubjectId,
  LAUNCHPAD_INVITATION_DEFAULT_ROLE,
} from "@/lib/auth/nativeAccount/partnerMembershipInvitationGrant";

vi.mock("@/lib/partner/launchpad/resolveLaunchpadApplication.server", () => ({
  getLaunchpadApplicationById: vi.fn(),
}));

vi.mock("@/lib/auth/nativeAccount/store", () => ({
  assertPartnerMembership: vi.fn(),
  getNativeAccountStatus: vi.fn(),
  insertPartnerMembershipIfAbsent: vi.fn(),
  recordMembershipGrant: vi.fn(),
  revokePartnerMembership: vi.fn(),
  NativeAccountStoreUnavailableError: class NativeAccountStoreUnavailableError extends Error {},
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation", () => ({
  verifyPartnerMembershipRecoveryAttestationToken: vi.fn(),
  consumeVerifiedRecoveryAttestation: vi.fn(),
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipInvitationEnvironment", () => ({
  assertPartnerMembershipInvitationEnvironment: vi.fn(() => ({ ok: true })),
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipRecoveryOwnership", () => ({
  resolveRecoveryOwnershipEntitlement: vi.fn(async () => ({
    kind: "server_verified_enrollment",
    basis: "sandbox_enrollment_match",
  })),
}));

vi.mock("@/lib/auth/nativeAccount/partnerMembershipRecoveryAdminApproval", () => ({
  verifyAdminRecoveryOwnershipApprovalToken: vi.fn(),
  consumeVerifiedAdminRecoveryApproval: vi.fn(),
}));

vi.mock("@/lib/verification/audit", () => ({
  appendAuditEvent: vi.fn(async () => "audit_123"),
}));

import { getLaunchpadApplicationById } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import {
  assertPartnerMembership,
  getNativeAccountStatus,
  insertPartnerMembershipIfAbsent,
  recordMembershipGrant,
  revokePartnerMembership,
} from "@/lib/auth/nativeAccount/store";
import {
  verifyPartnerMembershipRecoveryAttestationToken,
  consumeVerifiedRecoveryAttestation,
} from "@/lib/auth/nativeAccount/partnerMembershipRecoveryAttestation";
import { appendAuditEvent } from "@/lib/verification/audit";

const ACCOUNT = "abx_ac_e492f1a1789e8a1f8c99a3f051b0c22c";
const PARTNER = "studio-accept-wc-1792620888278-6a4a2447dfc8";
const APP = "fbea93d2-6660-428d-85c3-8c4e12d89b05";
const TOKEN = "signed-attestation-token";

const verified = {
  attestationId: "pmra_abc",
  accountId: ACCOUNT,
  partnerId: PARTNER,
  applicationId: APP,
};

describe("partnerMembershipInvitationGrant", () => {
  beforeEach(() => {
    vi.mocked(getLaunchpadApplicationById).mockReset();
    vi.mocked(assertPartnerMembership).mockReset();
    vi.mocked(getNativeAccountStatus).mockReset();
    vi.mocked(insertPartnerMembershipIfAbsent).mockReset();
    vi.mocked(recordMembershipGrant).mockReset();
    vi.mocked(revokePartnerMembership).mockReset();
    vi.mocked(verifyPartnerMembershipRecoveryAttestationToken).mockReset();
    vi.mocked(consumeVerifiedRecoveryAttestation).mockReset();
    vi.mocked(appendAuditEvent).mockReset();
    vi.mocked(appendAuditEvent).mockResolvedValue("audit_123");
    vi.mocked(getNativeAccountStatus).mockResolvedValue("active");
    vi.mocked(getLaunchpadApplicationById).mockResolvedValue({
      partner_id: PARTNER,
      environment: "sandbox",
    } as never);
    vi.mocked(verifyPartnerMembershipRecoveryAttestationToken).mockResolvedValue(verified);
    vi.mocked(consumeVerifiedRecoveryAttestation).mockResolvedValue(true);
  });

  it("validates account id format", () => {
    expect(isValidNativeAccountSubjectId(ACCOUNT)).toBe(true);
    expect(isValidNativeAccountSubjectId("abx_ac_short")).toBe(false);
  });

  it("requires a server recovery attestation token", async () => {
    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via native session attestation",
      approverActorId: "platform_operator",
      recoveryAttestationToken: "",
    });
    expect(result).toEqual({ ok: false, code: "recovery_attestation_required" });
  });

  it("rejects attestation mismatch with request body", async () => {
    vi.mocked(verifyPartnerMembershipRecoveryAttestationToken).mockResolvedValue({
      ...verified,
      accountId: "abx_ac_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via native session attestation",
      approverActorId: "platform_operator",
      recoveryAttestationToken: TOKEN,
    });
    expect(result).toEqual({ ok: false, code: "recovery_attestation_mismatch" });
  });

  it("grants operator membership without elevating on duplicate", async () => {
    vi.mocked(assertPartnerMembership).mockResolvedValue({ ok: false });
    vi.mocked(insertPartnerMembershipIfAbsent).mockResolvedValue(true);

    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via native session attestation",
      approverActorId: "platform_operator",
      recoveryAttestationToken: TOKEN,
    });

    expect(result).toMatchObject({
      ok: true,
      alreadyMember: false,
      role: LAUNCHPAD_INVITATION_DEFAULT_ROLE,
    });
    expect(insertPartnerMembershipIfAbsent).toHaveBeenCalledWith({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      role: "operator",
    });
    expect(recordMembershipGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        grantMethod: "invitation",
        metadata: expect.objectContaining({ attestation_id: "pmra_abc" }),
      }),
    );
  });

  it("returns alreadyMember without consuming attestation path side effects", async () => {
    vi.mocked(assertPartnerMembership).mockResolvedValue({ ok: true, role: "owner" });

    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via native session attestation",
      approverActorId: "platform_operator",
      recoveryAttestationToken: TOKEN,
    });

    expect(result).toMatchObject({ ok: true, alreadyMember: true, role: "owner" });
    expect(consumeVerifiedRecoveryAttestation).not.toHaveBeenCalled();
    expect(insertPartnerMembershipIfAbsent).not.toHaveBeenCalled();
  });

  it("rolls back membership when completion audit fails", async () => {
    vi.mocked(assertPartnerMembership).mockResolvedValue({ ok: false });
    vi.mocked(insertPartnerMembershipIfAbsent).mockResolvedValue(true);
    vi.mocked(appendAuditEvent)
      .mockResolvedValueOnce("pending_audit")
      .mockResolvedValueOnce(null);

    const result = await grantPartnerMembershipByInvitation({
      accountId: ACCOUNT,
      partnerId: PARTNER,
      applicationId: APP,
      reason: "founder verified via native session attestation",
      approverActorId: "platform_operator",
      recoveryAttestationToken: TOKEN,
    });

    expect(result).toEqual({ ok: false, code: "audit_completion_failed" });
    expect(revokePartnerMembership).toHaveBeenCalledWith(ACCOUNT, PARTNER);
  });
});
