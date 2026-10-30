"use client";

import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { Btn } from "@/components/redesign/ui";

export function BeginnerCreateTestAppPanel({
  workspaceStatusLine,
  applicationName,
  onApplicationNameChange,
  onSubmit,
  submitting,
  error,
  onBack,
}: {
  workspaceStatusLine: string | null;
  applicationName: string;
  onApplicationNameChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
  onBack?: () => void;
}) {
  return (
    <BuilderActiveTask
      taskKey="create-test-app"
      testId="beginner-create-test-app"
      title="Create your test app"
      description="Create a sandbox app and see how verification works."
      state={submitting || !workspaceStatusLine ? "pending" : error ? "failure" : "ready"}
      status={submitting ? "Creating your app" : !workspaceStatusLine ? "Checking workspace" : undefined}
      error={error}
      action={
        <Btn size="sm" disabled={submitting || !applicationName.trim()} loading={submitting} onClick={onSubmit}>
          Create and run test
        </Btn>
      }
      advanced={onBack ? <button type="button" className="abx-builder-inline-link" onClick={onBack}>Back</button> : null}
    >
      <label className="abx-beginner-create-card__field">
        Application name
        <input
          value={applicationName}
          onChange={(event) => onApplicationNameChange(event.target.value)}
          required
          autoComplete="off"
          placeholder="My test app"
        />
      </label>
    </BuilderActiveTask>
  );
}
