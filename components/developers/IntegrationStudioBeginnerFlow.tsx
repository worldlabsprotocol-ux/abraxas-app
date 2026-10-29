"use client";

import { useState } from "react";
import { BeginnerCreateTestAppPanel } from "@/components/developers/BeginnerCreateTestAppPanel";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { IntegrationStudioRequestWorkbench } from "@/components/developers/IntegrationStudioRequestWorkbench";
import { Btn } from "@/components/redesign/ui";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

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
      <BuilderActiveTask
        taskKey="check-session"
        testId="beginner-session-loading"
        title="Checking your workspace"
        state="pending"
        status="Confirming your session"
      />
    );
  }

  if (!builderAuthorized) {
    return (
      <BuilderActiveTask
        taskKey="authorize-wallet"
        testId="beginner-sign-in-required"
        title="Create your test app"
        description="Connect your wallet to continue."
        action={<Btn size="sm" onClick={onContinueWithWallet}>Continue with wallet</Btn>}
        advanced={
          <>
            <button type="button" className="abx-builder-inline-link" onClick={onRefreshSession}>
              Check again
            </button>
            {sessionTechnicalDetail ? (
              <details
                className="abx-beginner-create-card__technical"
                open={showSessionTechnical}
                onToggle={(event) => setShowSessionTechnical((event.target as HTMLDetailsElement).open)}
              >
                <summary>Technical details</summary>
                <p>{sessionTechnicalDetail}</p>
              </details>
            ) : null}
          </>
        }
      />
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
