"use client";
// FILE: components/nav/PublicNavConnectButton.tsx
// Sign in — Solana wallet Abraxas account (single primary action).

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  notifyEphemeralWalletSessionChanged,
  notifyWalletSignInDialogChanged,
} from "@/lib/auth/ephemeralWallet/clientSession";
import { PublicNavAccountMenu, PublicNavConnectPrimary } from "@/components/nav/PublicNavAccountMenu";
import { SolanaAccountSignInDialog } from "@/components/nav/SolanaAccountSignInDialog";
import { HOMEPAGE_CTA_START_BUILDING } from "@/lib/home/homepagePlainCopy";
import {
  PUBLIC_CONNECT_ACCOUNT_HREF,
  PUBLIC_NAV_EXPLORE_HREF,
  PUBLIC_NAV_WORKSPACE_HREF,
  PUBLIC_SIGN_IN_UNAVAILABLE_DESC,
  PUBLIC_SIGN_IN_UNAVAILABLE_TITLE,
  resolvePublicNavSignInPhase,
} from "@/lib/nav/publicNavConnectBehavior";
import {
  capturePostAuthResumePath,
  consumePostAuthResumePath,
} from "@/lib/nav/postAuthResume";
import { focusHomepageBuilderWorkspace } from "@/lib/home/homepageWorkspaceFocus";
import { resolvePublicNavPrimaryAction } from "@/lib/nav/publicNavPrimaryAction";

type NativeSession = { authenticated: boolean };

async function loadNativeNavState(): Promise<{
  flagEnabled: boolean;
  operational: boolean;
  session: NativeSession;
  authMode: "native" | "ephemeral_wallet" | null;
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
  const sessionRes = await fetch(sessionUrl, { credentials: "same-origin", cache: "no-store" });
  const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
  const flagEnabled = Boolean(enabledJson.enabled);
  const operational =
    typeof enabledJson.operational === "boolean" ? enabledJson.operational : flagEnabled;
  const authMode =
    enabledJson.auth_mode === "ephemeral_wallet"
      ? "ephemeral_wallet"
      : enabledJson.auth_mode === "native"
        ? "native"
        : null;
  return {
    flagEnabled,
    operational,
    session: { authenticated: Boolean(sessionJson.authenticated) },
    authMode,
  };
}

export function PublicNavConnectButton({
  prominent = false,
  headerPrimary = false,
  compact = false,
}: {
  prominent?: boolean;
  /** Single white header pill (RedesignNav). */
  headerPrimary?: boolean;
  compact?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [nativeFlagEnabled, setNativeFlagEnabled] = useState<boolean | null>(null);
  const [nativeOperational, setNativeOperational] = useState<boolean | null>(null);
  const [nativeSession, setNativeSession] = useState<NativeSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"native" | "ephemeral_wallet" | null>(null);

  const refreshNavState = useCallback(async () => {
    try {
      const nativeState = await loadNativeNavState();
      setNativeFlagEnabled(nativeState.flagEnabled);
      setNativeOperational(nativeState.operational);
      setNativeSession(nativeState.session);
      setAuthMode(nativeState.authMode);
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

  const focusHomepageWorkspace = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.hash = "start-sandbox";
      window.dispatchEvent(new Event("abraxas:homepage-workspace-focus"));
      window.requestAnimationFrame(() => focusHomepageBuilderWorkspace());
    }
  }, []);

  const openDeveloperWorkspace = useCallback(() => {
    notifyEphemeralWalletSessionChanged();
    if (pathname === "/" || pathname === "") {
      focusHomepageWorkspace();
      return;
    }
    if (pathname === "/developers/ephemeral-sandbox") {
      router.refresh();
      return;
    }
    router.push("/developers/ephemeral-sandbox");
  }, [focusHomepageWorkspace, pathname, router]);

  const finishSuccess = useCallback(async () => {
    notifyEphemeralWalletSessionChanged();
    await refreshNavState();
    const resume = consumePostAuthResumePath();
    if (resume) {
      const resumePath = resume.split("#")[0] ?? resume;
      if (resumePath === "/" || resumePath === "") {
        focusHomepageWorkspace();
        return;
      }
      router.push(resume);
      return;
    }
    try {
      const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin" });
      const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
      if (enabledJson.auth_mode === "ephemeral_wallet") {
        if (pathname === "/" || pathname === "") {
          focusHomepageWorkspace();
          return;
        }
        openDeveloperWorkspace();
        return;
      }
    } catch {
      /* fall through */
    }
    router.push(PUBLIC_CONNECT_ACCOUNT_HREF);
  }, [focusHomepageWorkspace, pathname, refreshNavState, router, openDeveloperWorkspace]);

  const openSignIn = useCallback(() => {
    setError(null);
    if (typeof window !== "undefined") {
      capturePostAuthResumePath(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    }
    setSignInOpen(true);
    notifyWalletSignInDialogChanged(true);
  }, []);

  const closeSignIn = useCallback(() => {
    setSignInOpen(false);
    notifyWalletSignInDialogChanged(false);
  }, []);

  useEffect(() => {
    const onOpenSignIn = () => openSignIn();
    window.addEventListener("abraxas:open-wallet-sign-in", onOpenSignIn);
    return () => window.removeEventListener("abraxas:open-wallet-sign-in", onOpenSignIn);
  }, [openSignIn]);

  const errorFooter = error ? (
    <span className="public-nav-connect__error" role="alert">
      {error}
    </span>
  ) : null;

  const connectVisual = headerPrimary
    ? ({ headerWhite: true, compact } as const)
    : ({ prominent } as const);

  const onHome = pathname === "/";

  if (headerPrimary && onHome) {
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

    if (phase === "native_account_link" && authMode !== "ephemeral_wallet") {
      return (
        <PublicNavConnectPrimary
          {...connectVisual}
          label="Account"
          ariaLabel="Open your Abraxas account"
          href={PUBLIC_CONNECT_ACCOUNT_HREF}
        />
      );
    }

    const ephemeralAuthenticated =
      phase === "native_account_link" && authMode === "ephemeral_wallet";
    const action = resolvePublicNavPrimaryAction({
      developerSessionAuthenticated: ephemeralAuthenticated,
      pathname: "/",
    });

    return (
      <PublicNavConnectPrimary
        {...connectVisual}
        label={phase === "loading" ? HOMEPAGE_CTA_START_BUILDING : action.label}
        ariaLabel={action.ariaLabel}
        href="#start-sandbox"
        disabled={phase === "loading"}
        onClick={() => focusHomepageWorkspace()}
      />
    );
  }

  if (phase === "loading") {
    return (
      <PublicNavConnectPrimary
        {...connectVisual}
        label={HOMEPAGE_CTA_START_BUILDING}
        ariaLabel="Loading"
        disabled
      />
    );
  }

  if (phase === "native_account_link") {
    const ephemeral = authMode === "ephemeral_wallet";
    if (ephemeral) {
      const action = resolvePublicNavPrimaryAction({
        developerSessionAuthenticated: true,
        pathname,
      });
      return (
        <PublicNavConnectPrimary
          {...connectVisual}
          label={onHome ? action.label : "Workspace"}
          ariaLabel={onHome ? action.ariaLabel : "Open developer workspace"}
          href={onHome ? "#start-sandbox" : undefined}
          onClick={openDeveloperWorkspace}
        />
      );
    }
    return (
      <PublicNavConnectPrimary
        {...connectVisual}
        label="Account"
        ariaLabel="Open your Abraxas account"
        href={PUBLIC_CONNECT_ACCOUNT_HREF}
      />
    );
  }

  if (phase === "native_explore_only") {
    return (
      <PublicNavConnectPrimary
        {...connectVisual}
        label={HOMEPAGE_CTA_START_BUILDING}
        ariaLabel="Start building with Abraxas"
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
        {...connectVisual}
        label={busy ? "Authorizing" : HOMEPAGE_CTA_START_BUILDING}
        ariaLabel="Start building with Solana wallet authorization"
        busy={busy}
        onClick={openSignIn}
        footer={errorFooter}
      />
      <SolanaAccountSignInDialog
        open={signInOpen}
        onClose={closeSignIn}
        onSuccess={() => void finishSuccess()}
        busy={busy}
        setBusy={setBusy}
        setError={setError}
      />
    </>
  );
}

export { PublicNavConnectButton as PublicNavSignInButton };
