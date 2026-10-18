"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// One primary header account action; recovery paths live in a compact menu.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavProfileMenu } from "@/components/sui/NavProfileMenu";
import { probeBrowserSessionDetails } from "@/lib/auth/ensureBrowserSession";
import {
  connectNativePasskeyAccount,
  isConfirmedNoPasskeyResult,
  runNativePasskeyRegistration,
} from "@/lib/auth/nativeAccount/clientPasskeyCeremony";
import { PublicNavAccountMenu, PublicNavConnectPrimary } from "@/components/nav/PublicNavAccountMenu";
import {
  PUBLIC_CONNECT_ACCOUNT_HREF,
  PUBLIC_CONNECT_EXPLORE_HREF,
  PUBLIC_CONNECT_PASSPORT_LEGACY_HREF,
  PUBLIC_CONNECT_UNAVAILABLE_MENU_DESC,
  PUBLIC_CONNECT_UNAVAILABLE_MENU_TITLE,
  resolvePublicNavConnectPhase,
} from "@/lib/nav/publicNavConnectBehavior";

type NativeSession = { authenticated: boolean };

type NativeNavState = {
  flagEnabled: boolean;
  operational: boolean;
  session: NativeSession;
};

async function loadNativeNavState(): Promise<NativeNavState> {
  const [enabledRes, sessionRes] = await Promise.all([
    fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
    fetch("/api/auth/native/session", { credentials: "same-origin" }),
  ]);
  const enabledJson = (await enabledRes.json()) as {
    enabled?: boolean;
    operational?: boolean;
  };
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
  const [holderBrowserSessionActive, setHolderBrowserSessionActive] = useState(false);
  const [nativeFlagEnabled, setNativeFlagEnabled] = useState<boolean | null>(null);
  const [nativeOperational, setNativeOperational] = useState<boolean | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerCreateAccount, setOfferCreateAccount] = useState(false);

  const refreshNavState = useCallback(async () => {
    try {
      const [holderProbe, nativeState] = await Promise.all([
        probeBrowserSessionDetails(),
        loadNativeNavState(),
      ]);
      setHolderBrowserSessionActive(holderProbe.ok);
      setNativeFlagEnabled(nativeState.flagEnabled);
      setNativeOperational(nativeState.operational);
      setNativeSession(nativeState.session);
    } catch {
      setHolderBrowserSessionActive(false);
      setNativeFlagEnabled(false);
      setNativeOperational(false);
      setNativeSession({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refreshNavState();
  }, [pathname, refreshNavState]);

  const nativeStateLoaded = nativeFlagEnabled !== null && nativeOperational !== null && nativeSession !== null;

  const phase = resolvePublicNavConnectPhase({
    holderBrowserSessionActive,
    nativeAuthenticated: Boolean(nativeSession?.authenticated),
    nativeFlagEnabled: Boolean(nativeFlagEnabled),
    nativeOperational: Boolean(nativeOperational),
    nativeStateLoaded,
  });

  const finishSuccess = useCallback(async () => {
    await refreshNavState();
    router.push(PUBLIC_CONNECT_ACCOUNT_HREF);
  }, [refreshNavState, router]);

  const runConnect = useCallback(async () => {
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
        setError(result.message ?? "Could not connect.");
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

  const runRetryOperationalCheck = useCallback(async () => {
    setRetryBusy(true);
    setError(null);
    try {
      await refreshNavState();
    } finally {
      setRetryBusy(false);
    }
  }, [refreshNavState]);

  const errorFooter = error ? (
    <span className="public-nav-connect__error" role="alert">
      {error}
    </span>
  ) : null;

  if (phase === "loading") {
    return (
      <PublicNavConnectPrimary
        prominent={prominent}
        label="Connect"
        ariaLabel="Loading account connection"
        disabled
      />
    );
  }

  if (phase === "holder_profile_menu") {
    return <NavProfileMenu prominent={prominent} />;
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

  if (phase === "native_explore") {
    return (
      <PublicNavConnectPrimary
        prominent={prominent}
        label="Connect"
        ariaLabel="Start building — explore Abraxas without mandatory sign-in"
        href="/#start-sandbox"
      />
    );
  }

  if (phase === "native_service_unavailable") {
    return (
      <PublicNavAccountMenu
        prominent={prominent}
        variant="muted"
        triggerLabel="Connect"
        triggerAriaLabel="Account sign-in unavailable — open recovery options"
        menuTitle={PUBLIC_CONNECT_UNAVAILABLE_MENU_TITLE}
        menuDescription={PUBLIC_CONNECT_UNAVAILABLE_MENU_DESC}
        items={[
          {
            type: "button",
            label: retryBusy ? "Checking…" : "Retry sign-in check",
            disabled: retryBusy,
            onClick: () => void runRetryOperationalCheck(),
          },
          {
            type: "link",
            label: "Integration Studio",
            href: PUBLIC_CONNECT_EXPLORE_HREF,
            description: "Explore without an account",
          },
          {
            type: "link",
            label: "Passport (legacy)",
            href: PUBLIC_CONNECT_PASSPORT_LEGACY_HREF,
            description: "Holder credentials only",
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
        triggerLabel={busy ? "Connecting" : "Connect"}
        triggerAriaLabel="Connect with Abraxas passkey — more options"
        items={[
          {
            type: "button",
            label: busy ? "Connecting…" : "Sign in with passkey",
            disabled: busy,
            onClick: () => void runConnect(),
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
      label={busy ? "Connecting" : "Connect"}
      ariaLabel="Connect with Abraxas passkey"
      busy={busy}
      onClick={() => void runConnect()}
      footer={errorFooter}
    />
  );
}
