// FILE: lib/partner/trustExecution/institutionalAuthorityBinding.ts
// Launchpad is the source of sandbox application authority.
// The trust-execution store may hold one bound copy. It cannot grant authority on its own.

export type InstitutionalAuthorityCode =
  | "institutional_authority_missing"
  | "institutional_authority_conflict"
  | "institutional_authority_stale"
  | "institutional_authority_mismatch";

export type InstitutionalAuthorityRecord = {
  applicationId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  status: string;
  sourceRevision: string;
  environment: "sandbox";
};

export type InstitutionalAuthoritySync =
  | { ok: true; action: "bind" | "unchanged"; binding: InstitutionalAuthorityRecord }
  | { ok: false; code: InstitutionalAuthorityCode };

type LaunchpadAuthoritySource = {
  id?: string;
  partner_id?: string;
  policy_id?: string;
  policy_version?: number;
  status?: string;
  updated_at?: string;
  environment?: string;
} | null;

function revisionMillis(value: string): number | null {
  if (!value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function institutionalAuthorityFromLaunchpad(
  app: LaunchpadAuthoritySource,
): InstitutionalAuthorityRecord | null {
  if (!app || app.environment !== "sandbox") return null;
  if (!app.id?.trim() || !app.partner_id?.trim() || !app.policy_id?.trim()) return null;
  if (!app.status?.trim() || !app.updated_at?.trim()) return null;
  if (!Number.isInteger(app.policy_version) || (app.policy_version ?? 0) < 1) return null;
  return {
    applicationId: app.id.trim(),
    partnerId: app.partner_id.trim(),
    policyId: app.policy_id.trim(),
    policyVersion: app.policy_version as number,
    status: app.status.trim(),
    sourceRevision: app.updated_at.trim(),
    environment: "sandbox",
  };
}

export function agreeInstitutionalAuthority(input: {
  source: InstitutionalAuthorityRecord | null;
  sovereign: InstitutionalAuthorityRecord | null;
}): { ok: true; binding: InstitutionalAuthorityRecord } | { ok: false; code: InstitutionalAuthorityCode } {
  if (!input.source || !input.sovereign) {
    return { ok: false, code: "institutional_authority_missing" };
  }
  const source = input.source;
  const sovereign = input.sovereign;
  if (source.applicationId !== sovereign.applicationId) {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  if (source.partnerId !== sovereign.partnerId || source.policyId !== sovereign.policyId) {
    return { ok: false, code: "institutional_authority_conflict" };
  }
  if (source.policyVersion !== sovereign.policyVersion) {
    return { ok: false, code: "institutional_authority_stale" };
  }
  const sourceRevision = revisionMillis(source.sourceRevision);
  const sovereignRevision = revisionMillis(sovereign.sourceRevision);
  if (sourceRevision === null || sovereignRevision === null) {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  if (sourceRevision !== sovereignRevision) {
    return { ok: false, code: "institutional_authority_stale" };
  }
  if (source.status !== sovereign.status || source.status !== "active") {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  return { ok: true, binding: source };
}

/** Plans one application binding. A missing sovereign row can be bound. A conflicting row is not overwritten. */
export function planInstitutionalAuthoritySync(input: {
  authorizedApplicationId: string;
  source: InstitutionalAuthorityRecord | null;
  sovereign: InstitutionalAuthorityRecord | null;
}): InstitutionalAuthoritySync {
  if (!input.source) return { ok: false, code: "institutional_authority_missing" };
  if (input.source.applicationId !== input.authorizedApplicationId.trim()) {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  if (input.source.status !== "active") {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  if (!input.sovereign) return { ok: true, action: "bind", binding: input.source };
  const agreed = agreeInstitutionalAuthority({ source: input.source, sovereign: input.sovereign });
  if (!agreed.ok) return agreed;
  return { ok: true, action: "unchanged", binding: agreed.binding };
}

export function challengeAgreesWithAuthority(input: {
  authority: InstitutionalAuthorityRecord;
  challenge: {
    partnerId: string;
    applicationId: string;
    policyId: string;
    policyVersion: number;
  };
}): { ok: true } | { ok: false; code: InstitutionalAuthorityCode } {
  if (
    input.challenge.partnerId !== input.authority.partnerId
    || input.challenge.applicationId !== input.authority.applicationId
  ) {
    return { ok: false, code: "institutional_authority_mismatch" };
  }
  if (
    input.challenge.policyId !== input.authority.policyId
    || input.challenge.policyVersion !== input.authority.policyVersion
  ) {
    return { ok: false, code: "institutional_authority_stale" };
  }
  return { ok: true };
}
