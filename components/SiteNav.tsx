"use client";
// FILE: components/SiteNav.tsx
// Persistent top navigation for legacy routes still on PageShell.

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { springSnappy } from "@/lib/motion/variants";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { LanguageSelector } from "@/components/LanguageSelector";

const MotionLink = motion.create(Link);

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

const PRIMARY_LINKS = [
  { href: "/terminal",  label: "Marketplace" },
  { href: "/passport",  label: "Passport" },
  { href: "/build",     label: "Build" },
  { href: "/partners",  label: "Partners" },
  { href: "/docs",      label: "Docs" },
];

const RESOURCE_LINKS = [
  { href: "/roadmap",     label: "Roadmap" },
  { href: "/tokenomics",  label: "Tokenomics" },
  { href: "/faq",         label: "FAQ" },
  { href: "/security",    label: "Security" },
  { href: "/about",       label: "About" },
];

interface SiteNavProps {
  onWaitlistClick?: () => void;
}

function NavLink({ href, label, active, small }: {
  href: string;
  label: string;
  active: boolean;
  small?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <MotionLink href={href}
      whileHover={reduce ? undefined : { scale: 1.06 }}
      whileTap={reduce ? undefined : { scale: 0.95 }}
      transition={springSnappy}
      style={{
        position: "relative",
        padding: "0.45rem 0.9rem",
        borderRadius: 999,
        textDecoration: "none",
        fontFamily: S,
        fontSize: small ? "0.76rem" : "0.82rem",
        fontWeight: active ? 700 : 500,
        color: active ? G : "var(--text-secondary)",
      }}>
      {active && (
        <motion.span
          layoutId="siteNavActivePill"
          transition={springSnappy}
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
      {label}
    </MotionLink>
  );
}

export function SiteNav({ onWaitlistClick }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "var(--nav-bg-solid)",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 clamp(0.75rem, 2.5vw, 1.75rem)",
      height: "clamp(58px, 8vw, 68px)",
      gap: "0.5rem",
    }}>
      <Link href="/terminal" style={{
        display: "flex",
        alignItems: "center",
        gap: "0.55rem",
        textDecoration: "none",
        flexShrink: 0,
      }}>
        <Image src="/icon-48.png" alt="Abraxas"
          width={30} height={30} priority
          style={{ display: "block", borderRadius: 8 }} />
        <span style={{
          fontFamily: S,
          fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
          fontWeight: 800,
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}>
          Abraxas
        </span>
      </Link>

      <div className="abr-site-nav-links" style={{
        display: "none",
        flex: 1,
        justifyContent: "center",
        gap: "0.2rem",
        flexWrap: "wrap",
      }}>
        {PRIMARY_LINKS.map(link => (
          <NavLink key={link.href} href={link.href} label={link.label}
            active={!!pathname?.startsWith(link.href)} />
        ))}
        <span style={{ color: "var(--border)", padding: "0 0.15rem" }}>|</span>
        {RESOURCE_LINKS.map(link => (
          <NavLink key={link.href} href={link.href} label={link.label}
            active={!!pathname?.startsWith(link.href)} small />
        ))}
      </div>

      <div style={{ flex: 1, display: "block" }} className="abr-site-nav-spacer" />

      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
        <a href="/terminal?demo=1" className="abr-demo-link"
          style={{
            display: "none",
            padding: "0.4rem 0.75rem",
            borderRadius: 999,
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
            fontFamily: S,
            fontSize: "0.68rem",
            fontWeight: 600,
            textDecoration: "none",
          }}>
          Tour
        </a>
        {onWaitlistClick && (
          <button type="button" onClick={onWaitlistClick}
            className="abr-waitlist-btn"
            style={{
              display: "none",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.75rem",
              borderRadius: 999,
              cursor: "pointer",
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.35)",
            }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6" }} />
            <span style={{ fontFamily: S, fontSize: "0.65rem", fontWeight: 700, color: "#8B5CF6" }}>
              ZK Login
            </span>
          </button>
        )}
        <WalletConnectButton />
        <ThemeToggle />
        <LanguageSelector />
      </div>

      <style>{`
        @media (min-width: 1100px) {
          .abr-site-nav-links { display: flex !important; }
          .abr-site-nav-spacer { display: none !important; }
          .abr-waitlist-btn, .abr-demo-link { display: inline-flex !important; }
        }
      `}</style>
    </nav>
  );
}
