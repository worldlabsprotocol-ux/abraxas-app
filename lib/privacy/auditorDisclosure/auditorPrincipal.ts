// FILE: lib/privacy/auditorDisclosure/auditorPrincipal.ts
// Binds authenticated Launchpad / institutional operator session to auditor mandate presenter id.

import type { NextRequest } from "next/server";
import {
  requirePartnerConsoleSession,
  resolvePartnerConsoleSessionKeyId,
} from "@/lib/partner/launchpad/partnerConsoleSession";
import type { AuditorDisclosurePurpose } from "./contract";
import { resolveInstitutionalTenantId } from "./institutionalTenant";

export type InstitutionalAuditorPrincipal = {
  auditor_id: string;
  tenant_id: string;
  audience_hash: string;
  allowed_purposes: readonly AuditorDisclosurePurpose[];
  partner_id: string;
  session_key_id: string;
};

type AuditorAccessRegistryEntry = {
  partner_id: string;
  session_key_id: string;
  auditor_id: string;
  tenant_id?: string;
  audience_hash: string;
  allowed_purposes: AuditorDisclosurePurpose[];
};

function parseAuditorAccessRegistry(env: Record<string, string | undefined>): AuditorAccessRegistryEntry[] {
  const raw = env.ABRAXAS_INSTITUTIONAL_AUDITOR_ACCESS_REGISTRY?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is AuditorAccessRegistryEntry => {
      return !!row
        && typeof row === "object"
        && typeof (row as AuditorAccessRegistryEntry).partner_id === "string"
        && typeof (row as AuditorAccessRegistryEntry).session_key_id === "string"
        && typeof (row as AuditorAccessRegistryEntry).auditor_id === "string"
        && typeof (row as AuditorAccessRegistryEntry).audience_hash === "string"
        && Array.isArray((row as AuditorAccessRegistryEntry).allowed_purposes);
    });
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
      auditor_id: match.auditor_id,
      tenant_id: tenantId,
      audience_hash: match.audience_hash,
      allowed_purposes: match.allowed_purposes,
      partner_id: sessionAuth.session.partnerId,
      session_key_id: sessionKeyId,
    },
  };
}