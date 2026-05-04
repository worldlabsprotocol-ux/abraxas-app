// FILE: components/BottomNav.tsx
// Vibrant mobile-first bottom tab bar.
// Three tabs: Intelligence · Vaults · IP/RWA
// Glassmorphism + per-tab neon active glow.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TAB_COLORS = {
  intelligence: { active: "#60A5FA", glow: "rgba(96,165,250,0.25)",  bg: "rgba(96,165,250,0.1)"  },
  vaults:       { active: "#14F195", glow: "rgba(20,241,149,0.25)",  bg: "rgba(20,241,149,0.08)" },
  rwa:          { active: "#FBBF24", glow: "rgba(251,191,36,0.25)",  bg: "rgba(251,191,36,0.1)"  },
};

const TABS = [
  {
    key:    "intelligence",
    label:  "Intelligence",
    href:   "/",
    icon:   (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
    matches: (p: string) => p === "/" || p.startsWith("/circuit") || p.startsWith("/agents"),
  },
  {
    key:    "vaults",
    label:  "Vaults",
    href:   "/operate",
    icon:   (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
      </svg>
    ),
    matches: (p: string) => p.startsWith("/operate") || p.startsWith("/deposit") || p.startsWith("/vault") || p.startsWith("/dashboard"),
  },
  {
    key:    "rwa",
    label:  "IP / RWA",
    href:   "/rwa",
    icon:   (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    ),
    matches: (p: string) => p.startsWith("/rwa") || p.startsWith("/marketplace"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      height: "72px",
      display: "flex", alignItems: "stretch",
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}>
      {TABS.map((tab) => {
        const active = tab.matches(pathname ?? "");
        const c      = TAB_COLORS[tab.key as keyof typeof TAB_COLORS];
        return (
          <Link key={tab.key} href={tab.href} style={{ flex: 1, textDecoration: "none" }}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "0.25rem", height: "100%", padding: "0.5rem 0",
              background:   active ? c.bg : "transparent",
              boxShadow:    active ? `inset 0 2px 0 ${c.active}` : "none",
              transition:   "all 0.2s",
              cursor:       "pointer",
            }}>
              {/* Icon with glow when active */}
              <div style={{
                transition: "transform 0.15s, filter 0.15s",
                filter: active ? `drop-shadow(0 0 6px ${c.active})` : "none",
                transform: active ? "translateY(-1px)" : "translateY(0)",
              }}>
                {tab.icon(active, c.active)}
              </div>
              <span style={{
                fontSize:      "0.58rem",
                fontWeight:    active ? 700 : 400,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color:         active ? c.active : "rgba(255,255,255,0.3)",
                transition:    "color 0.2s",
              }}>
                {tab.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}