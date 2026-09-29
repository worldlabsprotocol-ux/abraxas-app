#!/usr/bin/env npx tsx
/**
 * Good Trouble production readiness checklist (read-only).
 * Does not modify production data or print secrets.
 *
 * Run: npx tsx scripts/good-trouble-production-readiness.ts
 * Optional: GOOD_TROUBLE_APP_SLUG=good-trouble PARTNER_ID=good-trouble
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { POLICY_PACKS } from "@/lib/partner/launchpad/policyPacks";
import { LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER } from "@/lib/partner/launchpad/launchpadMigrationChain";

const OUT = process.env.READINESS_OUT ?? "/opt/cursor/artifacts/good-trouble-production-readiness.json";
const PARTNER_ID = process.env.PARTNER_ID ?? "good-trouble";
const APP_SLUG = process.env.GOOD_TROUBLE_APP_SLUG ?? "good-trouble";

interface ChecklistItem {
  id: string;
  category: "configuration" | "security" | "privacy" | "evidence" | "human";
  status: "required" | "verify_in_production" | "manual";
  detail: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "launchpad_app",
    category: "configuration",
    status: "verify_in_production",
    detail: `Launchpad application exists with public_slug=${APP_SLUG}, partner_id=${PARTNER_ID}, environment=production, production_activated_at set.`,
  },
  {
    id: "age_binding",
    category: "configuration",
    status: "verify_in_production",
    detail: "Primary binding policy_template_id=age_21_retail, production_status=production_active.",
  },
  {
    id: "prod_credential",
    category: "security",
    status: "verify_in_production",
    detail: "Active abx_live_ credential linked to application; not exposed in client bundles.",
  },
  {
    id: "callback_allowlist",
    category: "security",
    status: "verify_in_production",
    detail: "Production callback URL (e.g. goodtroublecanna.com) explicitly allowlisted on application.",
  },
  {
    id: "hosted_handoff",
    category: "configuration",
    status: "manual",
    detail: "Partner backend POST /api/v1/partner-handoff with binding_id for age binding; redirect holder to hosted URL.",
  },
  {
    id: "holder_disclosure",
    category: "privacy",
    status: "manual",
    detail: "Holder sees Good Trouble name, 21+ purpose, age_eligible_21 result; DOB/ID withheld per policy pack.",
  },
  {
    id: "server_verify",
    category: "security",
    status: "manual",
    detail: "On callback: fetch GET /api/receipts/{id}/public + AbraxasPartnerKit.verifyForAction with binding context before grant.",
  },
  {
    id: "reuse_second_request",
    category: "evidence",
    status: "manual",
    detail: "Second age 21+ request for same holder: confirm reuse or refresh per policy; fresh consent if required.",
  },
  {
    id: "pilot_evidence",
    category: "evidence",
    status: "verify_in_production",
    detail: "Admin /admin/pilot-evidence shows first_production_request and partner_verification_succeeded only after live events.",
  },
];

const HUMAN_STEPS = [
  "1. Good Trouble backend: POST /api/v1/partner-handoff (production credential, binding_id for age_21_retail).",
  "2. Redirect holder to returned hosted Partner Flow URL.",
  "3. Holder authenticates; confirm privacy brief shows Good Trouble + 21+ result only (no DOB).",
  "4. Holder completes or reuses Passport evidence; approve consent.",
  "5. Holder returns to Good Trouble callback with receipt_id.",
  "6. Good Trouble server: verifyForAction on public receipt with binding + production environment.",
  "7. Grant access only if verification permits.",
  "8. Repeat step 1 for same holder to observe evidence reuse vs refresh.",
  "9. Operator: confirm /admin/pilot-evidence records production events (no synthetic metrics).",
];

const DIAGNOSTIC_SQL = `
SELECT
  to_regclass('public.partner_launchpad_application_policies') AS application_policies,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_launchpad_applications'
      AND column_name = 'production_activated_at'
  ) AS has_production_activated_at,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partner_api_keys'
      AND column_name = 'launchpad_application_id'
  ) AS api_keys_has_launchpad_application_id,
  to_regclass('public.hosted_partner_flow_handoffs') AS hosted_handoffs,
  to_regclass('public.partner_binding_production_access_requests') AS binding_production_requests;
`;

function main() {
  const pack = POLICY_PACKS.age_21_retail;
  const report = {
    generated_at: new Date().toISOString(),
    partner_id: PARTNER_ID,
    app_slug: APP_SLUG,
    policy_pack: "age_21_retail",
    partner_receives: pack.disclosed_result,
    partner_does_not_receive: pack.partner_does_not_receive,
    migration_chain_applied: LAUNCHPAD_DRIFTED_PRODUCTION_REPAIR_ORDER.slice(1),
    checklist: CHECKLIST,
    human_acceptance_steps: HUMAN_STEPS,
    diagnostic_sql: DIAGNOSTIC_SQL.trim(),
    note: "Read-only checklist. No production mutations. Evidence counts appear only after live events.",
  };

  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2));

  console.log("\nGood Trouble Production Readiness (read-only)\n" + "=".repeat(50));
  console.log(`Partner: ${PARTNER_ID} · App slug: ${APP_SLUG}`);
  console.log(`Partner receives: ${pack.disclosed_result}`);
  console.log(`Partner does NOT receive: ${pack.partner_does_not_receive.join(", ")}`);
  console.log("\nChecklist:");
  for (const item of CHECKLIST) {
    console.log(`  [${item.status}] ${item.id}: ${item.detail}`);
  }
  console.log("\nHuman acceptance steps:");
  for (const step of HUMAN_STEPS) console.log(`  ${step}`);
  console.log(`\nReport written: ${OUT}\n`);
}

main();
