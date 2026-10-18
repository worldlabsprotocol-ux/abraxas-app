"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// Connect — native passkey when operational; explore or honest unavailable otherwise.

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NavProfileMenu } from "@/components/sui/NavProfileMenu";
import { probeBrowserSessionDetails } from "@/lib/auth/ensureBrowserSession";
import {
  connectNativePasskeyAccount,
  isConfirmedNoPasskeyResult,
  runNativePasskeyRegistration,
} from "@/lib/auth/nativeAccount/clientPasskeyCeremony";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";
import {
  PUBLIC_CONNECT_ACCOUNT_HREF,
  PUBLIC_CONNECT_EXPLORE_HREF,
  PUBLIC_CONNECT_PASSPORT_LEGACY_HREF,
  PUBLIC_CONNECT_UNAVAILABLE_SUMMARY,
  resolvePublicNavConnectPhase,
} from "@/lib/nav/publicNavConnectBehavior";

const FONT = PUBLIC_FONT_SANS;
const ACCENT = "var(--accent)";

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

  if (phase === "loading") {
    return (
      <span style={{ ...buttonStyle(prominent), opacity: 0.65 }} aria-busy="true">
        Connect
      </span>
    );
  }

  if (phase === "holder_profile_menu") {
    return <NavProfileMenu prominent={prominent} />;
  }

  if (phase === "native_account_link") {
    return (
      <Link
        href={PUBLIC_CONNECT_ACCOUNT_HREF}
        style={buttonStyle(prominent)}
        aria-label="Open your Abraxas account"
      >
        Account
      </Link>
    );
  }

  if (phase === "native_explore") {
    return (
      <Link
        href={PUBLIC_CONNECT_EXPLORE_HREF}
        style={buttonStyle(prominent)}
        aria-label="Explore Abraxas in Integration Studio without signing in"
        title="Explore policies and sandbox tools without an account"
      >
        Explore
      </Link>
    );
  }

  if (phase === "native_service_unavailable") {
    return (
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: 280 }}
        role="status"
        aria-live="polite"
      >
        <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "var(--text-secondary)", textAlign: "right" }}>
          {PUBLIC_CONNECT_UNAVAILABLE_SUMMARY}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => void runRetryOperationalCheck()}
            disabled={retryBusy}
            style={{ ...buttonStyle(prominent), cursor: retryBusy ? "wait" : "pointer", border: "none" }}
          >
            {retryBusy ? "Checking…" : "Retry sign-in"}
          </button>
          <Link href={PUBLIC_CONNECT_EXPLORE_HREF} style={secondaryLinkStyle(prominent)}>
            Integration Studio
          </Link>
          <Link href={PUBLIC_CONNECT_PASSPORT_LEGACY_HREF} style={legacyLinkStyle()}>
            Passport (legacy)
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        onClick={() => void runConnect()}
        disabled={busy}
        style={{ ...buttonStyle(prominent), cursor: busy ? "wait" : "pointer", border: "none" }}
        aria-label="Connect with Abraxas passkey"
      >
        {busy ? "Connecting…" : "Connect"}
      </button>
      {offerCreateAccount ? (
        <button
          type="button"
          onClick={() => void runCreateAccount()}
          disabled={busy}
          style={{
            ...buttonStyle(prominent),
            cursor: busy ? "wait" : "pointer",
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: prominent ? "0.72rem" : "0.68rem",
            padding: "0.25rem 0.65rem",
          }}
        >
          Create passkey account
        </button>
      ) : null}
      {error ? (
        <span style={{ fontFamily: FONT, fontSize: "0.62rem", color: "#EF4444", maxWidth: 220, textAlign: "right" }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function buttonStyle(prominent: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: prominent ? "0.55rem 1rem" : "0.5rem 0.95rem",
    borderRadius: 999,
    background: ACCENT,
    color: "#000",
    fontFamily: FONT,
    fontSize: prominent ? "0.84rem" : "0.8rem",
    fontWeight: 700,
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}

function secondaryLinkStyle(prominent: boolean): CSSProperties {
  return {
    ...buttonStyle(prominent),
    background: "transparent",
    color: "var(--text-primary)",
    border: "1px solid var(--border-subtle, rgba(255,255,255,0.12))",
  };
}

function legacyLinkStyle(): CSSProperties {
  return {
    fontFamily: FONT,
    fontSize: "0.62rem",
    color: "var(--text-secondary)",
    textDecoration: "underline",
    alignSelf: "center",
  };
}
