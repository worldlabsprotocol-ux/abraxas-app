"use client";

import { AbraxasJourneyEmblemStatus } from "@/components/developers/AbraxasJourneyEmblemStatus";
import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function BeginnerCreateTestAppPanel({
  workspaceStatusLine,
  applicationName,
  onApplicationNameChange,
  onSubmit,
  submitting,
  error,
}: {
  workspaceStatusLine: string | null;
  applicationName: string;
  onApplicationNameChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  return (
    <div className="abx-builder-journey-shell" data-testid="beginner-create-test-app">
      <div className="abx-builder-journey-shell__inner abx-beginner-create-card">
        <AbraxasJourneyEmblemStatus
          state={workspaceStatusLine ? "ready" : "preparing_workspace"}
          detail={workspaceStatusLine ? "Ready" : "Checking workspace"}
        />
        <h2 className="abx-beginner-create-card__title">Create your test app</h2>
        <p className="abx-beginner-create-card__support">Start with a free test. No payment required.</p>
        {workspaceStatusLine ? (
          <p className="abx-beginner-create-card__status" role="status">
            {workspaceStatusLine}
          </p>
        ) : null}
        <label className="abx-beginner-create-card__field" style={{ fontFamily: FONT }}>
          Application name
          <input
            value={applicationName}
            onChange={(event) => onApplicationNameChange(event.target.value)}
            required
            autoComplete="off"
            placeholder="My test app"
          />
        </label>
        {error ? <p className="abx-builder-journey-error">{error}</p> : null}
        <Btn size="sm" disabled={submitting || !applicationName.trim()} loading={submitting} onClick={onSubmit}>
          Create my test app
        </Btn>
      </div>
    </div>
  );
}
