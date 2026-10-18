// FILE: lib/partner/launchpad/workspaceView.ts
// Partner Launchpad workspace aggregation.

import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import { listLaunchpadApplicationsForPartner } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import type { LaunchpadApplicationSummary, LaunchpadWorkspaceView } from "@/lib/partner/launchpad/types";
import { launchpadUsesSovereignPostgres } from "@/lib/partner/launchpad/launchpadPersistence";
import {
  pgGetApiKeyPrefixes,
  pgGetPartnerCompany,
} from "@/lib/partner/launchpad/sovereign/launchpadPgStore";

function integrationStatus(
  status: string,
): LaunchpadApplicationSummary["integration_status"] {
  if (status === "suspended") return "suspended";
  if (status === "pending") return "pending";
  return "ready";
}

export async function buildLaunchpadWorkspaceView(
  partnerId: string,
): Promise<LaunchpadWorkspaceView | null> {
  const applications = await listLaunchpadApplicationsForPartner(partnerId);

  let partnerCompany: string | undefined;
  let allowedEnvs: string[] = ["sandbox"];
  const keyIds = applications.map((app) => app.api_key_id).filter(Boolean) as string[];
  let keyPrefixMap = new Map<string, string>();

  if (launchpadUsesSovereignPostgres()) {
    const partner = await pgGetPartnerCompany(partnerId);
    partnerCompany = partner?.company;
    allowedEnvs = partner?.allowed_environments ?? ["sandbox"];
    keyPrefixMap = await pgGetApiKeyPrefixes(keyIds);
  } else {
    const sb = requireSupabaseAdmin();
    const { data: partner } = await sb
      .from("partners")
      .select("company, allowed_environments")
      .eq("partner_id", partnerId)
      .maybeSingle();
    partnerCompany = partner?.company;
    allowedEnvs = (partner?.allowed_environments ?? ["sandbox"]) as string[];
    if (keyIds.length > 0) {
      const { data: keys } = await sb
        .from("partner_api_keys")
        .select("id, key_prefix, revoked_at")
        .in("id", keyIds);
      for (const key of keys ?? []) {
        if (!key.revoked_at) {
          keyPrefixMap.set(key.id, key.key_prefix);
        }
      }
    }
  }

  const allowedEnvsResolved = allowedEnvs;
  const environment = allowedEnvsResolved.includes("production") ? "production" : "sandbox";

  return {
    partner_id: partnerId,
    display_name: partnerCompany ?? partnerId,
    environment,
    applications: applications.map((app) => ({
      id: app.id,
      public_slug: app.public_slug,
      application_name: app.application_name,
      display_name: app.display_name,
      environment: app.environment,
      policy_id: app.policy_id,
      policy_version: app.policy_version,
      policy_template_id: app.policy_template_id,
      allowed_return_urls: app.allowed_return_urls,
      status: app.status,
      key_prefix: app.api_key_id ? (keyPrefixMap.get(app.api_key_id) ?? null) : null,
      integration_status: integrationStatus(app.status),
    })),
  };
}
