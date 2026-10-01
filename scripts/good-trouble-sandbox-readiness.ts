#!/usr/bin/env npx tsx
/**
 * Canonical Good Trouble sandbox execution readiness (read-only).
 * Does not mutate production or print credential secrets.
 *
 * Run: npm run good-trouble:sandbox-readiness
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { primaryBindingId } from "@/lib/partner/launchpad/resolveApplicationPolicyBinding";
import { getLaunchpadApplicationBySlug } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import {
  evaluateCanonicalSandboxReadiness,
  formatSandboxReadinessReport,
  sandboxReadinessLeaks,
  type SandboxCredentialSummary,
} from "@/lib/goodTrouble/canonicalSandboxReadiness";

const OUT = process.env.SANDBOX_READINESS_OUT ?? "/opt/cursor/artifacts/good-trouble-sandbox-readiness.json";

function buildDeps() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });

  return {
    loadApplication: (slug: string) => getLaunchpadApplicationBySlug(slug),
    async loadSandboxCredential(keyId: string): Promise<SandboxCredentialSummary | null> {
      const { data, error } = await sb
        .from("partner_api_keys")
        .select("id, partner_id, key_prefix, revoked_at, launchpad_application_id")
        .eq("id", keyId)
        .maybeSingle();
      if (error || !data) return null;
      return data as SandboxCredentialSummary;
    },
    async countVerifiedReceipts(input: { partnerId: string; applicationId: string }) {
      const { count, error } = await sb
        .from("partner_integration_events")
        .select("id", { head: true, count: "exact" })
        .eq("partner_id", input.partnerId)
        .eq("application_id", input.applicationId)
        .eq("event_type", "receipt_verification_succeeded");
      if (error) return null;
      return count ?? 0;
    },
    primaryBindingId,
  };
}

async function main() {
  const deps = buildDeps();
  const report = await evaluateCanonicalSandboxReadiness(deps ?? {
    loadApplication: async () => null,
    loadSandboxCredential: async () => null,
    countVerifiedReceipts: async () => null,
    primaryBindingId,
  });

  if (sandboxReadinessLeaks(report).length) {
    console.error("Sandbox readiness output failed leak check.");
    process.exit(2);
  }

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));

  console.log(formatSandboxReadinessReport(report));
  console.log(`\nReport written: ${OUT}`);
  if (!deps) {
    console.log("\nWARNING: Supabase unavailable — connect production credentials for authoritative state.");
  }
  if (!report.ready_for_first_test) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
