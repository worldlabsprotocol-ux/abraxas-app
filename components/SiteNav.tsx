"use client";
// FILE: components/SiteNav.tsx
// Top navigation matching premium RWA protocol layouts (ZentraTech-style).

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { LanguageSelector } from "@/components/LanguageSelector";

const S = "'Inter',system-ui,-apple-system,sans-serif";
const G = "#10B981";

const NAV_LINKS = [
  { href: "/terminal",  label: "Marketplace" },
  { href: "/passport",  label: "Passport" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/build",     label: "Build" },
  { href: "/swap",      label: "Swap" },
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
      gap: "0.75rem",
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
        gap: "0.35rem",
      }}>
        {NAV_LINKS.map(link => {
          const active = pathname?.startsWith(link.href);
          return (
            <a key={link.href} href={link.href}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: 999,
                textDecoration: "none",
                fontFamily: S,
                fontSize: "0.82rem",
                fontWeight: active ? 700 : 500,
                color: active ? G : "var(--text-secondary)",
                background: active ? "rgba(16,185,129,0.12)" : "transparent",
                border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid transparent",
              }}>
              {link.label}
            </a>
          );
        })}
      </div>

      <div style={{ flex: 1, display: "block" }} className="abr-site-nav-spacer" />

      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
        {onWaitlistClick && (
          <button type="button" onClick={onWaitlistClick}
            style={{
              display: "none",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.45rem 0.85rem",
              borderRadius: 999,
              cursor: "pointer",
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.35)",
            }}
            className="abr-waitlist-btn">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#8B5CF6" }} />
            <span style={{
              fontFamily: S,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#8B5CF6",
            }}>
              ZK Login
            </span>
          </button>
        )}
        <WalletConnectButton />
        <ThemeToggle />
        <LanguageSelector />
      </div>

      <style>{`
        @media (min-width: 900px) {
          .abr-site-nav-links { display: flex !important; }
          .abr-site-nav-spacer { display: none !important; }
          .abr-waitlist-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
