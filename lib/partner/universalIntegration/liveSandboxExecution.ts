// FILE: lib/partner/universalIntegration/liveSandboxExecution.ts
// Live Example Merchant sandbox execution — no mocked receipt success.

import { PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { buildReferenceVerifyUrl } from "@/lib/partner/referenceRelyingPartyConfig";
import { validatePartnerFlowPublicReceipt, type PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { EXAMPLE_MERCHANT_INTEGRATION } from "./independentPartnerScenario";
import { resolveLiveReceiptCorrelation } from "./liveReceiptCorrelation";
import { runStagingLiveE2ePreflight } from "./stagingConfigContract";

export const LIVE_SANDBOX_ENV_KEYS = {
  liveReceiptId: "EXAMPLE_MERCHANT_LIVE_RECEIPT_ID",
} as const;

export type LiveSandboxStageStatus = "pass" | "fail" | "blocked" | "skipped";

export interface LiveSandboxStage {
  id: string;
  label: string;
  status: LiveSandboxStageStatus;
  detail: string;
  live: boolean;
}

export interface LiveSandboxExecutionReport {
  partner_id: string;
  policy_id: string;
  base_url: string;
  overall: "pass" | "partial" | "blocked";
  live_e2e_complete: false | true;
  stages: LiveSandboxStage[];
  blockers: string[];
  manual_steps: string[];
}

export interface LiveSandboxExecutionDeps {
  fetch: typeof fetch;
  env?: Record<string, string | undefined>;
  now?: Date;
}

function stage(
  id: string,
  label: string,
  status: LiveSandboxStageStatus,
  detail: string,
  live: boolean,
): LiveSandboxStage {
  return { id, label, status, detail, live };
}

export async function runLiveSandboxExecution(
  deps: LiveSandboxExecutionDeps,
): Promise<LiveSandboxExecutionReport> {
  const env = deps.env ?? process.env;
  const preflight = runStagingLiveE2ePreflight(env);
  const stages: LiveSandboxStage[] = [];
  const blockers: string[] = [];
  const manual_steps = [
    "holder_authentication",
    "holder_disclosure_consent",
    "policy_evaluation_with_real_evidence",
    "signed_receipt_issuance",
  ];

  if (!preflight.ok || !preflight.config) {
    return {
      partner_id: EXAMPLE_MERCHANT_INTEGRATION.partnerId,
      policy_id: EXAMPLE_MERCHANT_INTEGRATION.policyId,
      base_url: "",
      overall: "blocked",
      live_e2e_complete: false,
      stages: [
        stage(
          "preflight_env",
          "Staging preflight",
          "blocked",
          preflight.errors.length
            ? preflight.errors.join(", ")
            : "PARTNER_FLOW_RP configuration incomplete",
          false,
        ),
      ],
      blockers: preflight.errors.length ? preflight.errors : ["staging_preflight_failed"],
      manual_steps,
    };
  }

  const config = preflight.config.rp;
  if (preflight.warnings.length) {
    stages.push(stage(
      "preflight_warnings",
      "Staging preflight warnings",
      "skipped",
      preflight.warnings.join(", "),
      false,
    ));
  }

  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const verifyUrl = buildReferenceVerifyUrl(config!);

  stages.push(stage(
    "preflight_env",
    "Preflight PARTNER_FLOW_RP_* configuration",
    "pass",
    `partner_id=${config.partnerId} policy_id=${config.policyId}`,
    false,
  ));

  const manifestUrl = `${baseUrl}${PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH}`;
  let manifestOk = false;
  try {
    const res = await deps.fetch(manifestUrl);
    manifestOk = res.ok;
    stages.push(stage(
      "compatibility_manifest",
      "Live compatibility manifest",
      res.ok ? "pass" : "fail",
      `${manifestUrl} → HTTP ${res.status}`,
      true,
    ));
    if (!res.ok) blockers.push("compatibility_manifest_unreachable");
  } catch (error) {
    stages.push(stage(
      "compatibility_manifest",
      "Live compatibility manifest",
      "fail",
      `${manifestUrl} → ${error instanceof Error ? error.message : "network error"}`,
      true,
    ));
    blockers.push("compatibility_manifest_unreachable");
  }

  try {
    const res = await deps.fetch(verifyUrl, { redirect: "manual" });
    const ok = res.status >= 200 && res.status < 500;
    stages.push(stage(
      "hosted_verify_entry",
      "Hosted verify entry reachable",
      ok ? "pass" : "fail",
      `${verifyUrl} → HTTP ${res.status}`,
      true,
    ));
    if (!ok) blockers.push("hosted_verify_unreachable");
  } catch (error) {
    stages.push(stage(
      "hosted_verify_entry",
      "Hosted verify entry reachable",
      "fail",
      error instanceof Error ? error.message : "network error",
      true,
    ));
    blockers.push("hosted_verify_unreachable");
  }

  const correlationResult = resolveLiveReceiptCorrelation({ config, env });
  const holderProofFromAutomation = correlationResult.ok
    && (correlationResult.correlation.proof_source === "playwright_callback"
      || correlationResult.correlation.proof_source === "manual_callback");

  stages.push(stage(
    "holder_flow",
    "Holder authentication + verification",
    holderProofFromAutomation ? "pass" : "blocked",
    holderProofFromAutomation
      ? `Callback proof captured (${correlationResult.ok ? correlationResult.correlation.proof_source : "unknown"}) — browser holder steps completed for this correlation.`
      : "Run Playwright live E2E or capture an authorized callback URL (artifact). Cannot bypass MFA, biometrics, or human review.",
    holderProofFromAutomation,
  ));

  if (!correlationResult.ok) {
    stages.push(stage(
      "live_receipt_verify",
      "Server-side verify live issued receipt",
      "skipped",
      correlationResult.errors.join(", "),
      false,
    ));
    blockers.push(...correlationResult.errors);
  } else {
    const liveReceiptId = correlationResult.correlation.receipt_id;
    stages.push(stage(
      "receipt_correlation",
      "Receipt correlation",
      "pass",
      `source=${correlationResult.correlation.source} receipt_id=${liveReceiptId}${
        correlationResult.correlation.correlation_id
          ? ` correlation=${correlationResult.correlation.correlation_id}`
          : ""
      }`,
      correlationResult.correlation.source !== "receipt_id_env",
    ));
    const receiptUrl = `${baseUrl}/api/receipts/${encodeURIComponent(liveReceiptId)}/public`;
    try {
      const res = await deps.fetch(receiptUrl);
      if (!res.ok) {
        stages.push(stage(
          "live_receipt_verify",
          "Server-side verify live issued receipt",
          "fail",
          `${receiptUrl} → HTTP ${res.status}`,
          true,
        ));
        blockers.push("live_receipt_fetch_failed");
      } else {
        const body = await res.json() as PartnerFlowPublicReceipt;
        const trust = validatePartnerFlowPublicReceipt(body, {
          partnerId: config.partnerId,
          policyId: config.policyId,
          now: deps.now ?? new Date(),
          allowSandbox: true,
        });
        stages.push(stage(
          "live_receipt_verify",
          "Server-side verify live issued receipt",
          trust.ok ? "pass" : "fail",
          trust.ok ? `receipt ${liveReceiptId} trust ok` : trust.errors.join(", "),
          true,
        ));
        if (!trust.ok) blockers.push("live_receipt_trust_failed");
      }
    } catch (error) {
      stages.push(stage(
        "live_receipt_verify",
        "Server-side verify live issued receipt",
        "fail",
        error instanceof Error ? error.message : "fetch error",
        true,
      ));
      blockers.push("live_receipt_fetch_failed");
    }
  }

  const liveReceiptPassed = stages.some((s) => s.id === "live_receipt_verify" && s.status === "pass");
  const holderPassed = stages.some((s) => s.id === "holder_flow" && s.status === "pass");
  const infraPassed = manifestOk && !blockers.includes("hosted_verify_unreachable");
  let overall: LiveSandboxExecutionReport["overall"] = "blocked";
  if (liveReceiptPassed && infraPassed && holderPassed) {
    overall = "pass";
  } else if (infraPassed) {
    overall = "partial";
  }

  return {
    partner_id: config.partnerId,
    policy_id: config.policyId,
    base_url: baseUrl,
    overall,
    live_e2e_complete: liveReceiptPassed && holderPassed,
    stages,
    blockers,
    manual_steps,
  };
}
