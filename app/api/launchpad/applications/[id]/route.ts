// FILE: app/api/launchpad/applications/[id]/route.ts

import { NextRequest } from "next/server";
import {
  launchpadError,
  launchpadJson,
  requireLaunchpadSession,
} from "@/lib/partner/launchpad/apiHelpers";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication.server";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

async function resolveKeyPrefix(app: { api_key_id: string | null }): Promise<string | null> {
  if (!app.api_key_id) return null;
  if (launchpadUsesSovereignPostgres()) {
    const { pgGetApiKeyPrefixes, pgGetApiKeyRevoked } = await import(
      "@/lib/partner/launchpad/sovereign/launchpadPgStore"
    );
    if (await pgGetApiKeyRevoked(app.api_key_id)) return null;
    const map = await pgGetApiKeyPrefixes([app.api_key_id]);
    return map.get(app.api_key_id) ?? null;
  }
  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const { data: key } = await sb
    .from("partner_api_keys")
    .select("key_prefix, revoked_at")
    .eq("id", app.api_key_id)
    .maybeSingle();
  if (key && !key.revoked_at) return key.key_prefix;
  return null;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }

  const keyPrefix = await resolveKeyPrefix(app);
  return launchpadJson({ ok: true, application: { ...app, key_prefix: keyPrefix } });
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;

  let body: { display_name?: string; application_name?: string };
  try {
    body = await req.json();
  } catch {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400);
  }

  if (launchpadUsesSovereignPostgres()) {
    const { pgUpdateApplicationDetails } = await import(
      "@/lib/partner/launchpad/sovereign/launchpadPgStore"
    );
    const updated = await pgUpdateApplicationDetails(params.id, auth.session.partnerId, body);
    if (!updated) {
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
    }
    const keyPrefix = await resolveKeyPrefix(updated);
    return launchpadJson({ ok: true, application: { ...updated, key_prefix: keyPrefix } });
  }

  const { requireSupabaseAdmin } = await import("@/lib/supabase/admin");
  const sb = requireSupabaseAdmin();
  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  if (body.display_name?.trim()) patch.display_name = body.display_name.trim();
  if (body.application_name?.trim()) patch.application_name = body.application_name.trim();
  const { data, error } = await sb
    .from("partner_launchpad_applications")
    .update(patch)
    .eq("id", params.id)
    .eq("partner_id", auth.session.partnerId)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);
  }
  const keyPrefix = await resolveKeyPrefix(data as { api_key_id: string | null });
  return launchpadJson({ ok: true, application: { ...data, key_prefix: keyPrefix } });
}
