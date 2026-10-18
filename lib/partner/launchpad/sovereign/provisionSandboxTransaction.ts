// FILE: lib/partner/launchpad/sovereign/provisionSandboxTransaction.ts
// Sandbox provisioning via direct PostgreSQL transactions (no Supabase RPC).

import type { PoolClient } from "pg";
import type { ProvisionSandboxInput } from "@/lib/partner/launchpad/provisionSandbox";
import type { ProvisionSandboxResult } from "@/lib/partner/launchpad/types";
import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { SITE_URL } from "@/lib/siteUrl";

type ProvisionRow = {
  ok: boolean;
  code: string;
  application_id?: string;
  partner_id?: string;
  public_slug?: string;
  policy_id?: string;
  policy_version?: number;
  key_prefix?: string;
  api_key_id?: string;
};

async function provisionInTransaction(
  client: PoolClient,
  input: ProvisionSandboxInput & {
    partnerId: string;
    publicSlug: string;
    policyId: string;
    policyRules: Record<string, unknown>;
    keyPrefix: string;
    keyHash: string;
  },
): Promise<ProvisionRow> {
  if (input.idempotencyKey?.trim()) {
    const replay = await client.query<{
      id: string;
      partner_id: string;
      public_slug: string;
      policy_id: string;
      policy_version: number;
      api_key_id: string | null;
    }>(
      `select id, partner_id, public_slug, policy_id, policy_version, api_key_id
         from public.partner_launchpad_applications
        where idempotency_key = $1
        limit 1`,
      [input.idempotencyKey.trim()],
    );
    const existing = replay.rows[0];
    if (existing) {
      let keyPrefix = input.keyPrefix;
      if (existing.api_key_id) {
        const keyRow = await client.query<{ key_prefix: string }>(
          `select key_prefix from public.partner_api_keys where id = $1`,
          [existing.api_key_id],
        );
        keyPrefix = keyRow.rows[0]?.key_prefix ?? input.keyPrefix;
      }
      return {
        ok: true,
        code: "idempotency_replay",
        application_id: existing.id,
        partner_id: existing.partner_id,
        public_slug: existing.public_slug,
        policy_id: existing.policy_id,
        policy_version: existing.policy_version,
        key_prefix: keyPrefix,
        api_key_id: existing.api_key_id ?? undefined,
      };
    }
  }

  const partnerExists = await client.query(
    `select 1 from public.partners where partner_id = $1`,
    [input.partnerId],
  );

  if (partnerExists.rowCount === 0) {
    await client.query(
      `insert into public.partners (
         partner_id, company, status, allowed_environments, is_external, public_listing_ok, updated_at
       ) values ($1, $2, 'pilot', array['sandbox']::text[], true, false, now())`,
      [input.partnerId, input.displayName.trim()],
    );
  }

  await client.query(
    `insert into public.partner_policies (id, version, partner_id, name, status, rules_json, updated_at)
     values ($1, 1, $2, $3, 'active', $4::jsonb, now())
     on conflict (id, version) do nothing`,
    [input.policyId, input.partnerId, `${input.applicationName.trim()} policy`, JSON.stringify(input.policyRules)],
  );

  await client.query(
    `update public.partners
        set assigned_policy_id = $2,
            allowed_return_urls = (
              select array(
                select distinct unnest(
                  coalesce(allowed_return_urls, array[]::text[]) || array[$3::text]
                )
              )
            ),
            updated_at = now()
      where partner_id = $1`,
    [input.partnerId, input.policyId, input.returnUrl.trim()],
  );

  const keyInsert = await client.query<{ id: string }>(
    `insert into public.partner_api_keys (partner_id, display_name, key_prefix, key_hash, scopes)
     values ($1, $2, $3, $4, array['verify:credential', 'verify:registry', 'webhooks:read']::text[])
     returning id`,
    [input.partnerId, `${input.displayName.trim()} sandbox`, input.keyPrefix, input.keyHash],
  );
  const keyId = keyInsert.rows[0]?.id;
  if (!keyId) {
    return { ok: false, code: "provision_failed" };
  }

  const appInsert = await client.query<{ id: string }>(
    `insert into public.partner_launchpad_applications (
       public_slug, partner_id, application_name, display_name, environment,
       policy_id, policy_version, policy_template_id, allowed_return_urls,
       api_key_id, status, idempotency_key, updated_at
     ) values (
       $1, $2, $3, $4, 'sandbox', $5, 1, $6, array[$7::text], $8, 'active', $9, now()
     )
     returning id`,
    [
      input.publicSlug,
      input.partnerId,
      input.applicationName.trim(),
      input.displayName.trim(),
      input.policyId,
      input.policyTemplateId,
      input.returnUrl.trim(),
      keyId,
      input.idempotencyKey?.trim() || null,
    ],
  );
  const appId = appInsert.rows[0]?.id;
  if (!appId) {
    return { ok: false, code: "provision_failed" };
  }

  await client.query(
    `insert into public.partner_launchpad_activity (application_id, partner_id, event_type, public_code, metadata)
     values ($1, $2, 'application_provisioned', 'provisioned', $3::jsonb)`,
    [
      appId,
      input.partnerId,
      JSON.stringify({ policy_template_id: input.policyTemplateId, environment: "sandbox" }),
    ],
  );

  return {
    ok: true,
    code: "ok",
    application_id: appId,
    partner_id: input.partnerId,
    public_slug: input.publicSlug,
    policy_id: input.policyId,
    policy_version: 1,
    key_prefix: input.keyPrefix,
    api_key_id: keyId,
  };
}

export async function provisionSovereignLaunchpadSandbox(input: {
  provisionInput: ProvisionSandboxInput;
  partnerId: string;
  publicSlug: string;
  policyId: string;
  policyRules: Record<string, unknown>;
  keyPrefix: string;
  keyHash: string;
  rawApiKey: string;
}): Promise<
  | { ok: true; result: ProvisionSandboxResult; idempotencyReplay: boolean; apiKey?: string }
  | { ok: false; code: "provision_failed" | "conflict" }
> {
  try {
    const row = await withAbraxasPgTransaction((client) =>
      provisionInTransaction(client, {
        ...input.provisionInput,
        partnerId: input.partnerId,
        publicSlug: input.publicSlug,
        policyId: input.policyId,
        policyRules: input.policyRules,
        keyPrefix: input.keyPrefix,
        keyHash: input.keyHash,
      }),
    );

    if (!row.ok || !row.application_id || !row.partner_id || !row.public_slug) {
      if (row.code === "conflict") return { ok: false, code: "conflict" };
      return { ok: false, code: "provision_failed" };
    }

    const idempotencyReplay = row.code === "idempotency_replay";
    const hostedVerifyUrl = `${SITE_URL.replace(/\/$/, "")}/partner/verify?app=${encodeURIComponent(row.public_slug)}&return_url=${encodeURIComponent(input.provisionInput.returnUrl.trim())}`;

    return {
      ok: true,
      idempotencyReplay,
      apiKey: idempotencyReplay ? undefined : input.rawApiKey,
      result: {
        application_id: row.application_id,
        partner_id: row.partner_id,
        public_slug: row.public_slug,
        policy_id: row.policy_id ?? input.policyId,
        policy_version: row.policy_version ?? 1,
        api_key_id: row.api_key_id ?? "",
        api_key: idempotencyReplay ? "" : input.rawApiKey,
        key_prefix: row.key_prefix ?? input.keyPrefix,
        hosted_verify_url: hostedVerifyUrl,
      },
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return { ok: false, code: "conflict" };
    console.error("[launchpad/sovereign] provision failed", error);
    return { ok: false, code: "provision_failed" };
  }
}
