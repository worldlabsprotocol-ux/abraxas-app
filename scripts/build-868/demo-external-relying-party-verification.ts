#!/usr/bin/env ./node_modules/.bin/tsx
/**
 * Build #868 — external relying party verifies two Demo receipts via portable contract only.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { LaunchpadStagingClient } from "../launchpad-staging-smoke/client";
import { parseStagingTargetFromEnv } from "../launchpad-staging-smoke/guards";
import {
  DemoHttpSession,
  fetchPortableBundle,
  loadTrustAnchor,
  provisionAndExecutePartner,
  redactId,
  type ProvisionedPartner,
} from "../build-864/demoInstitutionalPartnerLib";
import { runExternalRpAdversarialMatrix } from "./externalRpAdversarial";

const DEMO_DEFAULT = "https://demo.abraxasworld.xyz";
const TRUST_ANCHOR_PATH =
  process.env.ABRAXAS_BUILD864_TRUST_ANCHOR_PATH?.trim()
  ?? "examples/portable-relying-party/trust-config.demo.template.json";
const ARTIFACT_DIR = "/opt/cursor/artifacts/build-868";
const VERIFY_FROM_FILE = resolve("examples/portable-relying-party/verifyPortableReceiptFromFile.ts");

const MILESTONE_LEVELS = {
  one_genuine_acceptable_receipt: "passed (Build 864)",
  two_isolated_application_executions: "passed (Build 866)",
  external_relying_party_verification: "this runner (Build 868)",
} as const;

const LIMITATIONS = [
  "Both applications are provisioned via Integration Studio on Demo; they may share studio partner_id and wallet_control policy pack.",
  "Application-level repeatability is proven (distinct application_id, API credentials, audience isolation); independent organizational tenancy is not.",
  "Portable bundle retrieval uses public GET /api/receipts/{id}/portable-verification once; verification decision is not delegated to Abraxas /verify or operator console.",
] as const;

function artifactPath(name: string): string {
  return resolve(ARTIFACT_DIR, name);
}

function writeBundle(label: string, bundle: unknown): string {
  const path = artifactPath(`portable-bundle-partner-${label.toLowerCase()}.json`);
  writeFileSync(path, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  return path;
}

function spawnExternalVerifier(input: {
  bundlePath: string;
  partnerId: string;
  policyId: string;
}): { exitCode: number; stdout: string; stderr: string } {
  const env = {
    ...process.env,
    RP_PARTNER_ID: input.partnerId,
    RP_POLICY_ID: input.policyId,
    RP_ENVIRONMENT: "demo",
    RP_TRUST_ANCHOR_PATH: TRUST_ANCHOR_PATH,
  };
  try {
    const tsxBin = resolve("node_modules/.bin/tsx");
    const stdout = execFileSync(tsxBin, [VERIFY_FROM_FILE, input.bundlePath], {
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { exitCode: 0, stdout, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: typeof e.status === "number" ? e.status : 1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
    };
  }
}

function parseVerifierStdout(stdout: string): Record<string, unknown> | null {
  try {
    return JSON.parse(stdout.trim()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function trustFactSources(bundle: ProvisionedPartner["bundle"]): Record<string, string> {
  return {
    cryptographic_authenticity: "portable bundle (decision_receipt + signatures) + pinned trust anchor",
    authorized_issuer: "signed_issuer_authority in bundle + pinned anchor binding",
    policy_and_audience: "decision_receipt payload + relying-party RP_PARTNER_ID / RP_POLICY_ID",
    authentic_status_evidence: "signed_status_statement in bundle (signature + anchor registry)",
    evidence_freshness: "signed_status_statement payload timestamps + verifier freshness policy at observation time",
    current_acceptability: "requires authentic signed status; not inferred from receipt signature alone",
    bundle_only_facts: "receipt body, bundled trust anchor copy, issuer authority statement, status statement",
    fresh_observation: "statementObservedAt set at verify time (external process clock)",
  };
}

async function provisionTwoPartners(
  config: ReturnType<typeof parseStagingTargetFromEnv>,
  trustAnchor: ReturnType<typeof loadTrustAnchor>,
): Promise<{ ok: true; a: ProvisionedPartner; b: ProvisionedPartner } | { ok: false; detail: string }> {
  const catalogClient = new LaunchpadStagingClient(config);
  const holderSession = new DemoHttpSession(config.targetUrl);
  const returnUrl = `${config.targetUrl}/partner/callback`;
  const template = process.env.BUILD866_PARTNER_A_POLICY?.trim() ?? "wallet_control";

  const partnerA = await provisionAndExecutePartner({
    label: "A",
    policyTemplateId: template,
    partnerClient: catalogClient,
    holderSession,
    baseUrl: config.targetUrl,
    returnUrl,
    testTagPrefix: "b868",
    trustAnchor,
  });
  if (!partnerA.ok) return { ok: false, detail: "partner_a_provision_failed" };

  const partnerB = await provisionAndExecutePartner({
    label: "B",
    policyTemplateId: process.env.BUILD866_PARTNER_B_POLICY?.trim() ?? template,
    partnerClient: catalogClient,
    holderSession,
    baseUrl: config.targetUrl,
    returnUrl,
    testTagPrefix: "b868",
    trustAnchor,
  });
  if (!partnerB.ok) return { ok: false, detail: "partner_b_provision_failed" };

  return { ok: true, a: partnerA.partner, b: partnerB.partner };
}

async function loadExistingPartners(
  baseUrl: string,
  trustAnchor: ReturnType<typeof loadTrustAnchor>,
): Promise<{ ok: true; a: ProvisionedPartner; b: ProvisionedPartner } | { ok: false; detail: string }> {
  const specs = [
    {
      label: "A",
      receiptId: process.env.BUILD868_RECEIPT_A?.trim(),
      partnerId: process.env.BUILD868_PARTNER_A_ID?.trim(),
      policyId: process.env.BUILD868_POLICY_A_ID?.trim(),
    },
    {
      label: "B",
      receiptId: process.env.BUILD868_RECEIPT_B?.trim(),
      partnerId: process.env.BUILD868_PARTNER_B_ID?.trim(),
      policyId: process.env.BUILD868_POLICY_B_ID?.trim(),
    },
  ];
  const partners: ProvisionedPartner[] = [];
  for (const spec of specs) {
    if (!spec.receiptId || !spec.partnerId || !spec.policyId) {
      return { ok: false, detail: "BUILD868_RECEIPT_* / PARTNER_* / POLICY_* env incomplete" };
    }
    const bundle = await fetchPortableBundle(baseUrl, spec.receiptId);
    if (!bundle) return { ok: false, detail: `portable_fetch_failed:${spec.label}` };
    partners.push({
      label: spec.label,
      policy_template_id: "wallet_control",
      application_id: `existing-${spec.label}`,
      partner_id: spec.partnerId,
      policy_id: spec.policyId,
      api_key: "",
      verify_request: "",
      receipt_id: spec.receiptId,
      phases: {},
      verification: {} as ProvisionedPartner["verification"],
      bundle,
    });
  }
  return { ok: true, a: partners[0]!, b: partners[1]! };
}

async function main() {
  const config = parseStagingTargetFromEnv();
  config.targetUrl = (process.env.LAUNCHPAD_STAGING_URL?.trim() ?? DEMO_DEFAULT).replace(/\/$/, "");
  const trustAnchor = loadTrustAnchor(TRUST_ANCHOR_PATH);
  const agentGitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const mainMergeSha = process.env.BUILD868_MAIN_SHA?.trim() ?? "7f12a8b7259fbaf0beb6c5bf122bdd5b537b37f9";

  mkdirSync(ARTIFACT_DIR, { recursive: true });

  const catalogClient = new LaunchpadStagingClient(config);
  const envRes = await catalogClient.getJson("/api/launchpad/staging/environment");

  const report: Record<string, unknown> = {
    build: 868,
    timestamp: new Date().toISOString(),
    agent_git_sha: agentGitSha,
    main_merge_sha_after_867: mainMergeSha,
    pr_reconciliation: {
      pr_866_mobile_homepage: { state: "MERGED", merged_at_utc: "2026-10-27T14:09:44Z" },
      pr_867_institutional_repeatability: { state: "MERGED", merged_at_utc: "2026-10-27T14:13:01Z" },
    },
    milestone_levels: MILESTONE_LEVELS,
    limitations: LIMITATIONS,
    demo_base: config.targetUrl,
    demo_identity: envRes.body,
    external_execution: {
      verifier_entrypoint: VERIFY_FROM_FILE,
      package: "@abraxas/independent-verifier",
      subprocess: "node_modules/.bin/tsx verifyPortableReceiptFromFile.ts",
      network_in_verifier_process: false,
      network_in_orchestrator: "optional portable bundle GET only",
      excludes: [
        "Integration Studio session state",
        "Demo database credentials",
        "Partner API keys in verifier process",
        "Abraxas hosted /verify decision endpoint",
      ],
    },
    partners: {},
    adversarial: {},
  };

  const useExisting = process.env.BUILD868_USE_EXISTING_RECEIPTS?.trim() === "1";
  const partnersResult = useExisting
    ? await loadExistingPartners(config.targetUrl, trustAnchor)
    : await provisionTwoPartners(config, trustAnchor);

  if (!partnersResult.ok) {
    report.overall = { ok: false, detail: partnersResult.detail };
    writeReport(report);
    process.exit(1);
  }

  const { a, b } = partnersResult;
  const wrongPartnerForA =
    a.partner_id !== b.partner_id ? b.partner_id : "foreign-partner-not-bound-to-receipt";

  for (const partner of [a, b]) {
    const bundlePath = writeBundle(partner.label, partner.bundle);
    const spawned = spawnExternalVerifier({
      bundlePath,
      partnerId: partner.partner_id,
      policyId: partner.policy_id,
    });
    const parsed = parseVerifierStdout(spawned.stdout);
    const adversarial = runExternalRpAdversarialMatrix({
      bundle: partner.bundle,
      pin: trustAnchor,
      partnerId: partner.partner_id,
      policyId: partner.policy_id,
      wrongPartnerId: wrongPartnerForA,
      substitutePinPath: TRUST_ANCHOR_PATH,
    });

    report.partners = report.partners ?? {};
    (report.partners as Record<string, unknown>)[partner.label] = {
      partner_id: redactId(partner.partner_id),
      application_id: redactId(partner.application_id),
      policy_id: redactId(partner.policy_id),
      receipt_id: redactId(partner.receipt_id),
      portable_bundle_path: bundlePath,
      external_subprocess: {
        exit_code: spawned.exitCode,
        enforcement: parsed?.enforcement ?? null,
        cryptographically_authentic: parsed?.cryptographically_authentic ?? null,
        issuer_currently_authorized: parsed?.issuer_currently_authorized ?? null,
        policy_and_audience_match: parsed?.policy_and_audience_match ?? null,
        status_evidence_authentic: parsed?.status_evidence_authentic ?? null,
        currently_acceptable: parsed?.currently_acceptable ?? null,
        verified_offline_from_file: parsed?.verified_offline_from_file ?? null,
      },
      trust_fact_sources: trustFactSources(partner.bundle),
      adversarial_ok: adversarial.ok,
      adversarial_cases: adversarial.cases,
    };
  }

  const partnerReport = report.partners as Record<
    string,
    { external_subprocess?: { exit_code?: number }; adversarial_ok?: boolean }
  >;
  const externalOk =
    partnerReport.A?.external_subprocess?.exit_code === 0
    && partnerReport.B?.external_subprocess?.exit_code === 0
    && partnerReport.A?.adversarial_ok === true
    && partnerReport.B?.adversarial_ok === true;

  report.overall = {
    ok: externalOk,
    external_relying_party_gate: externalOk ? "passed" : "failed",
    completion_criterion:
      "Two policy-bound receipts verified in isolated subprocess with pinned trust material; adversarial matrix fail-closed.",
  };

  writeReport(report);
  console.log(
    JSON.stringify(
      {
        ok: externalOk,
        report_path: artifactPath("demo-external-relying-party-verification.json"),
        receipt_a: redactId(a.receipt_id),
        receipt_b: redactId(b.receipt_id),
      },
      null,
      2,
    ),
  );
  process.exit(externalOk ? 0 : 1);
}

function writeReport(report: Record<string, unknown>): void {
  writeFileSync(
    artifactPath("demo-external-relying-party-verification.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
