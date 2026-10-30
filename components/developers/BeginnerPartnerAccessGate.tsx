"use client";

import { useState } from "react";
import { BuilderActiveTask } from "@/components/developers/BuilderActiveTask";
import { NativeAccountSolanaPanel } from "@/components/account/NativeAccountSolanaPanel";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";
import { Btn } from "@/components/redesign/ui";
import {
  establishLaunchpadSessionWithAccount,
  establishLaunchpadSessionWithApiKey,
} from "@/lib/partner/launchpad/launchpadSessionClient";

/** Resolve application access in place; the server still checks membership and test authorization. */
export function BeginnerPartnerAccessGate({
  applicationId,
  onReady,
}: {
  applicationId: string;
  onReady: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAccountSignIn, setShowAccountSignIn] = useState(false);
  const [sandboxKey, setSandboxKey] = useState("");

  async function resumeWithAccount() {
    setBusy(true);
    setError("");
    try {
      const result = await establishLaunchpadSessionWithAccount({ applicationId });
      if (result.ok) {
        await onReady();
        return;
      }
      if (result.status === 401) {
        setShowAccountSignIn(true);
        setError("Sign in with the account that owns this app.");
      } else if (result.status === 403) {
        setShowAccountSignIn(true);
        setError("This account cannot access this app. Try its owner account or a sandbox key.");
      } else {
        setError("We could not open this app. Try again.");
      }
    } catch {
      setError("Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resumeWithKey() {
    if (!sandboxKey.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await establishLaunchpadSessionWithApiKey(sandboxKey);
      if (!result.ok) {
        setError("That sandbox key could not open this app.");
        return;
      }
      const appsResponse = await fetch("/api/launchpad/applications", { credentials: "include" });
      const apps = await appsResponse.json() as { workspace?: { applications?: Array<{ id: string }> } };
      if (!appsResponse.ok || !apps.workspace?.applications?.some((app) => app.id === applicationId)) {
        setError("That sandbox key does not belong to this app.");
        return;
      }
      setSandboxKey("");
      await onReady();
    } catch {
      setError("Connection lost. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <BuilderActiveTask
      taskKey="partner-access-needed"
      testId="builder-partner-access-needed"
      title="Continue your test"
      description="Confirm access to your app to run its sandbox test."
      state={busy ? "pending" : error ? "failure" : "ready"}
      status={busy ? "Checking app access" : undefined}
      error={error}
      action={!showAccountSignIn ? (
        <Btn size="sm" disabled={busy} loading={busy} onClick={() => void resumeWithAccount()}>
          Continue with your account
        </Btn>
      ) : null}
      advanced={
        <details className="abx-builder-technical-panel">
          <summary className="abx-builder-technical-toggle">Use a sandbox key</summary>
          <label className="abx-beginner-create-card__field">
            Sandbox key
            <input type="password" autoComplete="off" value={sandboxKey}
              onChange={(event) => setSandboxKey(event.target.value)} />
          </label>
          <Btn size="sm" disabled={busy || !sandboxKey.trim()} onClick={() => void resumeWithKey()}>
            Continue with key
          </Btn>
        </details>
      }
    >
      {showAccountSignIn ? (
        <div className="abx-builder-access-auth">
          <NativeAccountSolanaPanel hideIntro onSuccess={() => void resumeWithAccount()} />
          <details className="abx-builder-technical-panel">
            <summary className="abx-builder-technical-toggle">Use a passkey instead</summary>
            <NativeAccountPasskeyPanel mode="authenticate" label="Sign in with passkey"
              onSuccess={() => void resumeWithAccount()} />
          </details>
        </div>
      ) : null}
    </BuilderActiveTask>
  );
}
