// FILE: lib/partner/launchpad/credentialOps.ts
// Sandbox credential rotation and revocation for Partner Launchpad applications.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { generatePartnerKey } from "@/lib/partner/partnerAuth";
import { recordLaunchpadActivity } from "@/lib/partner/launchpad/recordActivity";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";

export type CredentialOpResult =
  | { ok: true; api_key: string; key_prefix: string; api_key_id: string }
  | { ok: false; code: "not_found" | "revoke_failed" | "rotate_failed" | "not_configured" };

export async function rotateLaunchpadCredential(
  applicationId: string,
  partnerId: string,
): Promise<CredentialOpResult> {
  const sb = requireSupabaseAdmin();
  const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
  if (!app) return { ok: false, code: "not_found" };

  const { raw, prefix, hash } = generatePartnerKey("test");

  const { data: newKey, error: insertError } = await sb
    .from("partner_api_keys")
    .insert({
      partner_id: partnerId,
      display_name: `${app.display_name} sandbox (rotated)`,
      key_prefix: prefix,
      key_hash: hash,
      scopes: ["verify:credential", "verify:registry", "webhooks:read"],
    })
    .select("id")
    .single();

  if (insertError || !newKey) {
    console.error("[launchpad/credential] rotate insert failed", { message: insertError?.message });
    return { ok: false, code: "rotate_failed" };
  }

  if (app.api_key_id) {
    await sb
      .from("partner_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", app.api_key_id)
      .eq("partner_id", partnerId);
  }

  const { error: updateError } = await sb
    .from("partner_launchpad_applications")
    .update({ api_key_id: newKey.id, updated_at: new Date().toISOString() })
    .eq("id", applicationId)
    .eq("partner_id", partnerId);

  if (updateError) {
    console.error("[launchpad/credential] rotate app update failed", { message: updateError.message });
    return { ok: false, code: "rotate_failed" };
  }

  await recordLaunchpadActivity(sb, {
    applicationId,
    partnerId,
    eventType: "credential_rotated",
    publicCode: "rotated",
    metadata: { key_prefix: prefix },
  });

  return { ok: true, api_key: raw, key_prefix: prefix, api_key_id: newKey.id };
}

export async function revokeLaunchpadCredential(
  applicationId: string,
  partnerId: string,
): Promise<{ ok: true } | { ok: false; code: "not_found" | "revoke_failed" }> {
  const sb = requireSupabaseAdmin();
  const app = await getLaunchpadApplicationForPartner(applicationId, partnerId);
  if (!app || !app.api_key_id) return { ok: false, code: "not_found" };

  const { error } = await sb
    .from("partner_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", app.api_key_id)
    .eq("partner_id", partnerId);

  if (error) {
    console.error("[launchpad/credential] revoke failed", { message: error.message });
    return { ok: false, code: "revoke_failed" };
  }

  await recordLaunchpadActivity(sb, {
    applicationId,
    partnerId,
    eventType: "credential_revoked",
    publicCode: "revoked",
  });

  return { ok: true };
}
