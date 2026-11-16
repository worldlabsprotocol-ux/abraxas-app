// FILE: lib/privacy/auditorDisclosure/auditorPrincipal.ts
// Individual auditor credentials — not inherited from generic institutional operator sessions.

import type { NextRequest } from "next/server";
import {
  requirePartnerConsoleSession,
  resolvePartnerConsoleSessionKeyId,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import {
  assertIndividualAuditorCredentialSessionKey,
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

function isValidRegistryEntry(row: unknown): row is AuditorAccessRegistryEntry {
  if (!row || typeof row !== "object") return false;
  const entry = row as AuditorAccessRegistryEntry;
  return entry.credential_class === INSTITUTIONAL_AUDITOR_CREDENTIAL_CLASS
    && typeof entry.partner_id === "string"
    && typeof entry.session_key_id === "string"
    && typeof entry.auditor_credential_id === "string"
    && typeof entry.audience_hash === "string"
    && Array.isArray(entry.allowed_purposes)
    && assertIndividualAuditorCredentialSessionKey(entry.session_key_id) === true;
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

  const individual = assertIndividualAuditorCredentialSessionKey(sessionKeyId);
  if (individual !== true) {
    return { ok: false, reason: individual.reason, status: 403 };
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