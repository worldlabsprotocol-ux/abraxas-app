// FILE: lib/security/bountyGateStatus.ts
// Mainnet gate #7 telemetry — bounty submissions + self-serve integrate.

import { createClient } from "@supabase/supabase-js";
import { AUDIT_TRACKER, BUG_BOUNTY } from "@/lib/securityProgram";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export interface BountyGateStatus {
  met: boolean;
  bountySubmissionsEnabled: boolean;
  selfServeIntegrate: boolean;
  auditsComplete: number;
  submissionsCount: number;
  criteria: string;
}

export const BOUNTY_GATE_CRITERIA =
  "Self-serve partner apply with ops notification + public bounty submission API live (pre-registration counts; full rewards post-audit).";

export async function getBountyGateStatus(): Promise<BountyGateStatus> {
  const bountySubmissionsEnabled = process.env.SECURITY_BOUNTY_SUBMISSIONS !== "false";
  const selfServeIntegrate = process.env.INTEGRATION_SELF_SERVE !== "false";
  const auditsComplete = AUDIT_TRACKER.filter(a => a.status === "complete").length;

  let submissionsCount = 0;
  if (SB_URL && SB_KEY) {
    const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const { count } = await sb
      .from("security_reports")
      .select("id", { count: "exact", head: true });
    submissionsCount = count ?? 0;
  }

  const notifyConfigured = Boolean(process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL);
  const met =
    bountySubmissionsEnabled &&
    selfServeIntegrate &&
    notifyConfigured &&
    BUG_BOUNTY.phase !== "pre_registration"
      ? auditsComplete >= 2
      : false;

  return {
    met,
    bountySubmissionsEnabled,
    selfServeIntegrate,
    auditsComplete,
    submissionsCount,
    criteria: BOUNTY_GATE_CRITERIA,
  };
}
