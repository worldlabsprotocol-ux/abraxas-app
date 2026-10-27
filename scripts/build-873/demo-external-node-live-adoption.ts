#!/usr/bin/env npx tsx
/**
 * Build 873 Track A — Demo sandbox live adoption via external-node-partner verify/enforce path.
 * Requires authorized Demo env (LAUNCHPAD_*). Never logs or writes API keys in full.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";
import {
  DemoHttpSession,
  loadTrustAnchor,
  provisionAndExecutePartner,
  redactId,
  type Phase,
} from "../build-864/demoInstitutionalPartnerLib";
import { fetchPortableVerificationBundle } from "../../examples/external-node-partner/src/abraxasHttp.js";
import { loadPinnedTrustAnchor, verifyPortableBundle } from "../../examples/external-node-partner/src/verifyPortable.js";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-873";
const DEMO_DEFAULT = "https://demo.abraxasworld.xyz";
const TRUST_ANCHOR_PATH =
  process.env.ABRAXAS_BUILD873_TRUST_ANCHOR_PATH?.trim()
  ?? "examples/portable-relying-party/trust-config.demo.template.json";

type TimedPhase = { phase: string; ms: number; ok: boolean; detail?: string };

function artifactPath(): string {
  return join(ARTIFACT_DIR, "demo-external-node-live-adoption.json");
}

async function main(): Promise<void> {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const wallStart = Date.now();
  const phases: TimedPhase[] = [];
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const report: Record<string, unknown> = {
    build: 873,
    track: "demo_external_node_live_adoption",
    evidence_class: "automated_reference_run",
    adoption_score_change: false,
    note: "Automated reference execution — not unaided external-developer adoption.",
    agent_git_sha: agentGitSha,
    generated_at: new Date().toISOString(),
    skipped: false,
    ok: false,
    phases,
    enforcement: {} as Record<string, unknown>,
    privileged_interventions: [] as string[],
    measured: {
      setup_to_provision_ms: null as number | null,
      provision_to_receipt_ms: null as number | null,
      receipt_to_independent_verify_ms: null as number | null,
      wall_clock_ms: null as number | null,
    },
  };

  if (process.env.BUILD873_DEMO_LIVE_ADOPTION !== "1") {
    report.skipped = true;
    report.note =
      "Set BUILD873_DEMO_LIVE_ADOPTION=1 with LAUNCHPAD_STAGING_URL and LAUNCHPAD_EXPECTED_SUPABASE_REF to run against Demo.";
    writeArtifact(report);
    console.log(JSON.stringify({ skipped: true, artifact: artifactPath() }, null, 2));
    return;
  }

  try {
    const config = parseStagingTargetFromEnv();
    config.targetUrl = (process.env.LAUNCHPAD_STAGING_URL?.trim() ?? DEMO_DEFAULT).replace(/\/$/, "");
    const catalogClient = new LaunchpadStagingClient(config);
    const holderSession = new DemoHttpSession(config.targetUrl);
    const trustAnchorRaw = JSON.parse(readFileSync(resolve(TRUST_ANCHOR_PATH), "utf8"));
    const pinnedTrustAnchor = loadPinnedTrustAnchor(trustAnchorRaw);
    const returnUrl = `${config.targetUrl}/partner/callback`;
    const policyTemplate = process.env.BUILD873_POLICY_TEMPLATE?.trim() ?? "wallet_control";

    report.demo_base = config.targetUrl;
    report.return_url = returnUrl;
    report.reference_integration = "examples/external-node-partner";
    report.policy_template_id = policyTemplate;

    const setupStart = Date.now();
    const envRes = await catalogClient.getJson("/api/launchpad/staging/environment");
    phases.push({
      phase: "demo_environment_probe",
      ms: Date.now() - setupStart,
      ok: envRes.status === 200,
      detail: envRes.status === 200 ? "Demo staging identity reachable." : `http_${envRes.status}`,
    });
    if (envRes.status !== 200) {
      report.ok = false;
      finalize(report, wallStart);
      process.exit(1);
    }

    const provisionStart = Date.now();
    const executed = await provisionAndExecutePartner({
      label: "external-node",
      policyTemplateId: policyTemplate,
      partnerClient: catalogClient,
      holderSession,
      baseUrl: config.targetUrl,
      returnUrl,
      testTagPrefix: "b873live",
      trustAnchor: loadTrustAnchor(TRUST_ANCHOR_PATH),
    });
    const provisionMs = Date.now() - provisionStart;
    phases.push({
      phase: "provision_holder_receipt",
      ms: provisionMs,
      ok: executed.ok,
      detail: executed.ok ? "Sandbox app + handoff + holder + receipt issued." : "provision_or_holder_failed",
    });

    if (!executed.ok) {
      report.provision_phases = executed.phases;
      report.ok = false;
      finalize(report, wallStart);
      process.exit(1);
    }

    const partner = executed.partner;
    report.partner = {
      partner_id: redactId(partner.partner_id),
      application_id: redactId(partner.application_id),
      policy_id: redactId(partner.policy_id),
      receipt_id: redactId(partner.receipt_id),
      verify_request: redactId(partner.verify_request),
    };

    report.measured.setup_to_provision_ms = provisionMs;
    report.measured.provision_to_receipt_ms = provisionMs;

    const fetchStart = Date.now();
    const portable = await fetchPortableVerificationBundle({
      baseUrl: config.targetUrl,
      receiptId: partner.receipt_id,
    });
    const fetchMs = Date.now() - fetchStart;
    phases.push({
      phase: "portable_bundle_fetch",
      ms: fetchMs,
      ok: portable.ok,
      detail: portable.ok ? "Portable export fetched via public HTTP." : portable.error,
    });
    if (!portable.ok) {
      report.ok = false;
      finalize(report, wallStart);
      process.exit(1);
    }

    const verifyStart = Date.now();
    const permit = verifyPortableBundle({
      bundle: portable.bundle,
      pinnedTrustAnchor,
      expectedPartnerId: partner.partner_id,
      expectedPolicyId: partner.policy_id,
      environment: "demo",
    });
    const verifyMs = Date.now() - verifyStart;
    phases.push({
      phase: "external_node_independent_verify_permit",
      ms: verifyMs,
      ok: permit.enforcement.action === "permit",
      detail: permit.enforcement.action,
    });

    const wrongPartner = verifyPortableBundle({
      bundle: portable.bundle,
      pinnedTrustAnchor,
      expectedPartnerId: "foreign-partner-not-bound-to-receipt",
      expectedPolicyId: partner.policy_id,
      environment: "demo",
    });
    phases.push({
      phase: "external_node_enforce_wrong_partner",
      ms: 0,
      ok: wrongPartner.enforcement.action !== "permit",
      detail: wrongPartner.enforcement.action,
    });

    const forgedPolicy = verifyPortableBundle({
      bundle: portable.bundle,
      pinnedTrustAnchor,
      expectedPartnerId: partner.partner_id,
      expectedPolicyId: "forged-policy-id-not-in-catalog",
      environment: "demo",
    });
    phases.push({
      phase: "external_node_enforce_forged_policy",
      ms: 0,
      ok: forgedPolicy.enforcement.action !== "permit",
      detail: forgedPolicy.enforcement.action,
    });

    const tamperedAnchorBundle = {
      ...portable.bundle,
      bundled_trust_anchor: {
        ...portable.bundle.bundled_trust_anchor,
        public_key_fingerprint: `${"ab".repeat(32)}`,
      },
    };
    const indeterminate = verifyPortableBundle({
      bundle: tamperedAnchorBundle,
      pinnedTrustAnchor,
      expectedPartnerId: partner.partner_id,
      expectedPolicyId: partner.policy_id,
      environment: "demo",
    });
    phases.push({
      phase: "external_node_enforce_anchor_mismatch_indeterminate",
      ms: 0,
      ok: indeterminate.enforcement.action === "indeterminate",
      detail: indeterminate.enforcement.action,
    });

    report.enforcement = {
      permit: {
        action: permit.enforcement.action,
        failure_codes: permit.enforcement.failure_codes,
        cryptographically_authentic: permit.verification.cryptographically_authentic,
        currently_acceptable: permit.verification.currently_acceptable,
      },
      wrong_partner: {
        action: wrongPartner.enforcement.action,
        failure_codes: wrongPartner.enforcement.failure_codes,
      },
      forged_policy: {
        action: forgedPolicy.enforcement.action,
        failure_codes: forgedPolicy.enforcement.failure_codes,
      },
      anchor_mismatch: {
        action: indeterminate.enforcement.action,
        failure_codes: indeterminate.enforcement.failure_codes,
      },
    };

    report.measured.receipt_to_independent_verify_ms = fetchMs + verifyMs;
    report.server_side_handoff = {
      note: "Handoff used POST /api/v1/partner-handoff (same contract as external-node-partner createHostedHandoff).",
      runtime: "nextjs",
    };

    const enforcementOk =
      permit.enforcement.action === "permit"
      && wrongPartner.enforcement.action !== "permit"
      && forgedPolicy.enforcement.action !== "permit"
      && indeterminate.enforcement.action === "indeterminate";

    report.ok = enforcementOk;
    report.provision_engine_phases = Object.fromEntries(
      Object.entries(partner.phases).map(([k, v]) => [k, sanitizePhase(v)]),
    );
  } catch (err) {
    report.ok = false;
    report.error = err instanceof Error ? err.message : String(err);
  }

  finalize(report, wallStart);
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        skipped: report.skipped,
        artifact: artifactPath(),
        wall_clock_ms: report.measured && (report.measured as { wall_clock_ms: number }).wall_clock_ms,
      },
      null,
      2,
    ),
  );
  if (!report.ok && !report.skipped) process.exit(1);
}

function sanitizePhase(phase: Phase): Phase {
  const copy = { ...phase };
  for (const key of Object.keys(copy)) {
    const v = copy[key];
    if (typeof v === "string" && v.length > 24 && !key.includes("detail")) {
      copy[key] = redactId(v) ?? v;
    }
  }
  return copy;
}

function finalize(report: Record<string, unknown>, wallStart: number): void {
  const measured = report.measured as {
    wall_clock_ms: number | null;
  };
  measured.wall_clock_ms = Date.now() - wallStart;
  writeArtifact(report);
}

function writeArtifact(report: Record<string, unknown>): void {
  writeFileSync(artifactPath(), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

void main();
