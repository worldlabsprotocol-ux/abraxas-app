"use client";
// FILE: components/redesign/RedesignNav.tsx
// Streamlined nav. Home · Passport · Integrate · Verify · Docs · profile menu.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NavProfileMenu, NavSignInButton } from "@/components/sui/NavProfileMenu";
import { useSuiAuthOptional } from "@/components/sui/SuiAuthProvider";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { NAV_PARTNER_VERIFY_LABEL } from "@/lib/integrate/partnerJourney";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "var(--accent)";
const MotionLink = motion.create(Link);

type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
  matchPrefixes?: string[];
};

const PRIMARY_LINKS: NavLink[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/passport", label: "Passport", matchPrefixes: ["/passport"] },
  { href: "/integrate", label: "Integrate", matchPrefixes: ["/integrate", "/developers", "/design-partner"] },
];

const DESKTOP_LINKS: NavLink[] = [
  ...PRIMARY_LINKS,
  { href: "/verify", label: NAV_PARTNER_VERIFY_LABEL, matchPrefixes: ["/verify"] },
  { href: "/docs/partner-flow", label: "Docs", matchPrefixes: ["/docs"] },
];

const MOBILE_DRAWER_LINKS: NavLink[] = [
  ...PRIMARY_LINKS,
  { href: "/docs", label: "Documentation" },
  { href: "/verify", label: "Verify proofs" },
];

function isLinkActive(pathname: string | null, href: string, exact?: boolean, matchPrefixes?: string[]) {
  if (matchPrefixes?.length) {
    return matchPrefixes.some((p) => pathname === p || (pathname?.startsWith(p + "/") ?? false));
  }
  if (href === "/") return pathname === "/" || pathname === "/terminal";
  if (exact) return pathname === href;
  return pathname === href || (pathname?.startsWith(href + "/") ?? false);
}

export function RedesignNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const auth = useSuiAuthOptional();
  const [open, setOpen] = useState(false);
  const signedIn = Boolean(auth?.suiAddress);

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
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          textDecoration: "none",
          flexShrink: 0,
        }}
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
      </Link>

      <div
        className="rd-nav-links"
        style={{ display: "none", flex: 1, justifyContent: "center", gap: "0.15rem", alignItems: "center", flexWrap: "wrap", minWidth: 0 }}
      >
        {DESKTOP_LINKS.map((l) => {
          const active = isLinkActive(
            pathname,
            l.href,
            l.exact,
            "matchPrefixes" in l ? l.matchPrefixes : undefined,
          );
          return (
            <MotionLink
              key={l.href}
              href={l.href}
              whileHover={reduce ? undefined : { scale: 1.06 }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              style={{
                position: "relative",
                padding: "0.4rem 0.7rem",
                borderRadius: 999,
                textDecoration: "none",
                fontFamily: FONT,
                fontSize: "clamp(0.78rem, 1.1vw, 0.86rem)",
                fontWeight: active ? 700 : 500,
                color: active ? ACCENT : "var(--text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {active && (
                <motion.span
                  layoutId="rdNavPill"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    zIndex: -1,
                  }}
                />
              )}
              {l.label}
            </MotionLink>
          );
        })}
      </div>

      <div className="rd-nav-spacer" style={{ flex: 1 }} />

      <div className="rd-nav-right" style={{ display: "none", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <LanguageSelector />
        {signedIn ? <NavProfileMenu prominent /> : <NavSignInButton prominent />}
      </div>

      <div className="rd-nav-mobile" style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>
        {signedIn ? <NavProfileMenu /> : <NavSignInButton />}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="rd-nav-mobile-drawer"
          style={{
            width: 40,
            height: 40,
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

      <AnimatePresence>
        {open && (
          <motion.div
            id="rd-nav-mobile-drawer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
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
              gap: "0.35rem",
            }}
          >
            {MOBILE_DRAWER_LINKS.map((l) => (
              <Link
                key={`${l.href}-${l.label}`}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{
                  padding: "0.7rem 0.5rem",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontFamily: FONT,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: isLinkActive(
                    pathname,
                    l.href,
                    l.exact,
                    l.matchPrefixes,
                  )
                    ? ACCENT
                    : "var(--text-primary)",
                }}
              >
                {l.label}
              </Link>
            ))}
            {signedIn && (
              <>
                <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />
                <Link href="/account" onClick={() => setOpen(false)} style={mobileSubLink}>My account</Link>
                <Link href="/build" onClick={() => setOpen(false)} style={mobileSubLink}>Submit asset</Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 920px) {
          .rd-nav-links { display: flex !important; }
          .rd-nav-right { display: flex !important; }
          .rd-nav-spacer { display: none !important; }
          .rd-nav-mobile { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

const mobileSubLink: React.CSSProperties = {
  padding: "0.55rem 0.5rem",
  borderRadius: 10,
  textDecoration: "none",
  fontFamily: ABRAXAS_FONT_SANS,
  fontSize: "0.88rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};
