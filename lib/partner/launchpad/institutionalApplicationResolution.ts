// FILE: lib/partner/launchpad/institutionalApplicationResolution.ts
// Resolve which partner apps qualify for the institutional integration workspace.

import {
  INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
  INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF,
} from "@/lib/partner/launchpad/institutionalActivationEntry";
import { buildInstitutionalLaunchpadHref } from "@/lib/partner/launchpad/launchpadDeepLink";

export interface PartnerApplicationSummary {
  id: string;
  display_name: string;
  environment: string;
  policy_template_id: string;
}

export interface InstitutionalWorkspaceApplicationResolution {
  institutionalApps: PartnerApplicationSummary[];
  otherSandboxApps: PartnerApplicationSummary[];
  selectedInstitutionalAppId: string | null;
  queryApplicationId: string | null;
  queryApplication: PartnerApplicationSummary | null;
  mismatch: {
    kind: "query_not_institutional" | "sandbox_apps_without_institutional_template";
    message: string;
    recovery_href: string;
    recovery_label: string;
  } | null;
}

export function partitionInstitutionalPartnerApplications(
  applications: PartnerApplicationSummary[],
): Pick<InstitutionalWorkspaceApplicationResolution, "institutionalApps" | "otherSandboxApps"> {
  const institutionalApps = applications.filter(
    (app) => app.policy_template_id === INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
  );
  const otherSandboxApps = applications.filter(
    (app) =>
      app.environment !== "production"
      && app.policy_template_id !== INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID,
  );
  return { institutionalApps, otherSandboxApps };
}

export function resolveInstitutionalWorkspaceApplications(input: {
  applications: PartnerApplicationSummary[];
  queryApplicationId?: string | null;
}): InstitutionalWorkspaceApplicationResolution {
  const { institutionalApps, otherSandboxApps } = partitionInstitutionalPartnerApplications(
    input.applications,
  );
  const queryApplicationId = input.queryApplicationId?.trim() || null;
  const queryApplication =
    queryApplicationId
      ? input.applications.find((app) => app.id === queryApplicationId) ?? null
      : null;

  let selectedInstitutionalAppId: string | null = null;
  if (
    queryApplicationId
    && institutionalApps.some((app) => app.id === queryApplicationId)
  ) {
    selectedInstitutionalAppId = queryApplicationId;
  } else {
    selectedInstitutionalAppId = institutionalApps[0]?.id ?? null;
  }

  let mismatch: InstitutionalWorkspaceApplicationResolution["mismatch"] = null;

  if (
    queryApplication
    && queryApplication.policy_template_id !== INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID
  ) {
    mismatch = {
      kind: "query_not_institutional",
      message: `"${queryApplication.display_name}" uses policy template ${queryApplication.policy_template_id}. The institutional integration workspace only serves ${INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID}.`,
      recovery_href: buildInstitutionalLaunchpadHref({
        applicationId: queryApplication.id,
        stage: "verify",
      }),
      recovery_label: "Select institutional protocol access in Launchpad",
    };
  } else if (institutionalApps.length === 0 && otherSandboxApps.length > 0) {
    const example = otherSandboxApps[0];
    mismatch = {
      kind: "sandbox_apps_without_institutional_template",
      message: example
        ? `Sandbox application "${example.display_name}" exists, but it is not bound to ${INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID}.`
        : `Sandbox applications exist for this partner, but none use ${INSTITUTIONAL_SANDBOX_POLICY_TEMPLATE_ID}.`,
      recovery_href: buildInstitutionalLaunchpadHref({ stage: "verify" }),
      recovery_label: "Open institutional Launchpad",
    };
  }

  return {
    institutionalApps,
    otherSandboxApps,
    selectedInstitutionalAppId,
    queryApplicationId,
    queryApplication,
    mismatch,
  };
}

export function institutionalLaunchpadHrefForApplication(applicationId: string): string {
  return buildInstitutionalLaunchpadHref({ applicationId, stage: null });
}

export { INSTITUTIONAL_SANDBOX_LAUNCHPAD_HREF };
