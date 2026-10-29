"use client";

import { useState } from "react";
import { BeginnerCreateTestAppPanel } from "@/components/developers/BeginnerCreateTestAppPanel";
import { IntegrationStudioRequestWorkbench } from "@/components/developers/IntegrationStudioRequestWorkbench";
import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { Btn } from "@/components/redesign/ui";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function IntegrationStudioBeginnerFlow({
  sessionChecked,
  signedIn,
  walletAuthorized,
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
  onContinueWithWallet,
  onRefreshSession,
  sessionTechnicalDetail = null,
}: {
  sessionChecked: boolean;
  signedIn: boolean;
  /** Ephemeral wallet sign-in satisfied (homepage builder path). */
  walletAuthorized: boolean;
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
  onContinueWithWallet: () => void;
  onRefreshSession: () => void;
  sessionTechnicalDetail?: string | null;
}) {
  const builderAuthorized = signedIn || walletAuthorized;
  const [showSessionTechnical, setShowSessionTechnical] = useState(false);

  if (!sessionChecked) {
    return (
      <div
        className="abx-builder-journey-shell"
        data-testid="beginner-session-loading"
        data-homepage-active-task="1"
      >
        <div className="abx-builder-journey-shell__inner">
          <AbraxasJourneyEmblemStatus state="preparing_workspace" detail="Loading your workspace" />
        </div>
      </div>
    );
  }

  if (!builderAuthorized) {
    return (
      <div
        className="abx-builder-journey-shell"
        data-testid="beginner-sign-in-required"
        data-homepage-active-task="1"
      >
        <div className="abx-builder-journey-shell__inner abx-beginner-create-card">
          <h2 className="abx-beginner-create-card__title">Create your test app</h2>
          <p className="abx-beginner-create-card__support" style={{ fontFamily: FONT }}>
            Connect your wallet to continue.
          </p>
          <Btn size="sm" onClick={onContinueWithWallet}>
            Continue with wallet
          </Btn>
          <Btn size="sm" variant="ghost" onClick={onRefreshSession}>
            Check again
          </Btn>
          {sessionTechnicalDetail ? (
            <details
              className="abx-beginner-create-card__technical"
              open={showSessionTechnical}
              onToggle={(event) => setShowSessionTechnical((event.target as HTMLDetailsElement).open)}
            >
              <summary style={{ fontFamily: FONT, cursor: "pointer", fontSize: "0.72rem" }}>
                Technical details
              </summary>
              <p style={{ fontFamily: FONT, fontSize: "0.72rem", marginTop: "0.35rem" }}>
                {sessionTechnicalDetail}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    );
  }

  if (!configuredAppId) {
    return (
      <div data-homepage-active-task="1">
        <BeginnerCreateTestAppPanel
          workspaceStatusLine={workspaceStatusLine}
          applicationName={applicationName}
          onApplicationNameChange={onApplicationNameChange}
          onSubmit={onCreateSandbox}
          submitting={submitting}
          error={createError}
        />
      </div>
    );
  }

  return (
    <div data-homepage-active-task="1">
      <IntegrationStudioRequestWorkbench
        packId={packId}
        pathId={pathId}
        policyId={policyId}
        beginnerSurface
      />
    </div>
  );
}
