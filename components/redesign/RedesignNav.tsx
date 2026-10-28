"use client";
// FILE: components/redesign/RedesignNav.tsx
// Primary public header — Product · Developers · Solutions · one primary build CTA · account · language.

import Link from "next/link";
import { AbraxasLogo } from "@/components/brand/AbraxasLogo";
import { LanguageSelector } from "@/components/LanguageSelector";
import { PublicNavConnectButton } from "@/components/nav/PublicNavConnectButton";
import { PublicNavSectionMenu } from "@/components/nav/PublicNavSectionMenu";
import { AbraxasGuideNavButton } from "@/components/product/AbraxasGuideDialog";
import {
  PUBLIC_FONT_SANS,
  PUBLIC_NAV_MENUS,
  PUBLIC_NAV_PRIMARY_CTA,
} from "@/lib/design/publicSurface";
import { useState, type CSSProperties } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const FONT = PUBLIC_FONT_SANS;

export function RedesignNav(_props: { showHomeStartBuilding?: boolean }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="rd-nav-root"
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

      <div className="rd-nav-menus-desktop" aria-label="Site sections">
        {PUBLIC_NAV_MENUS.map((menu) => (
          <PublicNavSectionMenu key={menu.id} menu={menu} />
        ))}
      </div>

      <div className="rd-nav-spacer" style={{ flex: 1 }} />

      <div className="rd-nav-right rd-nav-actions" style={{ display: "none" }}>
        <AbraxasGuideNavButton />
        <LanguageSelector />
        <PublicNavConnectButton headerPrimary />
      </div>

      <div className="rd-nav-mobile rd-nav-actions" style={{ display: "flex", marginLeft: "auto" }}>
        <AbraxasGuideNavButton />
        <LanguageSelector compact />
        <PublicNavConnectButton headerPrimary compact />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Open navigation menu"
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
            {PUBLIC_NAV_MENUS.map((menu) => (
              <div key={menu.id}>
                <p style={mobileSectionLabel}>{menu.label}</p>
                {menu.links.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setOpen(false)} style={mobileSubLink}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
            <p style={mobileSectionLabel}>Product</p>
            <Link href={PUBLIC_NAV_PRIMARY_CTA.href} onClick={() => setOpen(false)} style={mobileSubLink}>
              {PUBLIC_NAV_PRIMARY_CTA.label}
            </Link>
            <p style={mobileSectionLabel}>Account</p>
            <Link href="/developers/ephemeral-sandbox" onClick={() => setOpen(false)} style={mobileSubLink}>
              Developer Workspace
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 920px) {
          .rd-nav-right { display: flex !important; }
          .rd-nav-mobile { display: none !important; }
          .rd-nav-menus-desktop { display: flex; align-items: center; gap: 0.15rem; margin-left: 0.75rem; }
        }
        @media (max-width: 919px) {
          .rd-nav-menus-desktop { display: none; }
        }
        .rd-nav-root { position: sticky; flex-wrap: wrap; }
        .rd-nav-primary-action--compact {
          display: none;
        }
        @media (max-width: 919px) {
          .rd-nav-primary-action--compact {
            display: inline-flex;
            padding: 0.35rem 0.65rem;
            font-size: 0.72rem;
          }
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
