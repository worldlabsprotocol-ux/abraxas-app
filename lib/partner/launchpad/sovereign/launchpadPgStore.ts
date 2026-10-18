// FILE: lib/partner/launchpad/sovereign/launchpadPgStore.ts

import { queryAbraxasPg } from "@/lib/persistence/pgPool";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

function mapApplicationRow(row: Record<string, unknown>): LaunchpadApplicationRow {
  return {
    id: String(row.id),
    public_slug: String(row.public_slug),
    partner_id: String(row.partner_id),
    application_name: String(row.application_name),
    display_name: String(row.display_name),
    environment: row.environment as LaunchpadApplicationRow["environment"],
    policy_id: String(row.policy_id),
    policy_version: Number(row.policy_version),
    policy_template_id: String(row.policy_template_id),
    allowed_return_urls: (row.allowed_return_urls as string[]) ?? [],
    api_key_id: row.api_key_id ? String(row.api_key_id) : null,
    production_api_key_id: null,
    production_key_revealed_at: null,
    status: row.status as LaunchpadApplicationRow["status"],
    idempotency_key: row.idempotency_key ? String(row.idempotency_key) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function pgGetLaunchpadApplicationById(
  applicationId: string,
): Promise<LaunchpadApplicationRow | null> {
  const { rows } = await queryAbraxasPg(
    `select * from public.partner_launchpad_applications where id = $1::uuid limit 1`,
    [applicationId],
  );
  return rows[0] ? mapApplicationRow(rows[0]) : null;
}

export async function pgListLaunchpadApplicationsForPartner(
  partnerId: string,
): Promise<LaunchpadApplicationRow[]> {
  const { rows } = await queryAbraxasPg(
    `select * from public.partner_launchpad_applications
      where partner_id = $1
      order by created_at desc`,
    [partnerId],
  );
  return rows.map((row) => mapApplicationRow(row));
}

export async function pgGetPartnerCompany(partnerId: string): Promise<{
  company: string;
  allowed_environments: string[];
} | null> {
  const { rows } = await queryAbraxasPg<{ company: string; allowed_environments: string[] }>(
    `select company, allowed_environments from public.partners where partner_id = $1`,
    [partnerId],
  );
  return rows[0] ?? null;
}

export async function pgGetApiKeyPrefixes(
  keyIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (keyIds.length === 0) return map;
  const { rows } = await queryAbraxasPg<{ id: string; key_prefix: string; revoked_at: string | null }>(
    `select id, key_prefix, revoked_at from public.partner_api_keys where id = any($1::uuid[])`,
    [keyIds],
  );
  for (const row of rows) {
    if (!row.revoked_at) map.set(row.id, row.key_prefix);
  }
  return map;
}

export async function pgInsertSandboxAuditEvent(input: {
  accountId: string;
  partnerId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.abraxas_sandbox_audit_events (account_id, partner_id, event_type, metadata)
     values ($1, $2, $3, $4::jsonb)`,
    [input.accountId, input.partnerId, input.eventType, JSON.stringify(input.metadata ?? {})],
  );
}
