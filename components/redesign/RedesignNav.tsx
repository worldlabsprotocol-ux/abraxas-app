"use client";
// FILE: components/redesign/RedesignNav.tsx
// Two-item primary nav: Assets · Account. Everything else lives in the menu.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SuiSignInNavButton } from "@/components/sui/SuiSignInNavButton";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const MotionLink = motion.create(Link);

const LINKS = [
  { href: "/terminal", label: "Assets" },
  { href: "/passport", label: "Account" },
];

const MORE_LINKS = [
  { href: "/investors", label: "Investors" },
  { href: "/metrics", label: "Metrics" },
  { href: "/terminal#featured-asset", label: "Featured stay" },
  { href: "/flagship", label: "Cielo dossier" },
  { href: "/build", label: "Submit asset" },
  { href: "/partners", label: "Partners" },
  { href: "/institutional", label: "Institutional" },
  { href: "/docs/ail", label: "Developer docs" },
  { href: "/docs/sui", label: "Sui integration" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/swap", label: "Swap" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/music-audit", label: "Music audit" },
  { href: "/faq", label: "FAQ" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
];

export function RedesignNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "var(--nav-bg-solid)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      padding: "0 clamp(0.9rem, 2.5vw, 1.9rem)",
      height: "clamp(60px, 8vw, 72px)", gap: "0.85rem",
    }}>
      <Link href="/terminal" style={{ display: "flex", alignItems: "center", gap: "0.55rem",
                                       textDecoration: "none", flexShrink: 0 }}>
        <Image src="/icon-48.png" alt="Abraxas" width={30} height={30} priority
          style={{ display: "block", borderRadius: 8 }} />
        <span style={{ fontFamily: FONT, fontSize: "clamp(1.05rem,1.6vw,1.25rem)",
                        fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Abraxas
        </span>
      </Link>

      <div className="rd-nav-links" style={{ display: "none", flex: 1,
                                              justifyContent: "center", gap: "0.25rem" }}>
        {LINKS.map(l => {
          const active = pathname?.startsWith(l.href);
          return (
            <MotionLink key={l.href} href={l.href}
              whileHover={reduce ? undefined : { scale: 1.06 }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              style={{ position: "relative", padding: "0.45rem 0.9rem", borderRadius: 999,
                       textDecoration: "none", fontFamily: FONT, fontSize: "0.85rem",
                       fontWeight: active ? 700 : 500,
                       color: active ? ACCENT : "var(--text-secondary)" }}>
              {active && (
                <motion.span layoutId="rdNavPill" style={{ position: "absolute", inset: 0,
                  borderRadius: 999, background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.25)", zIndex: -1 }} />
              )}
              {l.label}
            </MotionLink>
          );
        })}
      </div>
      <div className="rd-nav-spacer" style={{ flex: 1 }} />

      <div className="rd-nav-right" style={{ display: "none", alignItems: "center", gap: "0.5rem",
                                              flexShrink: 0 }}>
        <LanguageSelector />
        <SuiSignInNavButton prominent />
      </div>

      <div className="rd-nav-mobile" style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                                               marginLeft: "auto" }}>
        <LanguageSelector />
        <button onClick={() => setOpen(o => !o)} aria-label="Menu"
          style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border)",
                   background: "var(--surface-raised)", color: "var(--text-primary)",
                   cursor: "pointer", display: "flex", alignItems: "center",
                   justifyContent: "center", flexDirection: "column", gap: 4 }}>
          <span style={{ width: 16, height: 2, background: "currentColor", borderRadius: 2 }} />
          <span style={{ width: 16, height: 2, background: "currentColor", borderRadius: 2 }} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ position: "absolute", top: "100%", left: 0, right: 0,
                     background: "var(--nav-bg-solid)", borderBottom: "1px solid var(--border)",
                     padding: "0.75rem clamp(0.9rem,2.5vw,1.9rem) 1.1rem",
                     display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                style={{ padding: "0.7rem 0.5rem", borderRadius: 10, textDecoration: "none",
                         fontFamily: FONT, fontSize: "0.95rem", fontWeight: 600,
                         color: pathname?.startsWith(l.href) ? ACCENT : "var(--text-primary)" }}>
                {l.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />
            {MORE_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                style={{ padding: "0.55rem 0.5rem", borderRadius: 10, textDecoration: "none",
                         fontFamily: FONT, fontSize: "0.85rem", fontWeight: 500,
                         color: pathname?.startsWith(l.href.split("#")[0]) ? ACCENT : "var(--text-secondary)" }}>
                {l.label}
              </Link>
            ))}
            <div style={{ marginTop: "0.5rem" }}>
              <SuiSignInNavButton prominent />
            </div>
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
