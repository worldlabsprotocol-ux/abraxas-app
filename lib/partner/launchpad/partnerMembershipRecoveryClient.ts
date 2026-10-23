// FILE: lib/partner/launchpad/partnerMembershipRecoveryClient.ts

export type PartnerMembershipRecoveryPreview =
  | {
      ok: true;
      account_id: string;
      partner_id: string;
      application_id: string;
      membership_status: "already_linked";
      entitlement: { kind: "existing_membership" };
    }
  | {
      ok: true;
      account_id: string;
      partner_id: string;
      application_id: string;
      membership_status: "not_linked";
      entitlement: Record<string, unknown>;
    }
  | { ok: false; status: number; error: string };

export async function fetchPartnerMembershipRecoveryPreview(input: {
  applicationId: string;
  partnerId: string;
}): Promise<PartnerMembershipRecoveryPreview> {
  const params = new URLSearchParams({
    application_id: input.applicationId.trim(),
    partner_id: input.partnerId.trim(),
  });
  const res = await fetch(`/api/auth/native/partner-membership-recovery-preview?${params}`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = (await res.json()) as PartnerMembershipRecoveryPreview & { error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, status: res.status, error: data.error ?? "preview_failed" };
  }
  return data;
}

export type PartnerMembershipRecoveryAttestationResult =
  | {
      ok: true;
      account_id: string;
      partner_id: string;
      application_id: string;
      attestation_id: string;
      expires_at: string;
      recovery_attestation: string;
    }
  | { ok: false; status: number; error: string };

export async function requestPartnerMembershipRecoveryAttestation(input: {
  applicationId: string;
  partnerId: string;
}): Promise<PartnerMembershipRecoveryAttestationResult> {
  const res = await fetch("/api/auth/native/partner-membership-recovery-attestation", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      application_id: input.applicationId.trim(),
      partner_id: input.partnerId.trim(),
    }),
  });
  const data = (await res.json()) as PartnerMembershipRecoveryAttestationResult & { error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, status: res.status, error: data.error ?? "attestation_failed" };
  }
  return data;
}
