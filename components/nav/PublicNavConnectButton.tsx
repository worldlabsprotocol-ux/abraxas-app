"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// Connect — native passkey account first; no default Google sign-in on public surfaces.

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { NavProfileMenu } from "@/components/sui/NavProfileMenu";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { PUBLIC_FONT_SANS } from "@/lib/design/publicSurface";
import { NAV_SIGN_IN_COPY } from "@/lib/nav/navSignInButtonState";

const FONT = PUBLIC_FONT_SANS;
const ACCENT = "var(--accent)";

type NativeSession = { authenticated: boolean };

export function PublicNavConnectButton({ prominent = false }: { prominent?: boolean }) {
  const pathname = usePathname();
  const auth = useSuiAuthOptional();
  const holderSignedIn = Boolean(auth?.suiAddress);
  const [nativeEnabled, setNativeEnabled] = useState<boolean | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [enabledRes, sessionRes] = await Promise.all([
          fetch("/api/auth/native/enabled", { credentials: "same-origin" }),
          fetch("/api/auth/native/session", { credentials: "same-origin" }),
        ]);
        if (cancelled) return;
        const enabledJson = (await enabledRes.json()) as { enabled?: boolean };
        const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
        setNativeEnabled(Boolean(enabledJson.enabled));
        setNativeSession({ authenticated: Boolean(sessionJson.authenticated) });
      } catch {
        if (!cancelled) {
          setNativeEnabled(false);
          setNativeSession({ authenticated: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const scrollToSandbox = useCallback(() => {
    if (typeof window === "undefined") return;
    const target = "/#start-sandbox";
    if (pathname === "/" || pathname === "/terminal") {
      const el = document.getElementById("start-sandbox");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", target);
        return;
      }
    }
    window.location.assign(target);
  }, [pathname]);

  if (holderSignedIn) {
    return <NavProfileMenu prominent={prominent} />;
  }

  if (nativeSession?.authenticated) {
    return (
      <Link
        href="/account/applications"
        style={buttonStyle(prominent)}
        aria-label="Open your Abraxas account"
      >
        Account
      </Link>
    );
  }

  if (nativeEnabled) {
    return (
      <button
        type="button"
        onClick={scrollToSandbox}
        style={{ ...buttonStyle(prominent), cursor: "pointer", border: "none" }}
        aria-label="Connect with passkey account"
      >
        Connect
      </button>
    );
  }

  return (
    <Link href="/passport" style={buttonStyle(prominent)} aria-label={NAV_SIGN_IN_COPY.openAriaLabel}>
      Connect
    </Link>
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
