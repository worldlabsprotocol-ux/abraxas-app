#!/usr/bin/env npx tsx
/**
 * Good Trouble production readiness preflight (read-only).
 * Does not modify production data or print secrets.
 *
 * Run: npm run good-trouble:production-readiness
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  GOOD_TROUBLE_CANONICAL_APP_SLUG,
  GOOD_TROUBLE_CANONICAL_PARTNER_ID,
  GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
} from "@/lib/goodTrouble/canonicalProductionConfig";
import {
  buildInvestorTransactionEvidence,
  buildProductionAcceptanceChecklist,
  investorEvidenceLeaks,
} from "@/lib/goodTrouble/productionAcceptanceChecklist";
import {
  evaluateGoodTroubleProductionReadiness,
  formatReadinessReport,
  productionReadinessLeaks,
  type GoodTroubleReadinessDeps,
  type ProductionCredentialSummary,
} from "@/lib/goodTrouble/productionReadiness";
import { listApplicationPolicyBindings } from "@/lib/partner/launchpad/applicationPolicyBindings";
import { getLaunchpadApplicationBySlug } from "@/lib/partner/launchpad/resolveLaunchpadApplication";
import { loadIntegrationEvents, loadLaunchpadActivity } from "@/lib/partner/pilotEvidence/load";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import type { LaunchpadApplicationRow } from "@/lib/partner/launchpad/types";

const OUT = process.env.READINESS_OUT ?? "/opt/cursor/artifacts/good-trouble-production-readiness.json";
const APP_SLUG = process.env.GOOD_TROUBLE_APP_SLUG ?? GOOD_TROUBLE_CANONICAL_APP_SLUG;
const PARTNER_ID = process.env.PARTNER_ID ?? GOOD_TROUBLE_CANONICAL_PARTNER_ID;

function buildSupabaseDeps(): GoodTroubleReadinessDeps | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false } });

  return {
    async loadApplication(slug: string) {
      return getLaunchpadApplicationBySlug(slug);
    },
    async loadBindings(app: LaunchpadApplicationRow) {
      return listApplicationPolicyBindings(app);
    },
    async loadProductionCredential(keyId: string): Promise<ProductionCredentialSummary | null> {
      const { data, error } = await sb
        .from("partner_api_keys")
        .select("id, partner_id, key_prefix, revoked_at, launchpad_application_id")
        .eq("id", keyId)
        .maybeSingle();
      if (error || !data) return null;
      return data as ProductionCredentialSummary;
    },
    async tableExists(table: string) {
      const { data, error } = await sb.rpc("to_regclass", { relation: `public.${table}` }).maybeSingle();
      if (error) {
        const { error: probeError } = await sb.from(table).select("id", { head: true, count: "exact" }).limit(0);
        return probeError ? false : true;
      }
      return Boolean(data);
    },
    async loadProductionEvents(applicationId: string) {
      return loadIntegrationEvents({
        partnerId: PARTNER_ID,
        applicationId,
        environment: "production",
        limit: 200,
      });
    },
  };
}

async function main() {
  const supabaseDeps = buildSupabaseDeps();
  const deps: GoodTroubleReadinessDeps = supabaseDeps ?? {
    loadApplication: async () => null,
    loadBindings: async () => [],
    loadProductionCredential: async () => null,
    tableExists: async () => null,
    loadProductionEvents: async () => null,
  };

  const report = await evaluateGoodTroubleProductionReadiness(deps, {
    appSlug: APP_SLUG,
    partnerId: PARTNER_ID,
  });

  const pack = POLICY_PACKS.age_21_retail;
  const app = await deps.loadApplication(APP_SLUG);
  let events = app && supabaseDeps ? (await deps.loadProductionEvents(app.id)) ?? [] : [];
  const bindings = app ? await deps.loadBindings(app) : [];
  const ageBinding = bindings.find((b) => b.policy_template_id === "age_21_retail") ?? null;
  const activity = app && supabaseDeps
    ? await loadLaunchpadActivity({ partnerId: PARTNER_ID, applicationId: app.id, limit: 200 })
    : [];

  const acceptance = buildProductionAcceptanceChecklist({ preflight: report, events, activity });
  const investorEvidence = buildInvestorTransactionEvidence({
    applicationId: app?.id ?? null,
    bindingId: ageBinding?.id ?? null,
    resultFamily: GOOD_TROUBLE_CANONICAL_RESULT_FAMILY,
    events,
  });

  const output = {
    ...report,
    partner_receives: pack.disclosed_result,
    partner_does_not_receive: pack.partner_does_not_receive,
    acceptance_checklist: acceptance,
    investor_evidence: investorEvidence,
    database_connected: Boolean(supabaseDeps),
    note: "Read-only preflight. No production mutations. Transaction stages remain pending until live events.",
  };

  const safeLeakProbe = {
    checks: report.checks,
    blockers: report.blockers,
    acceptance_checklist: acceptance,
    investor_evidence: investorEvidence,
  };
  if (productionReadinessLeaks(safeLeakProbe).length || investorEvidenceLeaks(investorEvidence).length) {
    console.error("Readiness output failed leak check — aborting write.");
    process.exit(2);
  }

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(OUT, JSON.stringify(output, null, 2));

  console.log(formatReadinessReport(report));
  console.log("Acceptance checklist:");
  for (const stage of acceptance) {
    console.log(`  [${stage.status}] ${stage.stage}: ${stage.label}`);
  }
  console.log(`\nReport written: ${OUT}`);
  if (!supabaseDeps) {
    console.log("\nWARNING: Supabase unavailable — database checks returned UNKNOWN/FAIL.");
  }
  if (!report.ready) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
