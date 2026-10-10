// FILE: lib/partner/universalIntegration/liveSandboxExecution.ts
// Live Example Merchant sandbox execution — no mocked receipt success.

import { PARTNER_FLOW_COMPATIBILITY_MANIFEST_PATH } from "@/lib/protocol/partnerFlowCompatibilityManifest";
import { resolveReferenceRelyingPartyConfig, buildReferenceVerifyUrl } from "@/lib/partner/referenceRelyingPartyConfig";
import { validatePartnerFlowPublicReceipt, type PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { EXAMPLE_MERCHANT_INTEGRATION } from "./independentPartnerScenario";

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
  const { config, missing } = resolveReferenceRelyingPartyConfig(env);
  const stages: LiveSandboxStage[] = [];
  const blockers: string[] = [];
  const manual_steps = [
    "holder_authentication",
    "holder_disclosure_consent",
    "policy_evaluation_with_real_evidence",
    "signed_receipt_issuance",
  ];

  if (missing.length > 0) {
    return {
      partner_id: EXAMPLE_MERCHANT_INTEGRATION.partnerId,
      policy_id: EXAMPLE_MERCHANT_INTEGRATION.policyId,
      base_url: "",
      overall: "blocked",
      live_e2e_complete: false,
      stages: [
        stage("preflight_env", "Preflight environment", "blocked", `Missing: ${missing.join(", ")}`, false),
      ],
      blockers: missing,
      manual_steps,
    };
  }

  const baseUrl = config!.baseUrl.replace(/\/$/, "");
  const verifyUrl = buildReferenceVerifyUrl(config!);

  stages.push(stage(
    "preflight_env",
    "Preflight PARTNER_FLOW_RP_* configuration",
    "pass",
    `partner_id=${config!.partnerId} policy_id=${config!.policyId}`,
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

  stages.push(stage(
    "holder_flow",
    "Holder authentication + verification",
    "blocked",
    "Requires interactive browser session (evaluate API uses requireBrowserSession). Not automated in CI.",
    false,
  ));

  const liveReceiptId = env[LIVE_SANDBOX_ENV_KEYS.liveReceiptId]?.trim() ?? "";
  if (!liveReceiptId) {
    stages.push(stage(
      "live_receipt_verify",
      "Server-side verify live issued receipt",
      "skipped",
      `Set ${LIVE_SANDBOX_ENV_KEYS.liveReceiptId} after a real sandbox run to fetch /api/receipts/{id}/public and validate trust.`,
      false,
    ));
    blockers.push("live_receipt_not_provided");
  } else {
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
          partnerId: config!.partnerId,
          policyId: config!.policyId,
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
  const infraPassed = manifestOk && !blockers.includes("hosted_verify_unreachable");
  let overall: LiveSandboxExecutionReport["overall"] = "blocked";
  if (liveReceiptPassed && infraPassed) {
    overall = "pass";
  } else if (infraPassed) {
    overall = "partial";
  }

  return {
    partner_id: config!.partnerId,
    policy_id: config!.policyId,
    base_url: baseUrl,
    overall,
    live_e2e_complete: liveReceiptPassed,
    stages,
    blockers,
    manual_steps,
  };
}
