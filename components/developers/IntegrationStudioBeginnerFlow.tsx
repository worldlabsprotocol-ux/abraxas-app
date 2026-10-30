"use client";

import { useState } from "react";
import { BeginnerCreateTestAppPanel } from "@/components/developers/BeginnerCreateTestAppPanel";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { IntegrationStudioRequestWorkbench } from "@/components/developers/IntegrationStudioRequestWorkbench";
import { Btn } from "@/components/redesign/ui";
import type { PolicyPackId } from "@/lib/partner/launchpad/policyPacks";
import type { IntegrationStudioPathId } from "@/lib/partner/integrationStudio/contract";

type ExistingApp = { id: string; application_name: string; policy_id: string };
type Choice = "choose" | "new" | "existing" | "example";

export function IntegrationStudioBeginnerFlow({
  sessionChecked, signedIn, walletAuthorized, configuredAppId, availableApps, choice,
  onChoiceChange, selectedAppId, onSelectedAppIdChange, autoRunTest,
  onAutoRunTestConsumed, packId, pathId, policyId, applicationName,
  onApplicationNameChange, onCreateSandbox, submitting, createError,
  workspaceStatusLine, onContinueWithWallet, onRefreshSession,
  sessionTechnicalDetail = null,
}: {
  sessionChecked: boolean;
  signedIn: boolean;
  walletAuthorized: boolean;
  configuredAppId: string | null;
  availableApps: ExistingApp[];
  choice: Choice;
  onChoiceChange: (choice: Choice) => void;
  selectedAppId: string | null;
  onSelectedAppIdChange: (id: string) => void;
  autoRunTest: boolean;
  onAutoRunTestConsumed: () => void;
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
  const [showSessionTechnical, setShowSessionTechnical] = useState(false);
  if (!sessionChecked) return <BuilderActiveTask taskKey="check-session" testId="beginner-session-loading" title="Checking your workspace" state="pending" status="Confirming your session" />;

  if (!signedIn && !walletAuthorized) {
    return <BuilderActiveTask
      taskKey="authorize-wallet" testId="beginner-sign-in-required"
      title="Connect your application" description="Sign in to continue."
      action={<Btn size="sm" onClick={onContinueWithWallet}>Continue with wallet</Btn>}
      advanced={<details className="abx-builder-technical-panel" open={showSessionTechnical} onToggle={(event) => setShowSessionTechnical((event.target as HTMLDetailsElement).open)}>
        <summary className="abx-builder-technical-toggle">Technical details</summary>
        {sessionTechnicalDetail ? <p>{sessionTechnicalDetail}</p> : null}
        <button type="button" className="abx-builder-inline-link" onClick={onRefreshSession}>Check session again</button>
      </details>}
    />;
  }

  if (choice === "choose") {
    return <BuilderActiveTask taskKey="choose-integration" testId="beginner-integration-choice"
      title="Connect your application" description="Choose how you want to start."
      action={<div className="abx-builder-choice-list">
        <button type="button" onClick={() => onChoiceChange("new")}><strong>Create a new integration</strong><span>Set up a sandbox app and test it.</span></button>
        <button type="button" onClick={() => onChoiceChange("existing")}><strong>Connect an existing application</strong><span>Choose an app in this workspace.</span></button>
        <button type="button" onClick={() => onChoiceChange("example")}><strong>Try an example</strong><span>Local developer setup after a sandbox test.</span></button>
      </div>}
      advanced={<details className="abx-builder-technical-panel"><summary className="abx-builder-technical-toggle">Developer example</summary><p>The reference application runs locally and requires developer setup. Connect an application first, then open the example.</p></details>}
    />;
  }

  if (choice === "existing" && !configuredAppId) {
    return <BuilderActiveTask taskKey="choose-existing-app" testId="beginner-existing-app"
      title="Choose your application" description="Only apps in your authorized workspace appear here."
      action={<div className="abx-builder-choice-list">
        {availableApps.map((app) => <button type="button" key={app.id} aria-pressed={selectedAppId === app.id} onClick={() => onSelectedAppIdChange(app.id)}><strong>{app.application_name}</strong><span>Use this application</span></button>)}
        {availableApps.length === 0 ? <p>No application is available yet. Create one to continue.</p> : null}
        <button type="button" onClick={() => onChoiceChange("new")}>Create a new integration</button>
        <button type="button" onClick={() => onChoiceChange("choose")}>Back</button>
      </div>}
    />;
  }

  if ((choice === "new" || choice === "example") && !configuredAppId) {
    return <BeginnerCreateTestAppPanel workspaceStatusLine={workspaceStatusLine} applicationName={applicationName}
      onApplicationNameChange={onApplicationNameChange} onSubmit={onCreateSandbox} submitting={submitting} error={createError} onBack={() => onChoiceChange("choose")} />;
  }

  return <IntegrationStudioRequestWorkbench packId={packId} pathId={pathId} policyId={policyId}
    beginnerSurface autoRunOnReady={autoRunTest} startWithExample={choice === "example"} onAutoRunConsumed={onAutoRunTestConsumed}
    onRefreshSession={onRefreshSession} />;
}
