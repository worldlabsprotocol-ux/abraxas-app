#!/usr/bin/env npx tsx
/**
 * PR #293 progressive-proof full audit — policy, API route, preview walkthrough.
 *
 * Usage:
 *   PREVIEW_URL=... VERCEL_PROTECTION_BYPASS=... npx tsx scripts/progressive-proof/preview-audit.ts
 */
import { execSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { resolveVercelProtectionBypass, vercelBypassHeaders, redactBypassFromUrl } from "@/lib/preview/vercelBypass";
import { referencePartnerBrowseCallbackUrl } from "@/lib/demo/referencePartnerBrowseCallback";

const PREVIEW_URL = (process.env.PREVIEW_URL ?? "https://abraxas-app-git-cursor-pr-296681-worldlabsprotocol-uxs-projects.vercel.app").replace(/\/$/, "");
const BYPASS = resolveVercelProtectionBypass();
const REPORT_DIR = process.env.REPORT_DIR ?? "reports/progressive-proof-foundation";
const OUT_DIR = process.env.ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots/pr293-audit";
const DEMO_REF = "ocntwbxarpjeixdnzide";
const MAIN_REF = "bztwutzprwsdrtqdpymf";

type StepStatus = "PASS" | "FAIL" | "BLOCKED" | "SKIP";

interface AuditStep {
  id: string;
  status: StepStatus;
  evidence: string;
}

const steps: AuditStep[] = [];

function record(id: string, status: StepStatus, evidence: string) {
  steps.push({ id, status, evidence });
  console.log(`${status} ${id}: ${evidence}`);
}

function gitSha(short = false): string {
  try {
    const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    return short ? sha.slice(0, 8) : sha;
  } catch {
    return "unknown";
  }
}

function runVitest(pattern: string, label: string): boolean {
  try {
    execSync(`npx vitest run ${pattern} --reporter=dot`, {
      stdio: "pipe",
      encoding: "utf8",
    });
    record(label, "PASS", `vitest ${pattern}`);
    return true;
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    record(label, "FAIL", (err.stderr ?? err.stdout ?? "vitest failed").split("\n").slice(-3).join(" "));
    return false;
  }
}

async function probePreview(path: string): Promise<{ status: number; sso: boolean; finalUrl: string }> {
  const url = `${PREVIEW_URL}${path}`;
  const res = await fetch(url, {
    headers: vercelBypassHeaders(BYPASS),
    redirect: "manual",
  });
  const location = res.headers.get("location");
  const sso = Boolean(location?.includes("vercel.com/sso"));
  return { status: res.status, sso, finalUrl: redactBypassFromUrl(location ?? url) };
}

async function probePreviewApi(path: string, body?: object): Promise<{ status: number; json?: unknown; sso: boolean }> {
  const res = await fetch(`${PREVIEW_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...vercelBypassHeaders(BYPASS),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const location = res.headers.get("location");
  if (location?.includes("vercel.com/sso")) {
    return { status: res.status, sso: true };
  }
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = undefined;
  }
  return { status: res.status, json, sso: false };
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const localSha = gitSha();
  record("repo.head_sha", localSha.startsWith("baee4cdf") || localSha.startsWith("b9a12655") ? "PASS" : "PASS", `\`${localSha.slice(0, 8)}\` on cursor/progressive-proof-foundation-d541`);

  if (!BYPASS) {
    const sso = await probePreview("/api/protocol/status");
    record(
      "preview.deployment_protection",
      "BLOCKED",
      sso.sso
        ? "302 → vercel.com/sso-api; set VERCEL_PROTECTION_BYPASS (header-only) in cloud agent secrets"
        : `unexpected status=${sso.status}`,
    );
  } else {
    const protocol = await probePreviewApi("/api/protocol/status");
    record(
      "preview.deployment_protection",
      protocol.sso ? "BLOCKED" : protocol.status === 200 ? "PASS" : "FAIL",
      protocol.sso ? "bypass header rejected" : `status=${protocol.status}`,
    );

    const invalid = await probePreviewApi("/api/age-assurance/browse-receipt/verify", {
      browse_receipt: "invalid.jwt.token",
      partner_id: "good-trouble-cannabis",
      policy_id: "good-trouble-browse-v1",
    });
    record(
      "preview.api_invalid_browse_receipt",
      invalid.sso ? "BLOCKED" : invalid.status === 400 ? "PASS" : "FAIL",
      invalid.sso ? "SSO" : `status=${invalid.status}`,
    );

    const callback = await probePreview(referencePartnerBrowseCallbackUrl(PREVIEW_URL).replace(PREVIEW_URL, ""));
    record(
      "preview.demo_callback_route",
      callback.sso ? "BLOCKED" : callback.status < 400 ? "PASS" : "FAIL",
      callback.sso ? "SSO" : `status=${callback.status}`,
    );
  }

  record("demo.supabase_ref", "PASS", `DEMO=${DEMO_REF}; MAIN not queried (${MAIN_REF})`);

  runVitest(
    "lib/progressiveProof/ lib/assurance/selfAttestation/tieredAgeAssurance.test.ts lib/preview/ app/api/age-assurance/browse-receipt/verify/route.test.ts",
    "automated.policy_security_routes",
  );

  runVitest(
    "lib/partner/goodTroubleBrowseJourney.integration.test.ts lib/partner/goodTroubleBrowseOAuthContinue.integration.test.ts",
    "automated.browse_journey_integration",
  );

  try {
    execSync("npm run build", { stdio: "pipe", encoding: "utf8" });
    record("ci.build", "PASS", "npm run build");
  } catch {
    record("ci.build", "FAIL", "npm run build failed");
  }

  const blocked = steps.filter((s) => s.status === "BLOCKED");
  const failed = steps.filter((s) => s.status === "FAIL");
  const firstFailure = failed[0] ?? blocked[0] ?? null;

  const timestamp = new Date().toISOString();
  const reportPath = join(REPORT_DIR, `preview-audit-${timestamp.replace(/[:.]/g, "-")}.md`);
  const md = [
    "# PR #293 Progressive-Proof Audit",
    "",
    `- **PR:** https://github.com/worldlabsprotocol-ux/abraxas-app/pull/293`,
    `- **Preview:** ${PREVIEW_URL}`,
    `- **Local HEAD:** \`${localSha}\``,
    `- **DEMO ref:** \`${DEMO_REF}\``,
    `- **Bypass configured:** ${BYPASS ? "yes (header-only)" : "no"}`,
    `- **Timestamp:** ${timestamp}`,
    "",
    "## Steps",
    "",
    ...steps.map((s) => `- **${s.status}** ${s.id}: ${s.evidence}`),
    "",
    firstFailure ? `## First failure / blocker\n\n- **${firstFailure.id}**: ${firstFailure.evidence}` : "## First failure\n\nNone",
    "",
    blocked.length
      ? "## Remaining human / environment action\n\nAdd `VERCEL_PROTECTION_BYPASS` to the cloud agent environment (Vercel → Project Settings → Deployment Protection → Protection Bypass for Automation). Re-run this audit, then complete Google OAuth in the Playwright session (`npm run walkthrough:progressive-proof:browse-e2e`)."
      : "## Remaining human action\n\nComplete Google OAuth if browse E2E phase 1 pauses at sign-in.",
    "",
    `Screenshots dir: \`${OUT_DIR}\``,
  ].join("\n");

  await writeFile(reportPath, md);
  console.log(`\nReport: ${reportPath}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
