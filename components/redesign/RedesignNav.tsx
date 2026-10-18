"use client";
// FILE: components/redesign/RedesignNav.tsx
// Primary public header — logo · Language · Connect · Launch App (secondary routes in footer / mobile More).

import Link from "next/link";
import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PublicNavConnectButton } from "@/components/nav/PublicNavConnectButton";
import { PublicNavExploreLink } from "@/components/nav/PublicNavExploreLink";
import { PublicNavLaunchAppLink } from "@/components/nav/PublicNavLaunchAppLink";
import { PublicNavWalletButton } from "@/components/nav/PublicNavWalletButton";
import { PUBLIC_FONT_SANS, PUBLIC_NAV_DOCS_CTA, PUBLIC_NAV_EXPLORE_LINKS, PUBLIC_NAV_LINKS } from "@/lib/design/publicSurface";
import { useState, type CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const FONT = PUBLIC_FONT_SANS;

export function RedesignNav() {
  const reduce = useReducedMotion();
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
        height: "clamp(52px, 7vw, 60px)",
        gap: "0.85rem",
      }}
    >
      <AbraxasLogo variant="lockup" emblemSize={32} href="/" />

      <div className="rd-nav-spacer" style={{ flex: 1 }} />

      <div className="rd-nav-right rd-nav-actions" style={{ display: "none" }}>
        <LanguageSelector />
        <span className="rd-nav-explore-desktop">
          <PublicNavExploreLink prominent />
        </span>
        <PublicNavWalletButton prominent />
        <PublicNavConnectButton prominent />
        <PublicNavLaunchAppLink />
      </div>

      <div className="rd-nav-mobile rd-nav-actions" style={{ display: "flex", marginLeft: "auto" }}>
        <LanguageSelector />
        <PublicNavWalletButton />
        <PublicNavConnectButton />
        <PublicNavLaunchAppLink />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="More navigation"
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
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
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
            <p style={mobileSectionLabel}>Product</p>
            {PUBLIC_NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={mobileSubLink}>
                {l.label}
              </Link>
            ))}
            <Link href="/developers/integration-studio" onClick={() => setOpen(false)} style={mobileSubLink}>
              Explore Integration Studio
            </Link>
            <Link href="/#start-sandbox" onClick={() => setOpen(false)} style={mobileSubLink}>
              Create Abraxas account
            </Link>
            <Link href="/try" onClick={() => setOpen(false)} style={mobileSubLink}>
              Verification demo
            </Link>
            <p style={mobileSectionLabel}>Resources</p>
            <Link href={PUBLIC_NAV_DOCS_CTA.href} onClick={() => setOpen(false)} style={mobileSubLink}>
              {PUBLIC_NAV_DOCS_CTA.label}
            </Link>
            {PUBLIC_NAV_EXPLORE_LINKS.map((l) => (
              <Link key={`explore-${l.href}`} href={l.href} onClick={() => setOpen(false)} style={mobileSubLink}>
                {l.label}
              </Link>
            ))}
            <Link href="/account" onClick={() => setOpen(false)} style={mobileSubLink}>
              Account settings
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 920px) {
          .rd-nav-right { display: flex !important; }
          .rd-nav-mobile { display: none !important; }
        }
      `}</style>
    </nav>
  );
}

const mobileSectionLabel: CSSProperties = {
  margin: "0.45rem 0 0.15rem",
  fontFamily: FONT,
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

const mobileSubLink: CSSProperties = {
  padding: "0.55rem 0.5rem",
  borderRadius: 10,
  textDecoration: "none",
  fontFamily: FONT,
  fontSize: "0.88rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
};
