"use client";

import { useCallback, useEffect, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { Btn } from "@/components/redesign/ui";

type NativeEnabledState = "unknown" | "disabled" | "enabled";

export function NativeAccountPasskeyPanel(props: {
  mode: "register" | "authenticate";
  onSuccess?: (accountId: string) => void;
  label?: string;
}) {
  const [enabledState, setEnabledState] = useState<NativeEnabledState>("unknown");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/native/enabled", { credentials: "include" })
      .then((r) => r.json())
      .then((json: { enabled?: boolean }) => {
        if (!cancelled) setEnabledState(json.enabled ? "enabled" : "disabled");
      })
      .catch(() => {
        if (!cancelled) setEnabledState("disabled");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      if (enabledState !== "enabled") {
        setError("Native passkey sign-in is not enabled in this environment.");
        return;
      }

      if (props.mode === "register") {
        const optRes = await fetch("/api/auth/native/passkey/register/options", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const optJson = await optRes.json();
        if (!optRes.ok || !optJson.options) {
          setError(optJson.code ?? "Could not start passkey registration.");
          return;
        }
        const attestation = await startRegistration({ optionsJSON: optJson.options });
        const verifyRes = await fetch("/api/auth/native/passkey/register/verify", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            challenge_id: optJson.challenge_id,
            response: attestation,
          }),
        });
        const verifyJson = await verifyRes.json();
        if (!verifyRes.ok) {
          setError(verifyJson.code ?? "Passkey registration failed.");
          return;
        }
        props.onSuccess?.(verifyJson.account_id);
        return;
      }

      const optRes = await fetch("/api/auth/native/passkey/authenticate/options", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const optJson = await optRes.json();
      if (!optRes.ok || !optJson.options) {
        setError(optJson.code ?? "Could not start passkey sign-in.");
        return;
      }
      const assertion = await startAuthentication({ optionsJSON: optJson.options });
      const verifyRes = await fetch("/api/auth/native/passkey/authenticate/verify", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge_id: optJson.challenge_id,
          response: assertion,
        }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyJson.code ?? "Passkey sign-in failed.");
        return;
      }
      props.onSuccess?.(verifyJson.account_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Passkey operation failed.");
    } finally {
      setBusy(false);
    }
  }, [enabledState, props]);

  if (enabledState === "unknown") {
    return <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Checking passkey availability…</p>;
  }

  if (enabledState === "disabled") {
    return (
      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
        Native passkey accounts are disabled until migration 144 is applied and{" "}
        <code>ABRAXAS_NATIVE_ACCOUNT_AUTH_ENABLED</code> is enabled for staging validation.
      </p>
    );
  }

  return (
    <div>
      <Btn size="sm" disabled={busy} onClick={() => void run()}>
        {props.label ?? (props.mode === "register" ? "Create passkey account" : "Sign in with passkey")}
      </Btn>
      {error ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--status-danger, #c44)" }}>{error}</p>
      ) : null}
    </div>
  );
}
