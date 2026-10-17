"use client";
// FILE: components/home/HomeSandboxSessionEntry.tsx
// Session-aware sandbox entry — one primary action, passkey-native, no competing auth buttons.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";

type Overview = {
  native_account: { authenticated: boolean; account_id: string | null; partner_membership_count: number };
  partner_console: { authenticated: boolean; partner_id: string | null; environment: string | null };
};

type EntryMode =
  | "loading"
  | "native_disabled"
  | "create_account"
  | "sign_in"
  | "create_sandbox"
  | "open_sandbox";

export function HomeSandboxSessionEntry() {
  const router = useRouter();
  const [nativeEnabled, setNativeEnabled] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [authMode, setAuthMode] = useState<"register" | "authenticate">("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [enabledRes, overviewRes] = await Promise.all([
      fetch("/api/auth/native/enabled", { credentials: "include" }),
      fetch("/api/account/overview", { credentials: "include" }),
    ]);
    const enabledJson = (await enabledRes.json()) as { enabled?: boolean };
    setNativeEnabled(Boolean(enabledJson.enabled));
    if (overviewRes.ok) {
      setOverview((await overviewRes.json()) as Overview);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mode: EntryMode = (() => {
    if (nativeEnabled === null || !overview) return "loading";
    if (!nativeEnabled) return "native_disabled";
    if (!overview.native_account.authenticated) {
      return authMode === "register" ? "create_account" : "sign_in";
    }
    const hasSandbox =
      overview.partner_console.authenticated ||
      (overview.partner_console.partner_id && overview.partner_console.environment === "sandbox") ||
      overview.native_account.partner_membership_count > 0;
    return hasSandbox ? "open_sandbox" : "create_sandbox";
  })();

  const enrollSandbox = useCallback(async () => {
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
      await refresh();
      router.push("/developers/launchpad");
    } catch {
      setError("Sandbox enrollment failed.");
    } finally {
      setBusy(false);
    }
  }, [refresh, router]);

  if (mode === "loading") {
    return <p className="abx-sandbox-entry__status">Checking sandbox availability…</p>;
  }

  if (mode === "native_disabled") {
    return (
      <div className="abx-sandbox-entry__disabled">
        <p className="abx-sandbox-entry__status">
          Native passkey sandbox enrollment is not enabled in this deployment. Use Integration Studio or contact your
          operator for staging access.
        </p>
        <Link className="abx-premium-hero__cta abx-premium-hero__cta--secondary" href="/developers/integration-studio">
          Open Integration Studio
        </Link>
      </div>
    );
  }

  if (mode === "create_account" || mode === "sign_in") {
    const primaryLabel = mode === "create_account" ? "Create account" : "Sign in";
    return (
      <div className="abx-sandbox-entry__auth">
        <NativeAccountPasskeyPanel
          mode={authMode}
          label={primaryLabel}
          onSuccess={() => void refresh()}
        />
        <p className="abx-sandbox-entry__alt">
          {authMode === "register" ? (
            <>
              Already have a passkey account?{" "}
              <button type="button" className="abx-sandbox-entry__link" onClick={() => setAuthMode("authenticate")}>
                Sign in
              </button>
            </>
          ) : (
            <>
              New here?{" "}
              <button type="button" className="abx-sandbox-entry__link" onClick={() => setAuthMode("register")}>
                Create account
              </button>
            </>
          )}
        </p>
        <Link className="abx-sandbox-entry__demo-link" href="/try">
          Explore verification demo without an account
        </Link>
      </div>
    );
  }

  if (mode === "create_sandbox") {
    return (
      <div className="abx-sandbox-entry__sandbox">
        <Btn size="sm" disabled={busy} onClick={() => void enrollSandbox()}>
          {busy ? "Creating sandbox…" : "Create sandbox"}
        </Btn>
        {error ? <p className="abx-sandbox-entry__error">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="abx-sandbox-entry__sandbox">
      <Link className="abx-premium-hero__cta abx-premium-hero__cta--primary" href="/developers/launchpad">
        Open sandbox
      </Link>
    </div>
  );
}
