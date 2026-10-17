"use client";
// FILE: components/home/HomeSandboxSessionEntry.tsx

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { NativeAccountPasskeyPanel } from "@/components/account/NativeAccountPasskeyPanel";
import { HomeWorkspaceProgressSteps } from "@/components/home/HomeWorkspaceProgressSteps";
import {
  HOMEPAGE_CTA_OPEN_WORKSPACE,
  HOMEPAGE_CTA_SET_UP_WORKSPACE,
  HOMEPAGE_CTA_START_BUILDING,
  HOMEPAGE_WORKSPACE_DEMO_LINK,
  HOMEPAGE_WORKSPACE_STUDIO_CTA,
} from "@/lib/home/homepagePlainCopy";
import { useHomeWorkspaceSession } from "@/lib/home/useHomeWorkspaceSession";

export function HomeSandboxSessionEntry() {
  const router = useRouter();
  const { mode, refresh } = useHomeWorkspaceSession();
  const [authMode, setAuthMode] = useState<"register" | "authenticate">("register");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(json.code ?? "Could not set up workspace.");
        return;
      }
      await refresh();
      router.push("/developers/launchpad");
    } catch {
      setError("Could not set up workspace.");
    } finally {
      setBusy(false);
    }
  }, [refresh, router]);

  return (
    <div className="abx-sandbox-entry">
      {mode !== "native_disabled" ? <HomeWorkspaceProgressSteps mode={mode} /> : null}

      {mode === "loading" ? (
        <p className="abx-sandbox-entry__status">Checking workspace availability…</p>
      ) : null}

      {mode === "native_disabled" ? (
        <div className="abx-sandbox-entry__disabled">
          <Link
            className="abx-premium-hero__cta abx-premium-hero__cta--primary"
            href="/developers/integration-studio"
          >
            {HOMEPAGE_WORKSPACE_STUDIO_CTA}
          </Link>
        </div>
      ) : null}

      {mode === "needs_account" ? (
        <div className="abx-sandbox-entry__auth">
          <NativeAccountPasskeyPanel
            mode={authMode}
            label={authMode === "register" ? "Create account" : "Sign in"}
            onSuccess={() => void refresh()}
          />
          <p className="abx-sandbox-entry__alt">
            {authMode === "register" ? (
              <>
                Already have an account?{" "}
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
        </div>
      ) : null}

      {mode === "needs_workspace" ? (
        <div className="abx-sandbox-entry__sandbox">
          <Btn size="sm" disabled={busy} onClick={() => void enrollSandbox()}>
            {busy ? "Setting up…" : HOMEPAGE_CTA_SET_UP_WORKSPACE}
          </Btn>
          {error ? <p className="abx-sandbox-entry__error">{error}</p> : null}
        </div>
      ) : null}

      {mode === "has_workspace" ? (
        <div className="abx-sandbox-entry__sandbox">
          <Link className="abx-premium-hero__cta abx-premium-hero__cta--primary" href="/developers/launchpad">
            {HOMEPAGE_CTA_OPEN_WORKSPACE}
          </Link>
        </div>
      ) : null}

      {mode !== "loading" && mode !== "native_disabled" ? (
        <Link className="abx-sandbox-entry__demo-link" href="/try">
          {HOMEPAGE_WORKSPACE_DEMO_LINK}
        </Link>
      ) : null}

      {mode === "native_disabled" ? (
        <Link className="abx-sandbox-entry__demo-link" href="/try">
          {HOMEPAGE_WORKSPACE_DEMO_LINK}
        </Link>
      ) : null}
    </div>
  );
}

/** Primary CTA for hero footer / closing — mirrors workspace session. */
export function HomeWorkspacePrimaryCta({ className }: { className?: string }) {
  const { mode } = useHomeWorkspaceSession();
  const primaryClass = `abx-premium-hero__cta abx-premium-hero__cta--primary ${className ?? ""}`.trim();

  if (mode === "has_workspace") {
    return (
      <Link className={primaryClass} href="/developers/launchpad">
        {HOMEPAGE_CTA_OPEN_WORKSPACE}
      </Link>
    );
  }

  return (
    <Link className={primaryClass} href="#start-sandbox">
      {HOMEPAGE_CTA_START_BUILDING}
    </Link>
  );
}
