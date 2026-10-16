// FILE: lib/institutionalVerification/sdkDistributionEntitlement.ts
// Operator-controlled partner entitlements for institutional SDK delivery (Build #588 access review).

export type InstitutionalSdkEntitlementStatus =
  | "granted"
  | "not_granted"
  | "revoked"
  | "expired"
  | "version_mismatch"
  | "application_not_entitled";

export type InstitutionalSdkEntitlementDecision =
  | {
      ok: true;
      status: "granted";
      partner_id: string;
      package_version: string;
    }
  | {
      ok: false;
      status: Exclude<InstitutionalSdkEntitlementStatus, "granted">;
      code: string;
    };

export type InstitutionalSdkEntitlementRecord = {
  partner_id: string;
  package_version: string;
  expires_at?: string | null;
  revoked?: boolean;
  application_ids?: string[] | null;
};

const ENTITLEMENTS_ENV = "INSTITUTIONAL_SDK_DISTRIBUTION_ENTITLEMENTS";
const REVOKED_PARTNERS_ENV = "INSTITUTIONAL_SDK_DISTRIBUTION_REVOKED_PARTNERS";

/** Launchpad application IDs used in entitlement config and download evaluation. */
const APPLICATION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function normalizePartnerId(value: string): string {
  return value.trim();
}

function normalizeApplicationId(value: string): string {
  return value.trim();
}

function isWellFormedApplicationId(value: string): boolean {
  const normalized = normalizeApplicationId(value);
  if (!normalized || normalized !== value.trim()) return false;
  return APPLICATION_ID_PATTERN.test(normalized);
}

type ParsedApplicationIds =
  | { ok: true; applicationIds: string[] | null }
  | { ok: false; code: "entitlements_parse_failed" };

function parseEntitlementApplicationIds(value: unknown): ParsedApplicationIds {
  if (value === undefined || value === null) {
    return { ok: true, applicationIds: null };
  }
  if (!Array.isArray(value)) {
    return { ok: false, code: "entitlements_parse_failed" };
  }
  if (value.length === 0) {
    return { ok: true, applicationIds: [] };
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !isWellFormedApplicationId(entry)) {
      return { ok: false, code: "entitlements_parse_failed" };
    }
    const normalized = normalizeApplicationId(entry);
    if (seen.has(normalized)) {
      return { ok: false, code: "entitlements_parse_failed" };
    }
    seen.add(normalized);
    ids.push(normalized);
  }
  return { ok: true, applicationIds: ids };
}

function parseRevokedPartnerSet(env: Record<string, string | undefined>): Set<string> {
  const raw = env[REVOKED_PARTNERS_ENV]?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((part) => normalizePartnerId(part))
      .filter(Boolean),
  );
}

export function parseInstitutionalSdkEntitlements(
  env: Record<string, string | undefined> = process.env,
): InstitutionalSdkEntitlementRecord[] | { ok: false; code: "entitlements_parse_failed" } {
  const raw = env[ENTITLEMENTS_ENV]?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { ok: false, code: "entitlements_parse_failed" };
    const records: InstitutionalSdkEntitlementRecord[] = [];
    const partnerIdsSeen = new Set<string>();
    for (const row of parsed) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        return { ok: false, code: "entitlements_parse_failed" };
      }
      const record = row as Record<string, unknown>;
      if (typeof record.partner_id !== "string" || !record.partner_id.trim()) {
        return { ok: false, code: "entitlements_parse_failed" };
      }
      if (typeof record.package_version !== "string" || !record.package_version.trim()) {
        return { ok: false, code: "entitlements_parse_failed" };
      }
      const applicationIdsParsed = parseEntitlementApplicationIds(record.application_ids);
      if (!applicationIdsParsed.ok) {
        return { ok: false, code: applicationIdsParsed.code };
      }
      const partner_id = normalizePartnerId(record.partner_id);
      if (partnerIdsSeen.has(partner_id)) {
        return { ok: false, code: "entitlements_parse_failed" };
      }
      partnerIdsSeen.add(partner_id);
      records.push({
        partner_id,
        package_version: record.package_version.trim(),
        expires_at: typeof record.expires_at === "string" ? record.expires_at : null,
        revoked: record.revoked === true,
        application_ids: applicationIdsParsed.applicationIds,
      });
    }
    return records;
  } catch {
    return { ok: false, code: "entitlements_parse_failed" };
  }
}

export function evaluateInstitutionalSdkEntitlement(input: {
  partnerId: string;
  packageVersion: string;
  applicationId: string;
  env?: Record<string, string | undefined>;
  now?: Date;
}): InstitutionalSdkEntitlementDecision {
  const env = input.env ?? process.env;
  const partnerId = normalizePartnerId(input.partnerId);
  const packageVersion = input.packageVersion.trim();
  const revokedPartners = parseRevokedPartnerSet(env);

  if (!isWellFormedApplicationId(input.applicationId)) {
    return {
      ok: false,
      status: "application_not_entitled",
      code: "institutional_sdk_application_id_invalid",
    };
  }

  if (revokedPartners.has(partnerId)) {
    return { ok: false, status: "revoked", code: "institutional_sdk_entitlement_revoked" };
  }

  const parsed = parseInstitutionalSdkEntitlements(env);
  if (!Array.isArray(parsed)) {
    return { ok: false, status: "not_granted", code: "institutional_sdk_entitlement_unconfigured" };
  }

  const match = parsed.find((row) => row.partner_id === partnerId);
  if (!match) {
    return { ok: false, status: "not_granted", code: "institutional_sdk_entitlement_not_granted" };
  }

  if (match.revoked) {
    return { ok: false, status: "revoked", code: "institutional_sdk_entitlement_revoked" };
  }

  if (match.package_version !== packageVersion) {
    return { ok: false, status: "version_mismatch", code: "institutional_sdk_entitlement_version_mismatch" };
  }

  if (match.expires_at) {
    const expiresMs = Date.parse(match.expires_at);
    const nowMs = (input.now ?? new Date()).getTime();
    if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) {
      return { ok: false, status: "expired", code: "institutional_sdk_entitlement_expired" };
    }
  }

  if (Array.isArray(match.application_ids)) {
    if (match.application_ids.length === 0) {
      return {
        ok: false,
        status: "application_not_entitled",
        code: "institutional_sdk_entitlement_application_scope_empty",
      };
    }
    const applicationId = normalizeApplicationId(input.applicationId);
    if (!match.application_ids.includes(applicationId)) {
      return {
        ok: false,
        status: "application_not_entitled",
        code: "institutional_sdk_application_not_entitled",
      };
    }
  }

  return { ok: true, status: "granted", partner_id: partnerId, package_version: packageVersion };
}
