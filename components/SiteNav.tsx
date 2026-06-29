"use client";
// FILE: components/SiteNav.tsx
// Persistent top navigation across all protocol pages.

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { LanguageSelector } from "@/components/LanguageSelector";

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

export function SiteNav({ onWaitlistClick }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "sticky",
      top: 0,
      zIndex: 200,
      background: "var(--nav-bg)",
      backdropFilter: "blur(var(--glass-blur))",
      WebkitBackdropFilter: "blur(var(--glass-blur))",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 clamp(0.75rem, 2.5vw, 1.75rem)",
      height: "clamp(58px, 8vw, 68px)",
      gap: "0.5rem",
    }}>
      <a href="/terminal" style={{
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
      </a>

      <div className="abr-site-nav-links" style={{
        display: "none",
        flex: 1,
        justifyContent: "center",
        gap: "0.2rem",
        flexWrap: "wrap",
      }}>
        {PRIMARY_LINKS.map(link => {
          const active = pathname?.startsWith(link.href);
          return (
            <a key={link.href} href={link.href}
              style={navLinkStyle(active)}>
              {link.label}
            </a>
          );
        })}
        <span style={{ color: "var(--border)", padding: "0 0.15rem" }}>|</span>
        {RESOURCE_LINKS.map(link => {
          const active = pathname?.startsWith(link.href);
          return (
            <a key={link.href} href={link.href}
              style={{ ...navLinkStyle(active), fontSize: "0.76rem" }}>
              {link.label}
            </a>
          );
        })}
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

function navLinkStyle(active: boolean): React.CSSProperties {
  return {
    padding: "0.4rem 0.75rem",
    borderRadius: 999,
    textDecoration: "none",
    fontFamily: S,
    fontSize: "0.8rem",
    fontWeight: active ? 700 : 500,
    color: active ? G : "var(--text-secondary)",
    background: active ? "rgba(16,185,129,0.12)" : "transparent",
    border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
  };
}
