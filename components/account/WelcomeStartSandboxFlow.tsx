"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";

type Step = "account" | "sandbox" | "done";

export function WelcomeStartSandboxFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSandbox = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/sandbox/enroll", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ application_name: "Sandbox application" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.code ?? "Sandbox enrollment failed.");
        return;
      }
      setStep("done");
      router.push("/developers/launchpad");
    } catch {
      setError("Sandbox enrollment failed.");
    } finally {
      setBusy(false);
    }
  }, [router]);

  if (step === "account") {
    return (
      <div>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Step 1 — Create or sign in to your Abraxas account with a passkey. No Google sign-in or identity verification.
        </p>
        <NativeAccountPasskeyPanel
          mode="register"
          label="Create passkey account"
          onSuccess={(id) => {
            setAccountId(id);
            setStep("sandbox");
          }}
        />
        <div style={{ marginTop: "0.75rem" }}>
          <NativeAccountPasskeyPanel
            mode="authenticate"
            label="Sign in with existing passkey"
            onSuccess={(id) => {
              setAccountId(id);
              setStep("sandbox");
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "sandbox") {
    return (
      <div>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Step 2 — Provision your tenant-scoped sandbox. This is a separate authorized action from account creation.
        </p>
        {accountId ? (
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "var(--text-tertiary, var(--text-secondary))" }}>
            Signed in as <code>{accountId}</code>
          </p>
        ) : null}
        <Btn size="sm" disabled={busy} onClick={() => void startSandbox()}>
          {busy ? "Starting sandbox…" : "Start sandbox"}
        </Btn>
        {error ? (
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--status-danger, #c44)" }}>{error}</p>
        ) : null}
      </div>
    );
  }

  return null;
}
