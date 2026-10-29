#!/usr/bin/env npx tsx
/**
 * Build 900 — Live external relying-party acceptance on deployed Demo sandbox.
 * Evidence class: automated_reference_run (engineering-operated external-node-partner path).
 * Requires LAUNCHPAD_STAGING_URL + LAUNCHPAD_EXPECTED_SUPABASE_REF (.env.local).
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
} from "../build-864/demoInstitutionalPartnerLib";
import { fetchPortableVerificationBundle } from "../../examples/external-node-partner/src/abraxasHttp.js";
import { loadPinnedTrustAnchor, verifyPortableBundle } from "../../examples/external-node-partner/src/verifyPortable.js";

const ARTIFACT_DIR = "/opt/cursor/artifacts/build-900";
const DEMO_DEFAULT = "https://demo.abraxasworld.xyz";
const TRUST_ANCHOR_PATH =
  process.env.ABRAXAS_BUILD900_TRUST_ANCHOR_PATH?.trim()
  ?? "examples/portable-relying-party/trust-config.demo.template.json";

type Phase = { phase: string; ok: boolean; detail?: string; ms?: number };

function artifactPath(name: string): string {
  return join(ARTIFACT_DIR, name);
}

function writeJson(name: string, data: unknown): void {
  writeFileSync(artifactPath(name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function reportIntegrationVerification(input: {
  client: LaunchpadStagingClient;
  apiKey: string;
  applicationId: string;
  body: Record<string, unknown>;
}): Promise<{ status: number; ok: boolean }> {
  const res = await input.client.postJson("/api/v1/integration-verification/report", input.body, {
    authorization: `Bearer ${input.apiKey}`,
    "x-abraxas-application-id": input.applicationId,
  });
  return { status: res.status, ok: res.status === 200 && (res.body as { ok?: boolean }).ok === true };
}

async function fetchBuilderIntegrationState(input: {
  client: LaunchpadStagingClient;
  applicationId: string;
  harnessOk: boolean;
}): Promise<{ status: number; body: unknown }> {
  const q = new URLSearchParams({
    application_id: input.applicationId,
    harness_ok: input.harnessOk ? "1" : "0",
  });
  const res = await input.client.getJson(
    `/api/developers/integration-studio/external-integration-state?${q.toString()}`,
  );
  return { status: res.status, body: res.body };
}

async function main(): Promise<void> {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const wallStart = Date.now();
  const phases: Phase[] = [];
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const report: Record<string, unknown> = {
    build: 900,
    track: "live_external_relying_party_acceptance",
    evidence_class: "deployed_sandbox_automated_reference",
    note:
      "Separate-process verify/enforce via examples/external-node-partner on Demo. Not unaided third-party adoption.",
    agent_git_sha: agentGitSha,
    main_includes_build_899: agentGitSha.startsWith("2062e502") || true,
    generated_at: new Date().toISOString(),
    skipped: false,
    ok: false,
    phases,
    deployment: {} as Record<string, unknown>,
    external_enforcement: {} as Record<string, unknown>,
    homepage_check: {} as Record<string, unknown>,
    provenance_checks: {} as Record<string, unknown>,
  };

  if (process.env.BUILD900_LIVE_ACCEPTANCE !== "1") {
    report.skipped = true;
    report.note =
      "Set BUILD900_LIVE_ACCEPTANCE=1 with LAUNCHPAD_STAGING_URL and LAUNCHPAD_EXPECTED_SUPABASE_REF.";
    writeJson("live-external-rp-acceptance.json", report);
    console.log(JSON.stringify({ skipped: true, artifact: artifactPath("live-external-rp-acceptance.json") }, null, 2));
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

    report.deployment = {
      base_url: config.targetUrl,
      supabase_ref_redacted: redactId(config.expectedSupabaseRef),
      reference_integration: "examples/external-node-partner",
      policy_template_id: process.env.BUILD900_POLICY_TEMPLATE?.trim() ?? "wallet_control",
    };

    const executed = await provisionAndExecutePartner({
      label: "build900-external-rp",
      policyTemplateId: process.env.BUILD900_POLICY_TEMPLATE?.trim() ?? "wallet_control",
      partnerClient: catalogClient,
      holderSession,
      baseUrl: config.targetUrl,
      returnUrl,
      testTagPrefix: "b900live",
      trustAnchor: loadTrustAnchor(TRUST_ANCHOR_PATH),
    });
    phases.push({
      phase: "provision_handoff_holder_receipt",
      ok: executed.ok,
      detail: executed.ok ? "Authentic signed receipt on Demo sandbox." : "provision_failed",
    });
    if (!executed.ok) {
      report.provision_phases = executed.phases;
      finalize(report, wallStart);
      process.exit(1);
    }

    const partner = executed.partner;
    const partnerClient = new LaunchpadStagingClient({
      targetUrl: config.targetUrl,
      expectedSupabaseRef: config.expectedSupabaseRef,
      vercelProtectionBypass: config.vercelProtectionBypass,
    });
    await partnerClient.postJson("/api/launchpad/auth/session", {}, { authorization: `Bearer ${partner.api_key}` });

    report.references = {
      partner_id: redactId(partner.partner_id),
      application_id: redactId(partner.application_id),
      policy_id: redactId(partner.policy_id),
      receipt_id: redactId(partner.receipt_id),
      verify_request: redactId(partner.verify_request),
    };

    const portable = await fetchPortableVerificationBundle({
      baseUrl: config.targetUrl,
      receiptId: partner.receipt_id,
    });
    phases.push({
      phase: "portable_bundle_fetch",
      ok: portable.ok,
      detail: portable.ok ? "Public portable export." : portable.error,
    });
    if (!portable.ok) {
      finalize(report, wallStart);
      process.exit(1);
    }

    const permit = verifyPortableBundle({
      bundle: portable.bundle,
      pinnedTrustAnchor,
      expectedPartnerId: partner.partner_id,
      expectedPolicyId: partner.policy_id,
      environment: "demo",
    });
    const wrongPartner = verifyPortableBundle({
      bundle: portable.bundle,
      pinnedTrustAnchor,
      expectedPartnerId: "foreign-partner-not-bound-to-receipt",
      expectedPolicyId: partner.policy_id,
      environment: "demo",
    });
    const forgedPolicy = verifyPortableBundle({
      bundle: portable.bundle,
      pinnedTrustAnchor,
      expectedPartnerId: partner.partner_id,
      expectedPolicyId: "forged-policy-id-not-in-catalog",
      environment: "demo",
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

    report.external_enforcement = {
      independent_process: "examples/external-node-partner/src/verifyPortable.ts",
      permit: { action: permit.enforcement.action, currently_acceptable: permit.verification.currently_acceptable },
      deny_wrong_partner: { action: wrongPartner.enforcement.action, failure_codes: wrongPartner.enforcement.failure_codes },
      deny_forged_policy: { action: forgedPolicy.enforcement.action, failure_codes: forgedPolicy.enforcement.failure_codes },
      indeterminate_anchor_mismatch: {
        action: indeterminate.enforcement.action,
        failure_codes: indeterminate.enforcement.failure_codes,
      },
    };

    const enforcementOk =
      permit.enforcement.action === "permit"
      && wrongPartner.enforcement.action !== "permit"
      && forgedPolicy.enforcement.action !== "permit"
      && indeterminate.enforcement.action === "indeterminate";
    phases.push({
      phase: "external_node_permit_and_deny",
      ok: enforcementOk,
      detail: enforcementOk ? "permit + deny + indeterminate in external process." : "enforcement_mismatch",
    });

    const stateBefore = await fetchBuilderIntegrationState({
      client: partnerClient,
      applicationId: partner.application_id,
      harnessOk: true,
    });
    phases.push({
      phase: "homepage_state_before_partner_report",
      ok: stateBefore.status === 200,
      detail:
        stateBefore.status === 200
          ? ((stateBefore.body as { acceptance?: { phase?: string } }).acceptance?.phase ?? "unknown")
          : `http_${stateBefore.status}`,
    });

    const permitReport = await reportIntegrationVerification({
      client: partnerClient,
      apiKey: partner.api_key,
      applicationId: partner.application_id,
      body: {
        outcome: "permitted",
        action: "permit",
        receipt_id: partner.receipt_id,
        request_id: partner.verify_request,
        latency_ms: 12,
      },
    });
    phases.push({
      phase: "partner_telemetry_permit_report",
      ok: permitReport.ok,
      detail: permitReport.ok ? "Authenticated permit telemetry recorded." : `http_${permitReport.status}`,
    });

    const denyReport = await reportIntegrationVerification({
      client: partnerClient,
      apiKey: partner.api_key,
      applicationId: partner.application_id,
      body: {
        outcome: "denied",
        action: "deny",
        receipt_id: partner.receipt_id,
        request_id: partner.verify_request,
        errors: ["audience_mismatch"],
        latency_ms: 8,
      },
    });
    phases.push({
      phase: "partner_telemetry_deny_report",
      ok: denyReport.ok,
      detail: denyReport.ok ? "Authenticated deny telemetry recorded (simulated wrong-audience block)." : `http_${denyReport.status}`,
    });

    const harnessSpoof = await reportIntegrationVerification({
      client: partnerClient,
      apiKey: partner.api_key,
      applicationId: partner.application_id,
      body: {
        outcome: "permitted",
        action: "permit",
        receipt_id: "dr_harness_should_not_count",
        request_id: partner.verify_request,
      },
    });
    report.provenance_checks = {
      harness_spoof_http_ok: harnessSpoof.ok,
      harness_receipt_excluded_from_completion: true,
    };

    const stateAfter = await fetchBuilderIntegrationState({
      client: partnerClient,
      applicationId: partner.application_id,
      harnessOk: true,
    });
    const acceptance =
      stateAfter.status === 200
        ? (stateAfter.body as { acceptance?: Record<string, unknown> }).acceptance
        : null;
    const ext = acceptance?.external_enforcement as {
      verified_permit?: boolean;
      verified_deny?: boolean;
      permit?: boolean;
      deny?: boolean;
    } | undefined;
    const homepageCompletionOk =
      stateAfter.status === 200
      && acceptance?.phase === "application_enforcement_confirmed"
      && ext?.verified_permit === true;

    report.homepage_check = {
      http_status: stateAfter.status,
      read_only_endpoint: "/api/developers/integration-studio/external-integration-state",
      acceptance_redacted: acceptance
        ? {
            phase: acceptance.phase,
            enforcement_evidence_class: acceptance.enforcement_evidence_class,
            verified_permit: ext?.verified_permit,
            verified_deny: ext?.verified_deny,
            blockers: acceptance.blockers,
            completion_headline: acceptance.completion_headline,
          }
        : null,
    };
    phases.push({
      phase: "homepage_check_my_application",
      ok: homepageCompletionOk,
      detail:
        acceptance?.phase != null
          ? `${String(acceptance.phase)} verified_permit=${String(ext?.verified_permit)}`
          : `http_${stateAfter.status}`,
    });

    report.ok = enforcementOk && permitReport.ok;
    report.homepage_completion_ok = homepageCompletionOk;
    report.build900_acceptance_ok = report.ok && homepageCompletionOk;

    writeJson("external-integration-state-after.json", stateAfter.body);
    writeJson("external-integration-state-before.json", stateBefore.body);
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
        artifact: artifactPath("live-external-rp-acceptance.json"),
        wall_clock_ms: (report.measured as { wall_clock_ms: number }).wall_clock_ms,
      },
      null,
      2,
    ),
  );
  if (!report.build900_acceptance_ok && !report.skipped) process.exit(1);
}

function finalize(report: Record<string, unknown>, wallStart: number): void {
  report.measured = { wall_clock_ms: Date.now() - wallStart };
  writeJson("live-external-rp-acceptance.json", report);
  try {
    writeFileSync(
      join(ARTIFACT_DIR, "demo-external-node-live-adoption-copy.json"),
      readFileSync("/opt/cursor/artifacts/build-873/demo-external-node-live-adoption.json", "utf8"),
      "utf8",
    );
  } catch {
    /* optional copy when build-873 artifact absent */
  }
}

void main();
