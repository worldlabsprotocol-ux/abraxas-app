"use client";

import { BeginnerCreateTestAppPanel } from "@/components/developers/BeginnerCreateTestAppPanel";
import { IntegrationStudioRequestWorkbench } from "@/components/developers/IntegrationStudioRequestWorkbench";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { Btn } from "@/components/redesign/ui";
import { INTEGRATION_STUDIO_PROVISION } from "@/lib/partner/integrationStudio/contract";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

type ResumableApp = {
  id: string;
  application_name: string;
  policy_id: string;
};

export function IntegrationStudioBeginnerFlow({
  sessionChecked,
  signedIn,
  configuredAppId,
  packId,
  pathId,
  policyId,
  applicationName,
  onApplicationNameChange,
  onCreateSandbox,
  submitting,
  createError,
  workspaceStatusLine,
  onRefreshSession,
}: {
  sessionChecked: boolean;
  signedIn: boolean;
  configuredAppId: string | null;
  packId: PolicyPackId | null;
  pathId: IntegrationStudioPathId;
  policyId: string | null;
  applicationName: string;
  onApplicationNameChange: (value: string) => void;
  onCreateSandbox: () => void;
  submitting: boolean;
  createError: string;
  workspaceStatusLine: string | null;
  onRefreshSession: () => void;
}) {
  if (!sessionChecked) {
    return (
      <div className="abx-builder-journey-shell" data-testid="beginner-session-loading">
        <div className="abx-builder-journey-shell__inner">
          <AbraxasJourneyEmblemStatus state="preparing_workspace" detail="Loading your workspace" />
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="abx-builder-journey-shell" data-testid="beginner-sign-in-required">
        <div className="abx-builder-journey-shell__inner abx-beginner-create-card">
          <AbraxasJourneyEmblemStatus state="needs_attention" detail="Sign in to continue" />
          <h2 className="abx-beginner-create-card__title">Create your test app</h2>
          <p className="abx-beginner-create-card__support">Start with a free test. No payment required.</p>
          <p className="abx-beginner-create-card__status" style={{ fontFamily: FONT }}>
            Your Launchpad session is not active.
          </p>
          <Btn href={INTEGRATION_STUDIO_PROVISION.launchpad_href} size="sm">
            Sign in
          </Btn>
          <Btn size="sm" variant="ghost" onClick={onRefreshSession}>
            Check again
          </Btn>
        </div>
      </div>
    );
  }

  if (!configuredAppId) {
    return (
      <BeginnerCreateTestAppPanel
        workspaceStatusLine={workspaceStatusLine}
        applicationName={applicationName}
        onApplicationNameChange={onApplicationNameChange}
        onSubmit={onCreateSandbox}
        submitting={submitting}
        error={createError}
      />
    );
  }

  return (
    <IntegrationStudioRequestWorkbench
      packId={packId}
      pathId={pathId}
      policyId={policyId}
      beginnerSurface
    />
  );
}
