"use client";

import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { Btn } from "@/components/redesign/ui";
import { isPolicyPackId, type PolicyPackId } from "@/lib/partner/launchpad/policyPacks";

export function BeginnerCreateTestAppPanel({
  workspaceStatusLine,
  applicationName,
  onApplicationNameChange,
  policyPackId,
  policyOptions,
  onPolicyPackChange,
  onSubmit,
  submitting,
  error,
}: {
  workspaceStatusLine: string | null;
  applicationName: string;
  onApplicationNameChange: (value: string) => void;
  policyPackId: PolicyPackId | null;
  policyOptions: Array<{ id: PolicyPackId; label: string }>;
  onPolicyPackChange: (policyPackId: PolicyPackId) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  return (
    <BuilderActiveTask
      taskKey="create-test-app"
      testId="beginner-create-test-app"
      title="Create your test app"
      description="Start with a free test. No payment required."
      state={submitting || !workspaceStatusLine ? "pending" : error ? "failure" : "ready"}
      status={submitting ? "Creating your app" : !workspaceStatusLine ? "Checking workspace" : undefined}
      error={error}
      action={
        <Btn
          size="sm"
          disabled={submitting || !applicationName.trim() || !policyPackId}
          loading={submitting}
          onClick={onSubmit}
        >
          Create my test app
        </Btn>
      }
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
      <label className="abx-beginner-create-card__field">
        What should Abraxas verify?
        <select
          value={policyPackId ?? ""}
          onChange={(event) => {
            if (
              isPolicyPackId(event.target.value)
              && policyOptions.some((option) => option.id === event.target.value)
            ) {
              onPolicyPackChange(event.target.value);
            }
          }}
          required
          disabled={submitting}
        >
          <option value="" disabled>Choose a policy</option>
          {policyOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </label>
    </BuilderActiveTask>
  );
}
