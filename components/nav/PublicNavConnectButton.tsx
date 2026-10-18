"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// Connect — one-click native passkey sign-in when enabled; explicit registration only on user choice.

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
  PUBLIC_CONNECT_NATIVE_UNAVAILABLE_HREF,
  resolvePublicNavConnectPhase,
} from "@/lib/nav/publicNavConnectBehavior";

const FONT = PUBLIC_FONT_SANS;
const ACCENT = "var(--accent)";

type NativeSession = { authenticated: boolean };

async function loadNativeNavState(): Promise<{ enabled: boolean; session: NativeSession }> {
  const [enabledRes, sessionRes] = await Promise.all([
    fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
    fetch("/api/auth/native/session", { credentials: "same-origin" }),
  ]);
  const enabledJson = (await enabledRes.json()) as {
    enabled?: boolean;
    operational?: boolean;
  };
  const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
  const nativeConnect =
    typeof enabledJson.operational === "boolean"
      ? enabledJson.operational
      : Boolean(enabledJson.enabled);
  return {
    enabled: nativeConnect,
    session: { authenticated: Boolean(sessionJson.authenticated) },
  };
}

export function PublicNavConnectButton({ prominent = false }: { prominent?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [holderBrowserSessionActive, setHolderBrowserSessionActive] = useState(false);
  const [nativeEnabled, setNativeEnabled] = useState<boolean | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerCreateAccount, setOfferCreateAccount] = useState(false);

  const refreshNavState = useCallback(async () => {
    try {
      const [holderProbe, nativeState] = await Promise.all([
        probeBrowserSessionDetails(),
        loadNativeNavState(),
      ]);
      setHolderBrowserSessionActive(holderProbe.ok);
      setNativeEnabled(nativeState.enabled);
      setNativeSession(nativeState.session);
    } catch {
      setHolderBrowserSessionActive(false);
      setNativeEnabled(false);
      setNativeSession({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refreshNavState();
  }, [pathname, refreshNavState]);

  const phase = resolvePublicNavConnectPhase({
    holderBrowserSessionActive,
    nativeAuthenticated: Boolean(nativeSession?.authenticated),
    nativeEnabled: Boolean(nativeEnabled),
    nativeStateLoaded: nativeEnabled !== null && nativeSession !== null,
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

  if (phase === "native_unavailable_recovery") {
    return (
      <Link
        href={PUBLIC_CONNECT_NATIVE_UNAVAILABLE_HREF}
        style={buttonStyle(prominent)}
        aria-label="Open Passport for holder access — native passkey sign-in is not enabled here"
        title="Passkey account sign-in is not enabled in this environment. Open Passport for holder credentials."
      >
        Connect
      </Link>
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
