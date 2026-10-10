// FILE: lib/partner/universalIntegration/exampleMerchantLiveE2eRunner.ts
// Playwright holder journey orchestration — no identity bypass.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildReferenceVerifyUrl } from "@/lib/partner/referenceRelyingPartyConfig";
import { parsePartnerCallbackParams } from "@/lib/partner/integrationKit/callback";
import {
  LIVE_E2E_ARTIFACT_SCHEMA_VERSION,
  type ExampleMerchantLiveE2eArtifact,
} from "./liveReceiptCorrelation";
import { runStagingLiveE2ePreflight, type StagingLiveE2eConfig } from "./stagingConfigContract";

export interface LiveE2eRunnerStep {
  id: string;
  ok: boolean;
  detail: string;
}

export interface LiveE2eRunnerReport {
  overall: "pass" | "blocked" | "checkpoint";
  steps: LiveE2eRunnerStep[];
  artifactPath: string | null;
  blockers: string[];
}

export interface LiveE2eBrowser {
  goto(url: string): Promise<void>;
  url(): string;
  waitForURL(matcher: (url: URL) => boolean, options?: { timeoutMs?: number }): Promise<void>;
}

type WriteArtifactFn = (path: string, artifact: ExampleMerchantLiveE2eArtifact) => Promise<void>;

export interface LiveE2eRunnerDeps {
  browser: LiveE2eBrowser;
  now?: () => Date;
  writeArtifact?: WriteArtifactFn;
}

function returnUrlMatcher(returnUrl: string): (url: URL) => boolean {
  const expected = new URL(returnUrl);
  return (url) => {
    if (url.origin !== expected.origin) return false;
    if (!url.pathname.startsWith(expected.pathname)) return false;
    return url.searchParams.has("receipt_id");
  };
}

export async function runExampleMerchantLiveE2e(
  deps: LiveE2eRunnerDeps,
  env: Record<string, string | undefined> = process.env,
): Promise<LiveE2eRunnerReport> {
  const steps: LiveE2eRunnerStep[] = [];
  const blockers: string[] = [];
  const preflight = runStagingLiveE2ePreflight(env);
  if (!preflight.ok || !preflight.config) {
    return {
      overall: "blocked",
      steps: [{ id: "preflight", ok: false, detail: preflight.errors.join(", ") }],
      artifactPath: null,
      blockers: preflight.errors,
    };
  }
  steps.push({ id: "preflight", ok: true, detail: "staging config validated" });

  const config = preflight.config;
  const verifyUrl = buildReferenceVerifyUrl(config.rp);
  steps.push({ id: "verify_url", ok: true, detail: "hosted verify URL built" });

  await deps.browser.goto(verifyUrl);
  steps.push({ id: "navigation", ok: true, detail: "opened hosted verify entry" });

  const matcher = returnUrlMatcher(config.rp.returnUrl);
  const timeoutMs = config.automationSource === "manual_checkpoint" ? 0 : 120_000;

  if (config.automationSource === "manual_checkpoint" || timeoutMs === 0) {
    steps.push({
      id: "checkpoint",
      ok: true,
      detail: "Paused for operator — complete MFA/biometric/review in browser, then re-run with callback artifact.",
    });
    return {
      overall: "checkpoint",
      steps,
      artifactPath: null,
      blockers: ["manual_checkpoint_incomplete"],
    };
  }

  try {
    await deps.browser.waitForURL(matcher, { timeoutMs });
  } catch {
    blockers.push("callback_timeout");
    steps.push({
      id: "callback_wait",
      ok: false,
      detail: "Timed out waiting for authorized callback with receipt_id (holder flow incomplete or blocked).",
    });
    return { overall: "blocked", steps, artifactPath: null, blockers };
  }

  const callbackUrl = deps.browser.url();
  let parsed;
  try {
    parsed = parsePartnerCallbackParams(new URL(callbackUrl).searchParams);
  } catch {
    parsed = { ok: false as const, errors: ["callback_parse_failed"] };
  }
  if (!parsed.ok) {
    blockers.push(...parsed.errors);
    steps.push({ id: "callback_parse", ok: false, detail: parsed.errors.join(", ") });
    return { overall: "blocked", steps, artifactPath: null, blockers };
  }

  const artifact: ExampleMerchantLiveE2eArtifact = {
    schema_version: LIVE_E2E_ARTIFACT_SCHEMA_VERSION,
    captured_at: (deps.now ?? (() => new Date()))().toISOString(),
    environment: "sandbox",
    partner_id: parsed.params.partner_id ?? config.rp.partnerId,
    policy_id: parsed.params.policy_id ?? config.rp.policyId,
    application_id: config.launchpadApplicationId,
    verification_request_id: parsed.params.request_id,
    correlation_id: parsed.params.request_id,
    receipt_id: parsed.params.receipt_id!,
    proof_source: "playwright_callback",
  };

  const defaultWrite: WriteArtifactFn = async (path, body) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(body, null, 2));
  };
  const write: WriteArtifactFn = deps.writeArtifact ?? defaultWrite;
  await write(config.artifactPath, artifact);
  steps.push({
    id: "artifact",
    ok: true,
    detail: `Wrote redacted artifact (${config.artifactPath})`,
  });

  return {
    overall: "pass",
    steps,
    artifactPath: config.artifactPath,
    blockers: [],
  };
}
