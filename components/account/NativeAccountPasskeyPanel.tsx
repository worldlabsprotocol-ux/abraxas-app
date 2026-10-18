"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import {
  fetchNativeAuthEnabled,
  runNativePasskeyAuthentication,
  runNativePasskeyRegistration,
} from "@/lib/auth/nativeAccount/clientPasskeyCeremony";

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
    void fetchNativeAuthEnabled().then((enabled) => {
      if (!cancelled) setEnabledState(enabled ? "enabled" : "disabled");
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

      const result =
        props.mode === "register"
          ? await runNativePasskeyRegistration()
          : await runNativePasskeyAuthentication();

      if (!result.ok) {
        if (result.reason === "cancelled") return;
        setError(result.message ?? "Passkey operation failed.");
        return;
      }
      props.onSuccess?.(result.accountId);
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
        Passkey sign-in is not available here. Continue with Integration Studio or your existing API key and
        operator session.
      </p>
    );
  }

  return (
    <div>
      <Btn size="sm" disabled={busy} onClick={() => void run()}>
        {busy
          ? "Working…"
          : (props.label ?? (props.mode === "register" ? "Create passkey account" : "Sign in with passkey"))}
      </Btn>
      {error ? (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--status-danger, #c44)" }}>{error}</p>
      ) : null}
    </div>
  );
}
