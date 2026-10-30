"use client";

import { useState } from "react";
import { BeginnerCreateTestAppPanel } from "@/components/developers/BeginnerCreateTestAppPanel";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { IntegrationStudioRequestWorkbench } from "@/components/developers/IntegrationStudioRequestWorkbench";
import { Btn } from "@/components/redesign/ui";
import { inferPolicyPackFromPolicyId, resolvePolicyPack, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

export function IntegrationStudioBeginnerFlow({
  sessionChecked,
  signedIn,
  walletAuthorized,
  configuredAppId,
  packId,
  policyOptions,
  pathId,
  policyId,
  applicationName,
  onApplicationNameChange,
  onPolicyPackChange,
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
  policyOptions: Array<{ id: PolicyPackId; label: string }>;
  pathId: IntegrationStudioPathId;
  policyId: string | null;
  applicationName: string;
  onApplicationNameChange: (value: string) => void;
  onPolicyPackChange: (policyPackId: PolicyPackId) => void;
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
  const boundPack = policyId
    ? inferPolicyPackFromPolicyId(policyId)
    : packId
      ? resolvePolicyPack(packId)
      : null;
  const displayedPolicy = boundPack?.display_name ?? policyId;

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
          <details
            className="abx-builder-technical-panel"
            open={showSessionTechnical}
            onToggle={(event) => setShowSessionTechnical((event.target as HTMLDetailsElement).open)}
          >
            <summary className="abx-builder-technical-toggle">Technical details</summary>
            {sessionTechnicalDetail ? <p>{sessionTechnicalDetail}</p> : null}
            <button type="button" className="abx-builder-inline-link" onClick={onRefreshSession}>
              Check session again
            </button>
          </details>
        }
      >
        {displayedPolicy ? <p>Selected policy: <strong>{displayedPolicy}</strong></p> : null}
      </BuilderActiveTask>
    );
  }

  if (!configuredAppId) {
    return (
      <BeginnerCreateTestAppPanel
        workspaceStatusLine={workspaceStatusLine}
        applicationName={applicationName}
        onApplicationNameChange={onApplicationNameChange}
        policyPackId={packId}
        policyOptions={policyOptions}
        onPolicyPackChange={onPolicyPackChange}
        onSubmit={onCreateSandbox}
        submitting={submitting}
        error={createError}
      />
    );
  }

  return (
    <>
      {displayedPolicy ? (
        <div className="abx-builder-journey-shell">
          <div className="abx-builder-journey-shell__inner">
            <p className="abx-builder-journey-support">
              This test app is configured to verify <strong>{displayedPolicy}</strong>.
            </p>
          </div>
        </div>
      ) : null}
      <IntegrationStudioRequestWorkbench
        packId={boundPack?.id ?? packId}
        pathId={pathId}
        policyId={policyId}
        beginnerSurface
        onRefreshSession={onRefreshSession}
      />
    </>
  );
}
