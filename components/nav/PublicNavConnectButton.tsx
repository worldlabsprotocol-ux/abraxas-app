"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// Sign in — Solana wallet Abraxas account (single primary action).

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PublicNavAccountMenu, PublicNavConnectPrimary } from "@/components/nav/PublicNavAccountMenu";
import { SolanaAccountSignInDialog } from "@/components/nav/SolanaAccountSignInDialog";
import {
  PUBLIC_CONNECT_ACCOUNT_HREF,
  PUBLIC_NAV_EXPLORE_HREF,
  PUBLIC_NAV_WORKSPACE_HREF,
  PUBLIC_SIGN_IN_UNAVAILABLE_DESC,
  PUBLIC_SIGN_IN_UNAVAILABLE_TITLE,
  resolvePublicNavSignInPhase,
} from "@/lib/nav/publicNavConnectBehavior";

type NativeSession = { authenticated: boolean };

async function loadNativeNavState(): Promise<{
  flagEnabled: boolean;
  operational: boolean;
  session: NativeSession;
}> {
  const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
  const enabledJson = (await enabledRes.json()) as {
    enabled?: boolean;
    operational?: boolean;
    auth_mode?: string;
  };
  const sessionUrl =
    enabledJson.auth_mode === "ephemeral_wallet"
      ? "/api/auth/wallet/session"
      : "/api/auth/native/session";
  const sessionRes = await fetch(sessionUrl, { credentials: "same-origin" });
  const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
  const flagEnabled = Boolean(enabledJson.enabled);
  const operational =
    typeof enabledJson.operational === "boolean" ? enabledJson.operational : flagEnabled;
  return {
    flagEnabled,
    operational,
    session: { authenticated: Boolean(sessionJson.authenticated) },
  };
}

export function PublicNavConnectButton({ prominent = false }: { prominent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [nativeFlagEnabled, setNativeFlagEnabled] = useState<boolean | null>(null);
  const [nativeOperational, setNativeOperational] = useState<boolean | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const refreshNavState = useCallback(async () => {
    try {
      const nativeState = await loadNativeNavState();
      setNativeFlagEnabled(nativeState.flagEnabled);
      setNativeOperational(nativeState.operational);
      setNativeSession(nativeState.session);
    } catch {
      setNativeFlagEnabled(false);
      setNativeOperational(false);
      setNativeSession({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refreshNavState();
  }, [pathname, refreshNavState]);

  useEffect(() => {
    const onSession = () => void refreshNavState();
    window.addEventListener("abraxas:native-account-session", onSession);
    return () => window.removeEventListener("abraxas:native-account-session", onSession);
  }, [refreshNavState]);

  const nativeStateLoaded = nativeFlagEnabled !== null && nativeOperational !== null && nativeSession !== null;

  const phase = resolvePublicNavSignInPhase({
    nativeAuthenticated: Boolean(nativeSession?.authenticated),
    nativeFlagEnabled: Boolean(nativeFlagEnabled),
    nativeOperational: Boolean(nativeOperational),
    nativeStateLoaded,
  });

  const finishSuccess = useCallback(async () => {
    await refreshNavState();
    try {
      const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
      const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
      if (enabledJson.auth_mode === "ephemeral_wallet") {
        router.push("/developers/ephemeral-sandbox");
        return;
      }
    } catch {
      /* fall through */
    }
    router.push(PUBLIC_CONNECT_ACCOUNT_HREF);
  }, [refreshNavState, router]);

  const openSignIn = useCallback(() => {
    setError(null);
    setSignInOpen(true);
  }, []);

  const errorFooter = error ? (
    <span className="public-nav-connect__error" role="alert">
      {error}
    </span>
  ) : null;

  if (phase === "loading") {
    return (
      <PublicNavConnectPrimary prominent={prominent} label="Sign in" ariaLabel="Loading sign-in" disabled />
    );
  }

  if (phase === "native_account_link") {
    return (
      <PublicNavConnectPrimary
        prominent={prominent}
        label="Account"
        ariaLabel="Open your Abraxas account"
        href={PUBLIC_CONNECT_ACCOUNT_HREF}
      />
    );
  }

  if (phase === "native_explore_only") {
    return (
      <PublicNavConnectPrimary
        prominent={prominent}
        label="Sign in"
        ariaLabel="Create an Abraxas account in the workspace section"
        href={PUBLIC_NAV_WORKSPACE_HREF}
      />
    );
  }

  if (phase === "native_service_unavailable") {
    return (
      <PublicNavAccountMenu
        prominent={prominent}
        variant="muted"
        triggerLabel="Sign in"
        triggerAriaLabel="Account sign-in unavailable"
        menuTitle={PUBLIC_SIGN_IN_UNAVAILABLE_TITLE}
        menuDescription={PUBLIC_SIGN_IN_UNAVAILABLE_DESC}
        items={[
          {
            type: "link",
            label: "Explore Integration Studio",
            href: PUBLIC_NAV_EXPLORE_HREF,
            description: "No account required",
          },
        ]}
      />
    );
  }

  return (
    <>
      <PublicNavConnectPrimary
        prominent={prominent}
        label={busy ? "Signing in" : "Sign in"}
        ariaLabel="Sign in with Solana wallet"
        busy={busy}
        onClick={openSignIn}
        footer={errorFooter}
      />
      <SolanaAccountSignInDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        onSuccess={() => void finishSuccess()}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
      />
    </>
  );
}

export { PublicNavConnectButton as PublicNavSignInButton };
