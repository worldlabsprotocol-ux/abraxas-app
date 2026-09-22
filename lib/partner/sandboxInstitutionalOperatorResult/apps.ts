import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";
import { requireSupabaseAdmin } from "@/lib/supabase/admin";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID,
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";

const testApps = new Map<string, LaunchpadApplicationRow>();

export function resetOperatorLaunchpadAppsForTests(): void {
  testApps.clear();
}

export function putOperatorLaunchpadAppForTests(app: LaunchpadApplicationRow): void {
  testApps.set(app.id, app);
}

export async function loadOperatorLaunchpadApplication(applicationId: string): Promise<LaunchpadApplicationRow | null> {
  const id = applicationId.trim();
  if (!id) return null;
  const cached = testApps.get(id);
  if (cached) return cached;
  if (process.env.VITEST) return null;
  try {
    const sb = requireSupabaseAdmin();
    const { data, error } = await sb
      .from("partner_launchpad_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as LaunchpadApplicationRow;
  } catch {
    throw Object.assign(new Error("schema_unavailable"), { code: "schema_unavailable" });
  }
}

export function assertPinnedSandboxInstitutionalApp(app: LaunchpadApplicationRow): void {
  if (app.environment === "production") {
    throw Object.assign(new Error("environment_mismatch"), { code: "environment_mismatch" });
  }
  if (
    app.policy_id !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID
    || app.policy_version !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_VERSION
    || app.policy_template_id !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_POLICY_ID
  ) {
    throw Object.assign(new Error("policy_mismatch"), { code: "policy_mismatch" });
  }
  if (app.status !== "active") {
    throw Object.assign(new Error("invalid_input"), { code: "invalid_input" });
  }
}
