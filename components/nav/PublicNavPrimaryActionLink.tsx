"use client";
// FILE: components/nav/PublicNavPrimaryActionLink.tsx

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EPHEMERAL_WALLET_SESSION_EVENT } from "@/lib/auth/ephemeralWallet/clientSession";
import { resolvePublicNavPrimaryAction } from "@/lib/nav/publicNavPrimaryAction";

async function loadDeveloperSessionAuthenticated(): Promise<boolean> {
  try {
    const enabledRes = await fetch("/api/auth/native/enabled", { credentials: "same-origin", cache: "no-store" });
    const enabledJson = (await enabledRes.json()) as { auth_mode?: string };
    if (enabledJson.auth_mode !== "ephemeral_wallet") return false;
    const sessionRes = await fetch("/api/auth/wallet/session", { credentials: "same-origin", cache: "no-store" });
    const sessionJson = (await sessionRes.json()) as { authenticated?: boolean };
    return Boolean(sessionJson.authenticated);
  } catch {
    return false;
  }
}

export function PublicNavPrimaryActionLink({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname() ?? "/";
  const [developerSessionAuthenticated, setDeveloperSessionAuthenticated] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const authenticated = await loadDeveloperSessionAuthenticated();
    setDeveloperSessionAuthenticated(authenticated);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const onSession = () => void refresh();
    window.addEventListener(EPHEMERAL_WALLET_SESSION_EVENT, onSession);
    return () => window.removeEventListener(EPHEMERAL_WALLET_SESSION_EVENT, onSession);
  }, [refresh]);

  const action = resolvePublicNavPrimaryAction({
    developerSessionAuthenticated,
    pathname,
  });

  const className = compact
    ? "rd-nav-primary-action rd-nav-primary-action--compact"
    : "rd-nav-primary-action";

  return (
    <Link
      href={action.href}
      className={className}
      aria-label={action.ariaLabel}
      aria-busy={!loaded || undefined}
    >
      {loaded ? action.label : "Start building"}
    </Link>
  );
}
