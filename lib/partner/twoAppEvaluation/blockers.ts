// FILE: lib/partner/twoAppEvaluation/blockers.ts
// Controlled blocker categories from observed failure states.

import type { TwoAppEvaluationBlockerCategory } from "./contract";
import type { AppEvaluationChecklist } from "./contract";
import type { ReuseObservation } from "./contract";

export function detectEvaluationBlockers(input: {
  app_a: AppEvaluationChecklist;
  app_b: AppEvaluationChecklist;
  reuse: ReuseObservation;
  explicit?: TwoAppEvaluationBlockerCategory | null;
}): TwoAppEvaluationBlockerCategory[] {
  if (input.explicit) return [input.explicit];

  const blockers: TwoAppEvaluationBlockerCategory[] = [];

  const appAVerify = input.app_a.items.find((i) => i.id === "server_verify");
  if (appAVerify?.status === "failed") blockers.push("server_verification");

  const callback = input.app_a.items.find((i) => i.id === "callback");
  if (callback?.status === "pending" && input.app_a.items.find((i) => i.id === "request")?.status === "observed") {
    blockers.push("callback_configuration");
  }

  const credential = input.app_a.items.find((i) => i.id === "credential");
  if (credential?.status === "pending") blockers.push("authentication");

  const holder = input.app_a.items.find((i) => i.id === "holder");
  if (holder?.status === "pending" && input.app_a.items.find((i) => i.id === "request")?.status === "observed") {
    blockers.push("holder_flow");
  }

  if (input.reuse.status === "rejected" || input.reuse.status === "refresh_required") {
    blockers.push("reuse_not_compatible");
  }

  const appBVerify = input.app_b.items.find((i) => i.id === "server_verify");
  if (appBVerify?.status === "failed") blockers.push("server_verification");

  return Array.from(new Set(blockers));
}
