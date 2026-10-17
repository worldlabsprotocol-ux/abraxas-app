// FILE: lib/partner/launchpad/launchpadDeepLink.ts
// Canonical Launchpad URL query parsing (view/step/application/app).

import { mapLegacyLaunchpadStep } from "@/lib/partner/launchpad/journeyState";
import { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF } from "@/lib/partner/launchpad/institutionalActivationEntry";

export type LaunchpadWizardStageId =
  | "verify"
  | "test_app"
  | "connect"
  | "test"
  | "go_live"
  | "advanced";

const STAGE_IDS: LaunchpadWizardStageId[] = [
  "verify",
  "test_app",
  "connect",
  "test",
  "go_live",
  "advanced",
];

function isStageId(value: string): value is LaunchpadWizardStageId {
  return (STAGE_IDS as string[]).includes(value);
}

export function parseLaunchpadStageFromSearch(
  search: string | URLSearchParams | null | undefined,
): LaunchpadWizardStageId | null {
  if (!search) return null;
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const raw = params.get("view")?.trim() || params.get("step")?.trim();
  if (!raw) return null;
  if (isStageId(raw)) return raw;
  const mapped = mapLegacyLaunchpadStep(raw);
  return isStageId(mapped) ? mapped : null;
}

export function parseLaunchpadApplicationIdFromSearch(
  search: string | URLSearchParams | null | undefined,
): string | null {
  if (!search) return null;
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const id = params.get("application")?.trim() || params.get("app")?.trim();
  return id || null;
}

export function buildLaunchpadSearchParams(input: {
  stage?: LaunchpadWizardStageId | null;
  applicationId?: string | null;
  template?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (input.template?.trim()) params.set("template", input.template.trim());
  if (input.applicationId?.trim()) params.set("application", input.applicationId.trim());
  if (input.stage) {
    params.set("view", input.stage);
    params.set("step", input.stage);
  }
  return params;
}

export function buildInstitutionalLaunchpadHref(input: {
  applicationId?: string | null;
  stage?: LaunchpadWizardStageId | null;
}): string {
  const params = buildLaunchpadSearchParams({
    template: "sandbox_institutional_protocol_access",
    applicationId: input.applicationId,
    stage: input.stage,
  });
  const query = params.toString();
  return query ? `${INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF.split("?")[0]}?${query}` : INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF;
}

export const LAUNCHPAD_STAGE_PANEL_ID = "launchpad-stage-panel" as const;

export function launchpadStagePanelDomId(stage: LaunchpadWizardStageId): string {
  return `${LAUNCHPAD_STAGE_PANEL_ID}-${stage}`;
}
