// FILE: lib/partner/twoAppEvaluation/evaluationUx.ts
// Human-readable evaluation UX helpers — pure functions for progress and next steps.

import { POLICY_PACKS, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

export type EvaluationProgressStepId =
  | "sandbox"
  | "app_a"
  | "verify_a"
  | "app_b"
  | "verify_b"
  | "reuse";

export interface EvaluationProgressStep {
  id: EvaluationProgressStepId;
  label: string;
  status: "complete" | "current" | "upcoming";
}

export interface EvaluationNextStep {
  title: string;
  body: string;
  primaryHref: string | null;
  primaryLabel: string | null;
  secondaryHref: string | null;
  secondaryLabel: string | null;
}

type ChecklistItem = { id: string; label: string; status: string };

function packDisclosure(packId: string): { receives: string; withheld: string[] } | null {
  const pack = POLICY_PACKS[packId as PolicyPackId];
  if (!pack) return null;
  return {
    receives: pack.partner_receives,
    withheld: [...pack.partner_does_not_receive],
  };
}

export function humanStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    invited: "Getting started",
    discovery_complete: "Discovery complete",
    sandbox_ready: "Sandbox ready",
    app_a_configured: "App A configured",
    app_a_result_verified: "App A verified",
    app_b_configured: "App B configured",
    reuse_attempted: "Reuse in progress",
    app_b_result_verified: "App B verified",
    reuse_confirmed: "Reuse confirmed",
    evidence_ready: "Evidence ready",
    evaluation_complete: "Evaluation complete",
    blocked: "Blocked",
    abandoned: "Abandoned",
  };
  return labels[stage] ?? stage.replace(/_/g, " ");
}

export function firstPendingChecklistItem(items: ChecklistItem[]): ChecklistItem | null {
  return items.find((i) => i.status === "pending" || i.status === "failed") ?? null;
}

export function buildEvaluationProgressSteps(input: {
  stage: string;
  app_a_verified: boolean;
  app_b_verified: boolean;
  reuse_accepted: boolean;
}): EvaluationProgressStep[] {
  const { stage, app_a_verified, app_b_verified, reuse_accepted } = input;
  const complete = new Set<EvaluationProgressStepId>();

  if (stage !== "invited") complete.add("sandbox");
  if (app_a_verified) {
    complete.add("app_a");
    complete.add("verify_a");
  } else if (["app_a_configured", "app_a_result_verified", "app_b_configured", "reuse_attempted", "app_b_result_verified", "reuse_confirmed", "evidence_ready", "evaluation_complete"].includes(stage)) {
    complete.add("app_a");
  }
  if (reuse_accepted || app_b_verified) complete.add("reuse");
  if (app_b_verified) {
    complete.add("app_b");
    complete.add("verify_b");
  } else if (["app_b_configured", "reuse_attempted", "app_b_result_verified", "reuse_confirmed", "evidence_ready", "evaluation_complete"].includes(stage)) {
    complete.add("app_b");
  }
  if (stage === "evaluation_complete") {
    for (const id of ["sandbox", "app_a", "verify_a", "app_b", "verify_b", "reuse"] as const) {
      complete.add(id);
    }
  }

  const steps: Array<{ id: EvaluationProgressStepId; label: string }> = [
    { id: "sandbox", label: "Sandbox" },
    { id: "app_a", label: "App A" },
    { id: "verify_a", label: "Verify A" },
    { id: "reuse", label: "Reuse" },
    { id: "app_b", label: "App B" },
    { id: "verify_b", label: "Verify B" },
  ];

  let currentAssigned = false;
  return steps.map((step) => {
    if (complete.has(step.id)) {
      return { ...step, status: "complete" as const };
    }
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, status: "current" as const };
    }
    return { ...step, status: "upcoming" as const };
  });
}

export function deriveEvaluationNextStep(input: {
  stage: string;
  app_a: { application_id?: string; items: ChecklistItem[]; server_verification_passed: boolean };
  app_b: { application_id?: string; items: ChecklistItem[]; server_verification_passed: boolean };
  reuse_status: string;
  evaluation_id: string;
}): EvaluationNextStep {
  const appAId = input.app_a.application_id;
  const appBId = input.app_b.application_id;
  const launchpadA = appAId
    ? `/developers/launchpad?app=${encodeURIComponent(appAId)}&view=configure`
    : "/developers/launchpad";
  const launchpadB = appBId
    ? `/developers/launchpad?app=${encodeURIComponent(appBId)}&view=configure`
    : "/developers/launchpad";

  if (input.stage === "evaluation_complete") {
    return {
      title: "Evaluation complete",
      body: "Both applications verified server-side and reuse was observed. Export evidence or schedule a review conversation.",
      primaryHref: `/api/evaluation/two-app/${input.evaluation_id}?export=evidence`,
      primaryLabel: "Export evidence JSON",
      secondaryHref: "/proof",
      secondaryLabel: "View reference proof",
    };
  }

  if (!input.app_a.server_verification_passed) {
    const pending = firstPendingChecklistItem(input.app_a.items);
    return {
      title: "Next: first verified result (App A)",
      body: pending
        ? `${pending.label}${pending.status === "failed" ? " — check the note below and retry." : "."} Your server must verify the signed result before granting access.`
        : "Configure App A, run holder verification, then verify the result on your server.",
      primaryHref: launchpadA,
      primaryLabel: "Open App A in Launchpad",
      secondaryHref: "/docs/VERIFY_WITH_ABRAXAS_QUICKSTART",
      secondaryLabel: "Integration quickstart",
    };
  }

  if (input.reuse_status !== "accepted" && !input.app_b.server_verification_passed) {
    const pending = firstPendingChecklistItem(input.app_b.items);
    return {
      title: "Next: reuse evidence in App B",
      body: pending
        ? `${pending.label}. App B should issue its own application-bound result — not a copy of App A's result.`
        : "Start App B verification. Compatible evidence can satisfy the policy without collecting identity again.",
      primaryHref: launchpadB,
      primaryLabel: "Open App B in Launchpad",
      secondaryHref: `/evaluation/two-app?id=${encodeURIComponent(input.evaluation_id)}`,
      secondaryLabel: "Refresh checklist",
    };
  }

  if (!input.app_b.server_verification_passed) {
    return {
      title: "Next: verify App B on your server",
      body: "Reuse may be accepted. Verify App B's distinct signed result server-side before granting access.",
      primaryHref: launchpadB,
      primaryLabel: "Open App B in Launchpad",
      secondaryHref: "/docs/VERIFY_WITH_ABRAXAS_QUICKSTART",
      secondaryLabel: "Server verification guide",
    };
  }

  return {
    title: "Refresh to confirm completion",
    body: "If both checklists show server verification succeeded, refresh status to update the reuse summary.",
    primaryHref: `/evaluation/two-app?id=${encodeURIComponent(input.evaluation_id)}`,
    primaryLabel: "Refresh evaluation",
    secondaryHref: null,
    secondaryLabel: null,
  };
}

export function policyPackDisclosureForEval(packId: string): { receives: string; withheld: string[] } | null {
  return packDisclosure(packId);
}

export function reuseCausalityHeadline(metrics: {
  underlying_verification_events: number | null;
  applications_with_verified_results: number;
  additional_raw_kyc_recollections: number | null;
}): string {
  const events = metrics.underlying_verification_events ?? 0;
  const apps = metrics.applications_with_verified_results;
  const recollections = metrics.additional_raw_kyc_recollections ?? 0;
  if (events === 1 && apps >= 2 && recollections === 0) {
    return "One verification supported two application decisions";
  }
  if (apps >= 2) {
    return "Multiple applications verified from shared evidence";
  }
  return "Reuse path in progress";
}
