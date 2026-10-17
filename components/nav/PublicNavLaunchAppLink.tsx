"use client";
// FILE: components/nav/PublicNavLaunchAppLink.tsx

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { PUBLIC_FONT_SANS, PUBLIC_NAV_PRIMARY_CTA } from "@/lib/design/publicSurface";
import {
  PUBLIC_LAUNCH_APP_DEFAULT_HREF,
  PUBLIC_LAUNCH_APP_LABEL,
  resolvePublicLaunchAppHref,
} from "@/lib/nav/publicLaunchAppHref";

const FONT = PUBLIC_FONT_SANS;

export function PublicNavLaunchAppLink() {
  const auth = useSuiAuthOptional();
  const holderSignedIn = Boolean(auth?.suiAddress);
  const [nativeAuthenticated, setNativeAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/native/session", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json: { authenticated?: boolean }) => {
        if (!cancelled) setNativeAuthenticated(Boolean(json.authenticated));
      })
      .catch(() => {
        if (!cancelled) setNativeAuthenticated(false);
      });
    return () => {
      cancelled = true;
    };
  }, [holderSignedIn]);

  const href = resolvePublicLaunchAppHref({
    nativeAccountAuthenticated: nativeAuthenticated,
    holderPassportSignedIn: holderSignedIn,
  });

  const label = PUBLIC_NAV_PRIMARY_CTA.label === "Launch App" ? PUBLIC_LAUNCH_APP_LABEL : PUBLIC_NAV_PRIMARY_CTA.label;

  return (
    <Link
      href={href || PUBLIC_LAUNCH_APP_DEFAULT_HREF}
      style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        fontWeight: 700,
        color: "var(--btn-primary-text, #080B0D)",
        background: "var(--btn-primary-bg)",
        padding: "0.45rem 0.85rem",
        borderRadius: 999,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}
