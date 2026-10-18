// FILE: lib/partner/launchpad/sovereign/credentialOpsPg.ts
import "server-only";

import { withAbraxasPgTransaction } from "@/lib/persistence/pgPool";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import type { CredentialOpResult } from "@/lib/partner/launchpad/credentialOps";
import { pgGetLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/sovereign/launchpadPgStore";
import { pgInsertLaunchpadActivity } from "@/lib/partner/launchpad/sovereign/launchpadPgStore";

export async function pgRotateLaunchpadCredential(
  applicationId: string,
  partnerId: string,
): Promise<CredentialOpResult> {
  const app = await pgGetLaunchpadApplicationForPartner(applicationId, partnerId);
  if (!app) return { ok: false, code: "not_found" };

  const { raw, prefix, hash } = generatePartnerKey("test");

  try {
    const newKeyId = await withAbraxasPgTransaction(async (client) => {
      const insert = await client.query<{ id: string }>(
        `insert into public.partner_api_keys (partner_id, display_name, key_prefix, key_hash, scopes)
         values ($1, $2, $3, $4, $5::text[])
         returning id`,
        [
          partnerId,
          `${app.display_name} sandbox (rotated)`,
          prefix,
          hash,
          ["verify:credential", "verify:registry", "webhooks:read"],
        ],
      );
      const newId = insert.rows[0]?.id;
      if (!newId) throw new Error("rotate_insert_failed");

      if (app.api_key_id) {
        await client.query(
          `update public.partner_api_keys set revoked_at = now()
           where id = $1::uuid and partner_id = $2`,
          [app.api_key_id, partnerId],
        );
      }

      const updated = await client.query(
        `update public.partner_launchpad_applications
            set api_key_id = $1::uuid, updated_at = now()
          where id = $2::uuid and partner_id = $3`,
        [newId, applicationId, partnerId],
      );
      if (updated.rowCount !== 1) throw new Error("rotate_app_update_failed");
      return newId;
    });

    await pgInsertLaunchpadActivity({
      applicationId,
      partnerId,
      eventType: "credential_rotated",
      publicCode: "rotated",
      metadata: { key_prefix: prefix },
    });

    return { ok: true, api_key: raw, key_prefix: prefix, api_key_id: newKeyId };
  } catch (err) {
    console.error("[launchpad/credential/pg] rotate failed", err);
    return { ok: false, code: "rotate_failed" };
  }
}

export async function pgRevokeLaunchpadCredential(
  applicationId: string,
  partnerId: string,
): Promise<{ ok: true } | { ok: false; code: "not_found" | "revoke_failed" }> {
  const app = await pgGetLaunchpadApplicationForPartner(applicationId, partnerId);
  if (!app?.api_key_id) return { ok: false, code: "not_found" };

  try {
    await withAbraxasPgTransaction(async (client) => {
      const revoked = await client.query(
        `update public.partner_api_keys set revoked_at = now()
         where id = $1::uuid and partner_id = $2 and revoked_at is null`,
        [app.api_key_id, partnerId],
      );
      if (revoked.rowCount !== 1) throw new Error("revoke_failed");
    });
    await pgInsertLaunchpadActivity({
      applicationId,
      partnerId,
      eventType: "credential_revoked",
      publicCode: "revoked",
    });
    return { ok: true };
  } catch (err) {
    console.error("[launchpad/credential/pg] revoke failed", err);
    return { ok: false, code: "revoke_failed" };
  }
}
