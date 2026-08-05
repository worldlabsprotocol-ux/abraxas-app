#!/usr/bin/env npx tsx
// FILE: scripts/integration-preflight.ts
// Read-only integration-readiness preflight — safe for CI and local use.

import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { isAllowedPartnerReturnUrl } from "@/lib/partner/returnUrlAllowlist";
import {
  formatPreflightReport,
  runIntegrationPreflight,
} from "@/lib/integration/preflight";
import { resolvePreflightOptions } from "@/lib/integration/preflightConfig";
import type { PartnerPolicyRow, PartnerRow, PreflightDeps } from "@/lib/integration/preflightTypes";

function buildSupabaseDeps(): Pick<
  PreflightDeps,
  "loadPartner" | "loadPolicy" | "isReturnUrlAllowed"
> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });

  return {
    async loadPartner(partnerId: string): Promise<PartnerRow | null> {
      const { data, error } = await sb
        .from("partners")
        .select(
          "partner_id, status, allowed_return_urls, is_external, onboarding_checklist, assigned_policy_id",
        )
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as PartnerRow | null;
    },
    async loadPolicy(policyId: string): Promise<PartnerPolicyRow | null> {
      const { data, error } = await sb
        .from("partner_policies")
        .select("id, partner_id, status")
        .eq("id", policyId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as PartnerPolicyRow | null;
    },
    isReturnUrlAllowed: (partnerId, returnUrl) =>
      isAllowedPartnerReturnUrl(partnerId, returnUrl),
  };
}

async function main() {
  const options = resolvePreflightOptions(process.env);
  const supabase = buildSupabaseDeps();

  const deps: PreflightDeps = {
    fetch,
    env: process.env,
    readFile: (path) => readFileSync(path, "utf8"),
    fileExists: (path) => existsSync(path),
    ...supabase,
  };

  const result = await runIntegrationPreflight(options, deps);
  console.log(formatPreflightReport(result));

  if (result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
