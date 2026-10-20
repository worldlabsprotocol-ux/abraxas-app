// FILE: lib/partner/launchpad/sovereign/launchpadPgStore.ts
import "server-only";

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

export async function pgGetLaunchpadApplicationBySlug(
  publicSlug: string,
): Promise<LaunchpadApplicationRow | null> {
  const { rows } = await queryAbraxasPg(
    `select * from public.partner_launchpad_applications where public_slug = $1 limit 1`,
    [publicSlug],
  );
  return rows[0] ? mapApplicationRow(rows[0]) : null;
}

export async function pgGetLaunchpadApplicationForPartner(
  applicationId: string,
  partnerId: string,
): Promise<LaunchpadApplicationRow | null> {
  const { rows } = await queryAbraxasPg(
    `select * from public.partner_launchpad_applications
      where id = $1::uuid and partner_id = $2 limit 1`,
    [applicationId, partnerId],
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

export async function pgInsertLaunchpadActivity(input: {
  applicationId: string;
  partnerId: string;
  eventType: string;
  publicCode?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await queryAbraxasPg(
    `insert into public.partner_launchpad_activity
      (application_id, partner_id, event_type, public_code, metadata)
     values ($1::uuid, $2, $3, $4, $5::jsonb)`,
    [
      input.applicationId,
      input.partnerId,
      input.eventType,
      input.publicCode ?? null,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
}

export async function pgListLaunchpadActivity(
  applicationId: string,
  partnerId: string,
  limit: number,
): Promise<
  Array<{
    id: string;
    event_type: string;
    public_code: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>
> {
  const { rows } = await queryAbraxasPg<{
    id: string;
    event_type: string;
    public_code: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
  }>(
    `select id, event_type, public_code, metadata, created_at
       from public.partner_launchpad_activity
      where application_id = $1::uuid and partner_id = $2
      order by created_at desc
      limit $3`,
    [applicationId, partnerId, limit],
  );
  return rows;
}

export async function pgUpdateApplicationReturnUrls(
  applicationId: string,
  partnerId: string,
  allowedReturnUrls: string[],
): Promise<void> {
  await queryAbraxasPg(
    `update public.partner_launchpad_applications
        set allowed_return_urls = $3, updated_at = now()
      where id = $1::uuid and partner_id = $2`,
    [applicationId, partnerId, allowedReturnUrls],
  );
  await queryAbraxasPg(
    `update public.partners set allowed_return_urls = $2, updated_at = now() where partner_id = $1`,
    [partnerId, allowedReturnUrls],
  );
}

export async function pgUpdateApplicationDetails(
  applicationId: string,
  partnerId: string,
  input: { display_name?: string; application_name?: string },
): Promise<LaunchpadApplicationRow | null> {
  const displayName = input.display_name?.trim();
  const applicationName = input.application_name?.trim();
  if (!displayName && !applicationName) {
    return pgGetLaunchpadApplicationForPartner(applicationId, partnerId);
  }
  const { rows } = await queryAbraxasPg(
    `update public.partner_launchpad_applications
        set display_name = coalesce($3, display_name),
            application_name = coalesce($4, application_name),
            updated_at = now()
      where id = $1::uuid and partner_id = $2
      returning *`,
    [applicationId, partnerId, displayName ?? null, applicationName ?? null],
  );
  return rows[0] ? mapApplicationRow(rows[0]) : null;
}

export async function pgGetSignedReceiptForApplication(input: {
  applicationId: string;
  partnerId: string;
  receiptId: string;
}): Promise<{
  receipt_id: string;
  public_payload: Record<string, unknown>;
  signature: string;
  expires_at: string;
  revoked_at: string | null;
} | null> {
  const { rows } = await queryAbraxasPg<{
    receipt_id: string;
    public_payload: Record<string, unknown>;
    signature: string;
    expires_at: string;
    revoked_at: string | null;
  }>(
    `select receipt_id, public_payload, signature, expires_at, revoked_at
       from public.partner_launchpad_signed_receipts
      where receipt_id = $1 and application_id = $2::uuid and partner_id = $3
      limit 1`,
    [input.receiptId, input.applicationId, input.partnerId],
  );
  return rows[0] ?? null;
}

export async function pgLookupPartnerApiKeyByHash(keyHash: string): Promise<{
  id: string;
  partner_id: string;
  display_name: string;
  key_prefix: string;
  scopes: string[];
  revoked_at: string | null;
  launchpad_application_id: string | null;
} | null> {
  const { rows } = await queryAbraxasPg<{
    id: string;
    partner_id: string;
    display_name: string;
    key_prefix: string;
    scopes: string[];
    revoked_at: string | null;
    launchpad_application_id: string | null;
  }>(
    `select id, partner_id, display_name, key_prefix, scopes, revoked_at, launchpad_application_id
       from public.partner_api_keys where key_hash = $1 limit 1`,
    [keyHash],
  );
  return rows[0] ?? null;
}

export async function pgTouchPartnerApiKeyLastUsed(keyId: string): Promise<void> {
  await queryAbraxasPg(
    `update public.partner_api_keys set last_used_at = now() where id = $1::uuid`,
    [keyId],
  );
}

export async function pgGetApiKeyRevoked(keyId: string): Promise<boolean> {
  const { rows } = await queryAbraxasPg<{ revoked_at: string | null }>(
    `select revoked_at from public.partner_api_keys where id = $1::uuid limit 1`,
    [keyId],
  );
  return Boolean(rows[0]?.revoked_at);
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
