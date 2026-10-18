"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// Sign in — native passkey Abraxas account (not wallet connection).

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  connectNativePasskeyAccount,
  isConfirmedNoPasskeyResult,
  runNativePasskeyRegistration,
} from "@/lib/auth/nativeAccount/clientPasskeyCeremony";
import { PublicNavAccountMenu, PublicNavConnectPrimary } from "@/components/nav/PublicNavAccountMenu";
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
  const [enabledRes, sessionRes] = await Promise.all([
    fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
    fetch("/api/auth/native/session", { credentials: "same-origin" }),
  ]);
  const enabledJson = (await enabledRes.json()) as { enabled?: boolean; operational?: boolean };
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
  const [offerCreateAccount, setOfferCreateAccount] = useState(false);

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

  const nativeStateLoaded = nativeFlagEnabled !== null && nativeOperational !== null && nativeSession !== null;

  const phase = resolvePublicNavSignInPhase({
    nativeAuthenticated: Boolean(nativeSession?.authenticated),
    nativeFlagEnabled: Boolean(nativeFlagEnabled),
    nativeOperational: Boolean(nativeOperational),
    nativeStateLoaded,
  });

  const finishSuccess = useCallback(async () => {
    await refreshNavState();
    router.push(PUBLIC_CONNECT_ACCOUNT_HREF);
  }, [refreshNavState, router]);

  const runSignIn = useCallback(async () => {
    setError(null);
    setOfferCreateAccount(false);
    setBusy(true);
    try {
      const result = await connectNativePasskeyAccount();
      if (!result.ok) {
        if (result.reason === "cancelled") return;
        if (isConfirmedNoPasskeyResult(result)) {
          setOfferCreateAccount(true);
          return;
        }
        setError(result.message ?? "Could not sign in.");
        return;
      }
      await finishSuccess();
    } finally {
      setBusy(false);
    }
  }, [finishSuccess]);

  const runCreateAccount = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await runNativePasskeyRegistration();
      if (!result.ok) {
        if (result.reason === "cancelled") return;
        setError(result.message ?? "Could not create account.");
        return;
      }
      setOfferCreateAccount(false);
      await finishSuccess();
    } finally {
      setBusy(false);
    }
  }, [finishSuccess]);

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

  if (offerCreateAccount) {
    return (
      <PublicNavAccountMenu
        prominent={prominent}
        variant="primary"
        triggerLabel={busy ? "Signing in" : "Sign in"}
        triggerAriaLabel="Sign in with passkey — more options"
        items={[
          {
            type: "button",
            label: busy ? "Signing in…" : "Sign in with passkey",
            disabled: busy,
            onClick: () => void runSignIn(),
          },
          {
            type: "button",
            label: busy ? "Working…" : "Create passkey account",
            disabled: busy,
            onClick: () => void runCreateAccount(),
          },
        ]}
        footer={errorFooter}
      />
    );
  }

  return (
    <PublicNavConnectPrimary
      prominent={prominent}
      label={busy ? "Signing in" : "Sign in"}
      ariaLabel="Sign in with Abraxas passkey"
      busy={busy}
      onClick={() => void runSignIn()}
      footer={errorFooter}
    />
  );
}

export { PublicNavConnectButton as PublicNavSignInButton };
