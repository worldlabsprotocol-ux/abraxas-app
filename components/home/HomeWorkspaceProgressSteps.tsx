"use client";
// FILE: components/home/HomeWorkspaceProgressSteps.tsx

import { HOMEPAGE_WORKSPACE_STEPS } from "@/lib/home/homepagePlainCopy";
import type { WorkspaceSessionMode } from "@/lib/home/useHomeWorkspaceSession";

function stepState(
  stepId: (typeof HOMEPAGE_WORKSPACE_STEPS)[number]["id"],
  mode: WorkspaceSessionMode,
): "complete" | "current" | "upcoming" {
  if (mode === "loading" || mode === "native_disabled" || mode === "native_unavailable") return "upcoming";
  if (stepId === "account") {
    if (mode === "needs_account") return "current";
    return mode === "needs_workspace" || mode === "has_workspace" || mode === "ephemeral_sandbox_ready"
      ? "complete"
      : "upcoming";
  }
  if (stepId === "workspace") {
    if (mode === "needs_workspace" || mode === "ephemeral_sandbox_ready") return "current";
    if (mode === "has_workspace") return "complete";
    return "upcoming";
  }
  // Run a test — never marked complete without authoritative run data
  if (mode === "has_workspace") return "current";
  return "upcoming";
}

export function HomeWorkspaceProgressSteps({ mode }: { mode: WorkspaceSessionMode }) {
  return (
    <ol className="abx-workspace-progress" aria-label="Workspace setup steps">
      {HOMEPAGE_WORKSPACE_STEPS.map((step, index) => {
        const state = stepState(step.id, mode);
        return (
          <li
            key={step.id}
            className={`abx-workspace-progress__step abx-workspace-progress__step--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="abx-workspace-progress__index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="abx-workspace-progress__label">{step.label}</span>
            {state === "complete" ? (
              <span className="abx-workspace-progress__status sr-only">Complete</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
