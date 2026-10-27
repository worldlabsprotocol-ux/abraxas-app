#!/usr/bin/env ./node_modules/.bin/tsx
/**
 * Build #866 — two isolated institutional sandboxes on Demo, same protocol engines.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";
import {
  assertCrossApplicationHandoffDenied,
  DemoHttpSession,
  loadTrustAnchor,
  provisionAndExecutePartner,
  redactId,
  verifyPartnerIsolation,
  type Phase,
} from "../build-864/demoInstitutionalPartnerLib";

const DEMO_DEFAULT = "https://demo.abraxasworld.xyz";
const TRUST_ANCHOR_PATH =
  process.env.ABRAXAS_BUILD864_TRUST_ANCHOR_PATH?.trim()
  ?? "examples/portable-relying-party/trust-config.demo.template.json";

const MANUAL_STEPS = [
  "Set LAUNCHPAD_STAGING_URL + LAUNCHPAD_EXPECTED_SUPABASE_REF (Demo ref ocntwbxarpjeixdnzide)",
  "Optional VERCEL_PROTECTION_BYPASS when Demo deployment protection is enabled",
  "Run npm run build866:demo-institutional-partner-repeatability",
] as const;

async function main() {
  const config = parseStagingTargetFromEnv();
  config.targetUrl = (process.env.LAUNCHPAD_STAGING_URL?.trim() ?? DEMO_DEFAULT).replace(/\/$/, "");
  const catalogClient = new LaunchpadStagingClient(config);
  const holderSession = new DemoHttpSession(config.targetUrl);
  const trustAnchor = loadTrustAnchor(TRUST_ANCHOR_PATH);
  const returnUrl = `${config.targetUrl}/partner/callback`;
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const templateA = process.env.BUILD866_PARTNER_A_POLICY?.trim() ?? "wallet_control";
  const templateB = process.env.BUILD866_PARTNER_B_POLICY?.trim() ?? "wallet_control";

  const report: Record<string, unknown> = {
    build: 866,
    timestamp: new Date().toISOString(),
    agent_git_sha: agentGitSha,
    demo_base: config.targetUrl,
    manual_steps_required: MANUAL_STEPS,
    partner_policy_templates: { partner_a: templateA, partner_b: templateB },
    partners: {} as Record<string, unknown>,
    isolation: {} as Record<string, unknown>,
    operational_notes: {
      provisioned_via: "POST /api/developers/integration-studio (Integration Studio contract)",
      holder_authorization: "Solana wallet-control path (same method qualification engine)",
      independent_verifier: "@abraxas/independent-verifier portable bundle + pinned Demo trust anchor",
      privileged_operator: "None required beyond Demo API access and this runner",
    },
  };

  const envRes = await catalogClient.getJson("/api/launchpad/staging/environment");
  report.demo_identity = envRes.body;

  const partnerA = await provisionAndExecutePartner({
    label: "A",
    policyTemplateId: templateA,
    partnerClient: catalogClient,
    holderSession,
    baseUrl: config.targetUrl,
    returnUrl,
    testTagPrefix: "b866",
    trustAnchor,
  });
  report.partners.A = partnerA.ok
    ? {
        partner_id: redactId(partnerA.partner.partner_id),
        application_id: redactId(partnerA.partner.application_id),
        policy_id: redactId(partnerA.partner.policy_id),
        policy_template_id: partnerA.partner.policy_template_id,
        receipt_id: redactId(partnerA.partner.receipt_id),
        verification: partnerA.partner.phases.independent_verification,
        phases: partnerA.partner.phases,
      }
    : { ok: false, phases: partnerA.phases };

  if (!partnerA.ok) {
    writeReport(report);
    process.exit(1);
  }

  const partnerB = await provisionAndExecutePartner({
    label: "B",
    policyTemplateId: templateB,
    partnerClient: catalogClient,
    holderSession,
    baseUrl: config.targetUrl,
    returnUrl,
    testTagPrefix: "b866",
    trustAnchor,
  });
  report.partners.B = partnerB.ok
    ? {
        partner_id: redactId(partnerB.partner.partner_id),
        application_id: redactId(partnerB.partner.application_id),
        policy_id: redactId(partnerB.partner.policy_id),
        policy_template_id: partnerB.partner.policy_template_id,
        receipt_id: redactId(partnerB.partner.receipt_id),
        verification: partnerB.partner.phases.independent_verification,
        phases: partnerB.partner.phases,
      }
    : { ok: false, phases: partnerB.phases };

  if (!partnerB.ok) {
    writeReport(report);
    process.exit(1);
  }

  report.isolation = verifyPartnerIsolation({
    trustAnchor,
    partnerA: partnerA.partner,
    partnerB: partnerB.partner,
  });

  report.isolation.cross_app_handoff_a_to_b = await assertCrossApplicationHandoffDenied({
    apiKeyOwner: partnerA.partner,
    foreignApplicationId: partnerB.partner.application_id,
    baseUrl: config.targetUrl,
  });
  report.isolation.cross_app_handoff_b_to_a = await assertCrossApplicationHandoffDenied({
    apiKeyOwner: partnerB.partner,
    foreignApplicationId: partnerA.partner.application_id,
    baseUrl: config.targetUrl,
  });

  const isolationPhases = report.isolation as Record<string, Phase>;
  const isolationOk = Object.values(isolationPhases).every((p) => p.ok !== false);

  report.overall = {
    ok: isolationOk,
    partner_a_acceptable:
      (partnerA.partner.phases.independent_verification as Phase).currently_acceptable === "yes",
    partner_b_acceptable:
      (partnerB.partner.phases.independent_verification as Phase).currently_acceptable === "yes",
    evidence_current_a: (
      (partnerA.partner.phases.independent_verification as { status_snapshot?: { evidence_current?: boolean } })
        .status_snapshot?.evidence_current ?? null
    ),
    evidence_current_b: (
      (partnerB.partner.phases.independent_verification as { status_snapshot?: { evidence_current?: boolean } })
        .status_snapshot?.evidence_current ?? null
    ),
  };

  writeReport(report);
  console.log(
    JSON.stringify(
      {
        ok: (report.overall as { ok: boolean }).ok,
        report_path: reportPath(),
        partner_a_receipt: redactId(partnerA.partner.receipt_id),
        partner_b_receipt: redactId(partnerB.partner.receipt_id),
      },
      null,
      2,
    ),
  );
  process.exit(isolationOk ? 0 : 1);
}

function reportPath(): string {
  return resolve("/opt/cursor/artifacts/build-866-demo-partner-repeatability.json");
}

function writeReport(report: Record<string, unknown>): void {
  mkdirSync("/opt/cursor/artifacts", { recursive: true });
  writeFileSync(reportPath(), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
