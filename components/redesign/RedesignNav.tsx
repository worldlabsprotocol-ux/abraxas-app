"use client";
// FILE: components/redesign/RedesignNav.tsx
// Minimal nav — max 5 items desktop; language in hamburger on mobile.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SuiSignInNavButton } from "@/components/sui/SuiSignInNavButton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/verify", label: "Verify", matchPrefixes: ["/verify"] },
  { href: "/passport", label: "Passport", matchPrefixes: ["/passport"] },
  { href: "/docs", label: "Docs", matchPrefixes: ["/docs"] },
  { href: "/build", label: "Build", matchPrefixes: ["/build"] },
] as const;

function isLinkActive(
  pathname: string | null,
  href: string,
  exact?: boolean,
  matchPrefixes?: readonly string[],
) {
  if (matchPrefixes?.length) {
    return matchPrefixes.some(
      (p) => pathname === p || (pathname?.startsWith(`${p}/`) ?? false),
    );
  }
  if (exact) return pathname === "/";
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}

export function RedesignNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        background: "var(--nav-bg-solid)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 clamp(0.9rem, 2.5vw, 1.9rem)",
        height: "clamp(60px, 8vw, 72px)",
        gap: "0.85rem",
      }}
    >
      <Link
        href="/"
        aria-label="Abraxas home"
        style={{ display: "flex", alignItems: "center", gap: "0.55rem", textDecoration: "none", flexShrink: 0 }}
      >
        <Image src="/icon-48.png" alt="" width={30} height={30} priority style={{ display: "block", borderRadius: 8 }} />
        <span
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.05rem,1.6vw,1.25rem)",
            fontWeight: 800,
            color: "var(--text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Abraxas
        </span>
        <span className="pr-label-live" style={{ marginBottom: 0, fontSize: "0.52rem" }}>Beta</span>
      </Link>

      <div className="rd-nav-links" style={{ display: "none", flex: 1, justifyContent: "center", gap: "0.15rem" }}>
        {LINKS.map((l) => {
          const active = isLinkActive(
            pathname,
            l.href,
            "exact" in l ? l.exact : undefined,
            "matchPrefixes" in l ? l.matchPrefixes : undefined,
          );
          return (
            <Link
              key={l.href}
              href={l.href}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 999,
                textDecoration: "none",
                fontFamily: FONT,
                fontSize: "0.85rem",
                fontWeight: active ? 700 : 500,
                color: active ? "var(--brand-gold)" : "var(--text-secondary)",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      <div className="rd-nav-spacer" style={{ flex: 1 }} />

      <div className="rd-nav-right" style={{ display: "none", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <LanguageSelector />
        <SuiSignInNavButton prominent />
      </div>

      <div className="rd-nav-mobile" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ width: 16, height: 2, background: "currentColor", borderRadius: 2 }} />
          <span style={{ width: 16, height: 2, background: "currentColor", borderRadius: 2 }} />
        </button>
      </div>

      {open && (
        <div
          className="rd-nav-drawer"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "var(--nav-bg-solid)",
            borderBottom: "1px solid var(--border)",
            padding: "0.75rem clamp(0.9rem,2.5vw,1.9rem) 1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                padding: "0.75rem 0.5rem",
                borderRadius: 10,
                textDecoration: "none",
                fontFamily: FONT,
                fontSize: "0.95rem",
                fontWeight: 600,
                color: isLinkActive(
                  pathname,
                  l.href,
                  "exact" in l ? l.exact : undefined,
                  "matchPrefixes" in l ? l.matchPrefixes : undefined,
                )
                  ? "var(--brand-gold)"
                  : "var(--text-primary)",
                minHeight: 44,
                display: "flex",
                alignItems: "center",
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ height: 1, background: "var(--border)", margin: "0.5rem 0" }} />
          <div style={{ padding: "0.35rem 0.5rem" }}>
            <LanguageSelector />
          </div>
          <div style={{ marginTop: "0.35rem" }}>
            <SuiSignInNavButton prominent />
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 920px) {
          .rd-nav-links { display: flex !important; }
          .rd-nav-right { display: flex !important; }
          .rd-nav-spacer { display: none !important; }
          .rd-nav-mobile { display: none !important; }
          .rd-nav-drawer { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
