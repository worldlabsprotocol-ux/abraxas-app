"use client";
// FILE: components/redesign/RedesignNav.tsx
// Consumer nav: Home · Passport · Verify — assets via Home photos.

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SuiSignInNavButton } from "@/components/sui/SuiSignInNavButton";
import { ProtocolBetaBadge } from "./ProtocolBetaBadge";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MotionLink = motion.create(Link);

const LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/integrate", label: "Integrate", matchPrefixes: ["/integrate", "/integrations", "/developers"] },
  { href: "/passport", label: "Passport & Verify", matchPrefixes: ["/passport", "/verify"] },
];

const MORE_LINKS = [
  { href: "/operators", label: "Operators" },
  { href: "/developers", label: "Developers" },
  { href: "/docs", label: "Documentation" },
  { href: "/integrations", label: "Integration hub" },
  { href: "/portal", label: "Owner portal" },
  { href: "/blog", label: "Learn hub" },
  { href: "/blog/founder", label: "From the builder" },
  { href: "/community", label: "Community" },
  { href: "/#registry", label: "Browse assets" },
  { href: "/case-studies/cielo", label: "Cielo case study" },
  { href: "/tokenized-stocks", label: "Tokenized stocks" },
  { href: "/design-partner", label: "Design partner" },
  { href: "/account", label: "My account" },
  { href: "/developers/partner", label: "Partner dashboard" },
];

function isLinkActive(pathname: string | null, href: string, exact?: boolean, matchPrefixes?: string[]) {
  if (matchPrefixes?.length) {
    return matchPrefixes.some(p => pathname === p || (pathname?.startsWith(p + "/") ?? false));
  }
  if (href === "/") return pathname === "/" || pathname === "/terminal";
  if (exact) return pathname === href;
  return pathname === href || (pathname?.startsWith(href + "/") ?? false);
}

export function RedesignNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const onHome = isLinkActive(pathname, "/", true);

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      background: "var(--nav-bg-solid)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center",
      padding: "0 clamp(0.9rem, 2.5vw, 1.9rem)",
      height: "clamp(60px, 8vw, 72px)", gap: "0.85rem",
    }}>
      <Link href="/" aria-label="Abraxas home" style={{
        display: "flex", alignItems: "center", gap: "0.55rem",
        textDecoration: "none", flexShrink: 0,
      }}>
        <ProtocolBetaBadge compact />
        <Image src="/icon-48.png" alt="" width={30} height={30} priority
          style={{ display: "block", borderRadius: 8 }} />
        <span style={{ fontFamily: FONT, fontSize: "clamp(1.05rem,1.6vw,1.25rem)",
                        fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Abraxas
        </span>
      </Link>

      <div className="rd-nav-links" style={{ display: "none", flex: 1,
                                              justifyContent: "center", gap: "0.25rem" }}>
        {LINKS.map(l => {
          const active = isLinkActive(pathname, l.href, l.exact, "matchPrefixes" in l ? l.matchPrefixes : undefined);
          return (
            <MotionLink key={l.href} href={l.href}
              whileHover={reduce ? undefined : { scale: 1.06 }}
              whileTap={reduce ? undefined : { scale: 0.95 }}
              style={{ position: "relative", padding: "0.45rem 0.9rem", borderRadius: 999,
                       textDecoration: "none", fontFamily: FONT, fontSize: "0.85rem",
                       fontWeight: active ? 700 : 500,
                       color: active ? "var(--accent)" : "var(--text-secondary)" }}>
              {active && (
                <motion.span layoutId="rdNavPill" style={{ position: "absolute", inset: 0,
                  borderRadius: 999, background: "var(--accent-faint)",
                  border: "1px solid var(--accent-border)", zIndex: -1 }} />
              )}
              {l.label}
            </MotionLink>
          );
        })}
      </div>

      <div className="rd-nav-spacer" style={{ flex: 1 }} />

      <div className="rd-nav-right" style={{ display: "none", alignItems: "center", gap: "0.5rem",
                                              flexShrink: 0 }}>
        {!onHome && (
          <Link href="/" style={{
            padding: "0.4rem 0.85rem", borderRadius: 999,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-faint)",
            fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
            color: "var(--accent)", textDecoration: "none",
          }}>
            ← Home
          </Link>
        )}
        <Link href="/docs" style={{
          fontFamily: FONT, fontSize: "0.78rem", fontWeight: 500,
          color: "var(--text-secondary)", textDecoration: "none", padding: "0.35rem 0.6rem",
        }}>
          Docs
        </Link>
        <LanguageSelector />
        <SuiSignInNavButton prominent />
      </div>

      <div className="rd-nav-mobile" style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                                               marginLeft: "auto" }}>
        {!onHome && (
          <Link href="/" style={{
            padding: "0.35rem 0.65rem", borderRadius: 999,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-faint)",
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 700,
            color: "var(--accent)", textDecoration: "none",
          }}>
            Home
          </Link>
        )}
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
                         color: isLinkActive(pathname, l.href, l.exact, "matchPrefixes" in l ? l.matchPrefixes : undefined) ? "var(--accent)" : "var(--text-primary)" }}>
                {l.label}
              </Link>
            ))}
            <div style={{ height: 1, background: "var(--border)", margin: "0.35rem 0" }} />
            {MORE_LINKS.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                style={{ padding: "0.55rem 0.5rem", borderRadius: 10, textDecoration: "none",
                         fontFamily: FONT, fontSize: "0.85rem", fontWeight: 500,
                         color: pathname?.startsWith(l.href.split("#")[0]) ? "var(--accent)" : "var(--text-secondary)" }}>
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
