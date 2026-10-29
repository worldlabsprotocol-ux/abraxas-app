"use client";
// FILE: components/home/HomeSandboxSessionEntry.tsx

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HomeBuilderDiscovery } from "@/components/home/HomeBuilderDiscovery";
import { isHomeBuilderDiscoveryComplete } from "@/lib/home/homeBuilderDiscovery";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/redesign/ui";
import { NativeAccountSolanaPanel } from "@/components/account/NativeAccountSolanaPanel";
import { HomeSandboxAccountAuth } from "@/components/home/HomeSandboxAccountAuth";
import { HomeInlineSandboxWorkspace } from "@/components/home/HomeInlineSandboxWorkspace";
import { HomeWorkspaceProgressSteps } from "@/components/home/HomeWorkspaceProgressSteps";
import {
  HOMEPAGE_CTA_OPEN_WORKSPACE,
  HOMEPAGE_CTA_SET_UP_WORKSPACE,
  HOMEPAGE_CTA_START_BUILDING,
  HOMEPAGE_WORKSPACE_DEMO_LINK,
  HOMEPAGE_WORKSPACE_STUDIO_CTA,
  HOMEPAGE_WORKSPACE_UNAVAILABLE_LEAD,
} from "@/lib/home/homepagePlainCopy";
import { mapSandboxEnrollError } from "@/lib/home/mapSandboxEnrollError";
import {
  SANDBOX_WORKSPACE_STEP_LEAD,
} from "@/lib/home/sandboxOnboardingCopy";
import { hasPersistentAccountSession, useHomeWorkspaceSession } from "@/lib/home/useHomeWorkspaceSession";
import { PUBLIC_NAV_EXPLORE_HREF } from "@/lib/nav/publicNavConnectBehavior";
import { focusHomepageBuilderWorkspace } from "@/lib/home/homepageWorkspaceFocus";

export function HomeSandboxSessionEntry() {
  const router = useRouter();
  const { authMode, mode, overview, walletOnlyWithoutAccount, refresh } = useHomeWorkspaceSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryComplete, setDiscoveryComplete] = useState(false);

  useEffect(() => {
    setDiscoveryComplete(isHomeBuilderDiscoveryComplete());
    const onIntent = () => setDiscoveryComplete(isHomeBuilderDiscoveryComplete());
    window.addEventListener("abraxas:home-builder-intent", onIntent);
    return () => window.removeEventListener("abraxas:home-builder-intent", onIntent);
  }, []);

  useEffect(() => {
    const onFocus = () => {
      void refresh();
      window.requestAnimationFrame(() => focusHomepageBuilderWorkspace());
    };
    window.addEventListener("abraxas:homepage-workspace-focus", onFocus);
    window.addEventListener("abraxas:wallet-session", onFocus);
    return () => {
      window.removeEventListener("abraxas:homepage-workspace-focus", onFocus);
      window.removeEventListener("abraxas:wallet-session", onFocus);
    };
  }, [refresh]);

  const enrollSandbox = useCallback(async () => {
    setError(null);
    if (!overview || !hasPersistentAccountSession(overview)) {
      setError(mapSandboxEnrollError("account_session_required"));
      await refresh();
      return;
    }

    setBusy(true);
    try {
      const sessionProbe = await fetch("/api/auth/native/session", { credentials: "include" });
      const sessionJson = (await sessionProbe.json()) as { authenticated?: boolean; account_id?: string };
      if (!sessionProbe.ok || !sessionJson.authenticated || !sessionJson.account_id) {
        setError(mapSandboxEnrollError("account_session_required"));
        await refresh();
        return;
      }

      const res = await fetch("/api/sandbox/enroll", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ application_name: "Sandbox application" }),
      });
      const json = (await res.json()) as { code?: string };
      if (!res.ok) {
        const code = json.code;
        if (code === "account_session_required") {
          await refresh();
        }
        setError(mapSandboxEnrollError(code));
        return;
      }
      await refresh();
      router.push("/developers/launchpad");
    } catch {
      setError(mapSandboxEnrollError(undefined));
    } finally {
      setBusy(false);
    }
  }, [overview, refresh, router]);

  const demoLink = (
    <Link className="abx-sandbox-entry__demo-link" href="/try">
      {HOMEPAGE_WORKSPACE_DEMO_LINK}
    </Link>
  );

  const showPreAuthSteps =
    discoveryComplete
    && mode !== "ephemeral_sandbox_ready"
    && mode !== "native_disabled"
    && mode !== "native_unavailable";

  const showDiscovery =
    !discoveryComplete
    && mode !== "native_disabled"
    && mode !== "native_unavailable"
    && mode !== "loading";

  return (
    <div className="abx-sandbox-entry">
      {showDiscovery ? (
        <HomeBuilderDiscovery onComplete={() => setDiscoveryComplete(true)} />
      ) : null}
      {showPreAuthSteps ? <HomeWorkspaceProgressSteps mode={mode} /> : null}

      {mode === "loading" ? (
        <p className="abx-sandbox-entry__status">Checking workspace availability…</p>
      ) : null}

      {mode === "native_disabled" || mode === "native_unavailable" ? (
        <div className="abx-sandbox-entry__disabled">
          {mode === "native_unavailable" ? (
            <p className="abx-sandbox-entry__unavailable-msg">{HOMEPAGE_WORKSPACE_UNAVAILABLE_LEAD}</p>
          ) : null}
          <div className="abx-sandbox-entry__actions">
            <Link
              className="abx-premium-hero__cta abx-premium-hero__cta--primary"
              href={PUBLIC_NAV_EXPLORE_HREF}
            >
              {HOMEPAGE_WORKSPACE_STUDIO_CTA}
            </Link>
          </div>
          {demoLink}
        </div>
      ) : null}

      {mode === "needs_account" ? (
        authMode === "ephemeral_wallet" ? (
          <div className="abx-sandbox-entry__auth">
            <NativeAccountSolanaPanel
              onSuccess={() => {
                void refresh();
              }}
            />
          </div>
        ) : (
          <HomeSandboxAccountAuth
            walletOnlyHint={walletOnlyWithoutAccount}
            onAccountReady={() => refresh()}
          />
        )
      ) : null}

      {mode === "ephemeral_sandbox_ready" ? (
        <HomeInlineSandboxWorkspace />
      ) : null}

      {mode === "needs_workspace" ? (
        <div className="abx-sandbox-entry__sandbox">
          <p className="abx-sandbox-entry__auth-lead">{SANDBOX_WORKSPACE_STEP_LEAD}</p>
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

      {mode !== "loading" && mode !== "native_disabled" && mode !== "native_unavailable" && mode !== "ephemeral_sandbox_ready"
        ? demoLink
        : null}
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

  if (mode === "ephemeral_sandbox_ready") {
    return (
      <a className={primaryClass} href="#start-sandbox">
        {HOMEPAGE_CTA_START_BUILDING}
      </a>
    );
  }

  return (
    <Link className={primaryClass} href="#start-sandbox">
      {HOMEPAGE_CTA_START_BUILDING}
    </Link>
  );
}
