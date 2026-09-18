// FILE: app/api/launchpad/applications/[id]/domain-verification/route.ts

import { NextRequest } from "next/server";
import { promises as dns } from "dns";
import { enforceLaunchpadRateLimit, launchpadError, launchpadJson, requireLaunchpadSession } from "@/lib/partner/launchpad/apiHelpers";
import { createDomainVerificationToken, dnsTxtRecordsContainToken, domainVerificationRecordName, domainVerificationRecordValue, productionCallbackHostname } from "@/lib/partner/launchpad/domainVerification";
import { getLaunchpadApplicationForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { LAUNCHPAD_PUBLIC_ERRORS } from "@/lib/partner/launchpad/publicErrors";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
type RouteContext = { params: { id: string } };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const sb = requireSupabaseAdmin();
  const { data } = await sb.from("partner_launchpad_domain_verifications")
    .select("hostname, challenge_token, status, expires_at, verified_at, last_checked_at, last_error")
    .eq("application_id", params.id).eq("partner_id", auth.session.partnerId).order("created_at", { ascending: false });
  return launchpadJson({ ok: true, verifications: data ?? [] });
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const limited = enforceLaunchpadRateLimit(req, "/api/launchpad/domain-verification", 10);
  if (limited) return limited;
  const auth = await requireLaunchpadSession(req);
  if (!auth.ok) return auth.response;
  const app = await getLaunchpadApplicationForPartner(params.id, auth.session.partnerId);
  if (!app) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.application_not_found, 404);

  let body: { return_url?: string; action?: string };
  try { body = await req.json(); } catch { return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400); }
  const hostname = productionCallbackHostname(String(body.return_url ?? ""));
  if (!hostname || !app.allowed_return_urls.includes(String(body.return_url ?? ""))) {
    return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.return_url_rejected, 400, "production_https_callback_required");
  }

  const sb = requireSupabaseAdmin();
  if (body.action === "verify") {
    const { data: verification } = await sb.from("partner_launchpad_domain_verifications")
      .select("id, challenge_token, status, expires_at").eq("application_id", params.id)
      .eq("partner_id", auth.session.partnerId).eq("hostname", hostname).maybeSingle();
    if (!verification) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "domain_challenge_required");
    if (verification.status === "verified") return launchpadJson({ ok: true, verified: true, hostname });
    if (new Date(verification.expires_at).getTime() <= Date.now()) {
      await sb.from("partner_launchpad_domain_verifications").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", verification.id);
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "domain_challenge_expired");
    }
    try {
      const records = await dns.resolveTxt(domainVerificationRecordName(hostname));
      if (!dnsTxtRecordsContainToken(records, verification.challenge_token)) {
        await sb.from("partner_launchpad_domain_verifications").update({ last_checked_at: new Date().toISOString(), last_error: "dns_record_not_found", updated_at: new Date().toISOString() }).eq("id", verification.id);
        return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "domain_dns_record_not_found");
      }
    } catch {
      await sb.from("partner_launchpad_domain_verifications").update({ last_checked_at: new Date().toISOString(), last_error: "dns_lookup_failed", updated_at: new Date().toISOString() }).eq("id", verification.id);
      return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 400, "domain_dns_lookup_failed");
    }
    await sb.from("partner_launchpad_domain_verifications").update({ status: "verified", verified_at: new Date().toISOString(), last_checked_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", verification.id);
    return launchpadJson({ ok: true, verified: true, hostname });
  }

  const token = createDomainVerificationToken();
  const { data, error } = await sb.from("partner_launchpad_domain_verifications").upsert({
    application_id: params.id, partner_id: auth.session.partnerId, hostname, challenge_token: token,
    status: "pending", expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), verified_at: null, last_checked_at: null, last_error: null, updated_at: new Date().toISOString(),
  }, { onConflict: "application_id,hostname" }).select("hostname, challenge_token, expires_at").single();
  if (error || !data) return launchpadError(LAUNCHPAD_PUBLIC_ERRORS.invalid_input, 500, "domain_challenge_create_failed");
  return launchpadJson({ ok: true, verification: { hostname: data.hostname, record_name: domainVerificationRecordName(data.hostname), record_value: domainVerificationRecordValue(data.challenge_token), expires_at: data.expires_at } });
}
