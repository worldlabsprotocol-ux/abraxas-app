// FILE: lib/partner/launchpad/formatHarnessResultForBuilder.ts

import type { LaunchpadTestRunResult } from "./runTestScenario";

export type BuilderHarnessOutcome = {
  headline: string;
  summary: string;
  tone: "success" | "denied" | "attention";
  observedAccess: string;
  passed: boolean;
  nextActionLabel: string;
  receiptId: string | null;
};

export function formatHarnessResultForBuilder(result: LaunchpadTestRunResult): BuilderHarnessOutcome {
  const observed = result.observed_access ?? "unknown";
  const passed = Boolean(result.passed);
  const receiptId = result.persistence?.receipt_id ?? result.callback_params?.receipt_id ?? null;

  if (passed && observed === "allow") {
    return {
      headline: "Your test worked.",
      summary:
        "Abraxas returned an allow outcome for this sandbox scenario. Your application would receive a signed permit result you can verify independently.",
      tone: "success",
      observedAccess: observed,
      passed: true,
      nextActionLabel: "Connect to my application",
      receiptId: receiptId ? String(receiptId) : null,
    };
  }

  if (observed === "deny") {
    return {
      headline: "This test did not authorize access.",
      summary:
        "The harness observed a deny outcome. Review policy binding, scenario selection, and receipt validity before relying on this path.",
      tone: "denied",
      observedAccess: observed,
      passed: false,
      nextActionLabel: "Review response details",
      receiptId: receiptId ? String(receiptId) : null,
    };
  }

  return {
    headline: "Test finished with an indeterminate outcome.",
    summary:
      "The harness completed but the observed access does not match a clear permit or deny. Inspect the response and receipt material before continuing.",
    tone: "attention",
    observedAccess: observed,
    passed: false,
    nextActionLabel: "Review response details",
    receiptId: receiptId ? String(receiptId) : null,
  };
}
