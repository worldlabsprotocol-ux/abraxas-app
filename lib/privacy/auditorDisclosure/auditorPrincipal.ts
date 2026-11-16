// FILE: lib/privacy/auditorDisclosure/auditorPrincipal.ts
// Individual auditor credentials — registry-bound partner API key sessions (UUID ids).

import type { NextRequest } from "next/server";
import {
  requirePartnerConsoleSession,
  resolvePartnerConsoleSessionKeyId,
  type PartnerConsoleSession,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
import {
  AUDITOR_DISCLOSURE_PURPOSES,
  INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS,
  type AuditorDisclosurePurpose,
} from "./contract";
import { resolveInstitutionalTenantId } from "./institutionalTenant";

export type InstitutionalAuditorPrincipal = {
  auditor_credential_id: string;
  tenant_id: string;
  audience_hash: string;
  allowed_purposes: readonly AuditorDisclosurePurpose[];
  partner_id: string;
  session_key_id: string;
};

export type AuditorAccessRegistryEntry = {
  credential_class: typeof INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS;
  partner_id: string;
  session_key_id: string;
  auditor_credential_id: string;
  tenant_id?: string;
  audience_hash: string;
  allowed_purposes: AuditorDisclosurePurpose[];
};

const NATIVE_ACCOUNT_SESSION_KEY_PREFIX = "native_account:" as const;

const PARTNER_API_KEY_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNativePartnerOperatorSessionKey(sessionKeyId: string): boolean {
  return sessionKeyId.startsWith(NATIVE_ACCOUNT_SESSION_KEY_PREFIX);
}

function isValidPurpose(value: unknown): value is AuditorDisclosurePurpose {
  return typeof value === "string" && (AUDITOR_DISCLOSURE_PURPOSES as readonly string[]).includes(value);
}

function isValidRegistryEntry(row: unknown): row is AuditorAccessRegistryEntry {
  if (!row || typeof row !== "object") return false;
  const entry = row as AuditorAccessRegistryEntry;
  return entry.credential_class === INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS
    && typeof entry.partner_id === "string"
    && entry.partner_id.length > 0
    && typeof entry.session_key_id === "string"
    && entry.session_key_id.length > 0
    && typeof entry.auditor_credential_id === "string"
    && entry.auditor_credential_id.length > 0
    && typeof entry.audience_hash === "string"
    && entry.audience_hash.length > 0
    && Array.isArray(entry.allowed_purposes)
    && entry.allowed_purposes.length > 0
    && entry.allowed_purposes.every(isValidPurpose);
}

export function parseAuditorAccessRegistry(env: Record<string, string | undefined>): AuditorAccessRegistryEntry[] {
  const raw = env.ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRegistryEntry);
  } catch {
    return [];
  }
}

function mapCredentialDispositionToReason(
  disposition: "revoked" | "missing" | "partner_mismatch" | "unavailable",
):
  | "institutional_auditor_credential_revoked"
  | "institutional_auditor_credential_missing"
  | "institutional_auditor_credential_partner_mismatch"
  | "institutional_auditor_credential_status_unavailable" {
  switch (disposition) {
    case "revoked":
      return "institutional_auditor_credential_revoked";
    case "missing":
      return "institutional_auditor_credential_missing";
    case "partner_mismatch":
      return "institutional_auditor_credential_partner_mismatch";
    default:
      return "institutional_auditor_credential_status_unavailable";
  }
}

async function assertAuthoritativeAuditorApiKeyCredential(
  session: PartnerConsoleSession,
  sessionKeyId: string,
): Promise<
  | { ok: true }
  | { ok: false; reason: string; status: 403 }
> {
  const authKind = session.authKind ?? (session.accountId ? "account" : "api_key");
  if (authKind !== "api_key") {
    return { ok: false, reason: "institutional_auditor_account_session_not_permitted", status: 403 };
  }
  if (session.apiKeyId && session.apiKeyId !== sessionKeyId) {
    return { ok: false, reason: "institutional_auditor_session_identity_unavailable", status: 401 };
  }
  if (!PARTNER_API_KEY_UUID.test(sessionKeyId)) {
    return { ok: false, reason: "institutional_auditor_session_key_malformed", status: 403 };
  }
  if (!launchpadUsesSovereignPostgres()) {
    return { ok: false, reason: "institutional_auditor_credential_status_unavailable", status: 403 };
  }
  const { pgResolvePartnerApiKeyForAuditorCredential } = await import(
    "@/lib/partner/launchpad/sovereign/launchpadPgStore"
  );
  const resolved = await pgResolvePartnerApiKeyForAuditorCredential({
    keyId: sessionKeyId,
    expectedPartnerId: session.partnerId,
  });
  if (!resolved.ok) {
    return {
      ok: false,
      reason: mapCredentialDispositionToReason(resolved.disposition),
      status: 403,
    };
  }
  return { ok: true };
}

export async function resolveInstitutionalAuditorPrincipal(
  req: NextRequest,
  env: Record<string, string | undefined> = process.env,
): Promise<
  | { ok: true; principal: InstitutionalAuditorPrincipal }
  | { ok: false; reason: string; status: 401 | 403 }
> {
  const sessionAuth = await requirePartnerConsoleSession(req);
  if (!sessionAuth.ok) {
    return { ok: false, reason: "institutional_auditor_session_required", status: sessionAuth.status };
  }

  const sessionKeyId = resolvePartnerConsoleSessionKeyId(sessionAuth.session);
  if (!sessionKeyId) {
    return { ok: false, reason: "institutional_auditor_session_identity_unavailable", status: 401 };
  }

  if (isNativePartnerOperatorSessionKey(sessionKeyId)) {
    return { ok: false, reason: "institutional_auditor_account_session_not_permitted", status: 403 };
  }

  const credential = await assertAuthoritativeAuditorApiKeyCredential(sessionAuth.session, sessionKeyId);
  if (!credential.ok) {
    return { ok: false, reason: credential.reason, status: credential.status };
  }

  const registry = parseAuditorAccessRegistry(env);
  const match = registry.find(
    (entry) => entry.partner_id === sessionAuth.session.partnerId && entry.session_key_id === sessionKeyId,
  );
  if (!match) {
    return { ok: false, reason: "institutional_auditor_not_authorized", status: 403 };
  }

  const tenantId = match.tenant_id?.trim()
    || resolveInstitutionalTenantId({ partnerId: sessionAuth.session.partnerId, env });

  return {
    ok: true,
    principal: {
      auditor_credential_id: match.auditor_credential_id,
      tenant_id: tenantId,
      audience_hash: match.audience_hash,
      allowed_purposes: match.allowed_purposes,
      partner_id: sessionAuth.session.partnerId,
      session_key_id: sessionKeyId,
    },
  };
}