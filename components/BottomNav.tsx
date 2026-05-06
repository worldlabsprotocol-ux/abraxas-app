// FILE: components/BottomNav.tsx
// RWA is Tab 0 — sovereignty before plumbing.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSystemState } from "@/lib/systemState";

const TAB_COLORS = {
  rwa:     { active: "#FBBF24", glow: "rgba(251,191,36,0.3)",   bg: "rgba(251,191,36,0.1)"  },
  collect: { active: "#C8A96E", glow: "rgba(200,169,110,0.3)",  bg: "rgba(200,169,110,0.1)" },
  protect: { active: "#14F195", glow: "rgba(20,241,149,0.25)",  bg: "rgba(20,241,149,0.08)" },
  circuit: { active: "#60A5FA", glow: "rgba(96,165,250,0.25)",  bg: "rgba(96,165,250,0.1)"  },
};

const TABS = [
  {
    key: "rwa", label: "IP / RWA", href: "/rwa",
    matches: (p: string) => p.startsWith("/rwa") || p === "/",
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
      </svg>
    ),
  },
  {
    key: "collect", label: "Collect", href: "/collect",
    matches: (p: string) => p.startsWith("/collect"),
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    key: "protect", label: "Vaults", href: "/protect",
    matches: (p: string) => p.startsWith("/protect") || p.startsWith("/vault") || p.startsWith("/dashboard"),
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="3"/>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
      </svg>
    ),
  },
  {
    key: "circuit", label: "Circuit", href: "/circuit",
    matches: (p: string) => p.startsWith("/circuit") || p.startsWith("/agents"),
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const { systemState } = useSystemState();
  const atRisk = systemState === "AT_RISK" || systemState === "CIRCUIT_TRIGGERED";

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      height: "72px", display: "flex", alignItems: "stretch",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderTop: atRisk ? "1px solid rgba(242,107,107,0.4)" : "1px solid rgba(255,255,255,0.07)",
    }}>
      {TABS.map((tab) => {
        const active     = tab.matches(pathname ?? "");
        const c          = TAB_COLORS[tab.key as keyof typeof TAB_COLORS];
        const showBadge  = tab.key === "protect" && atRisk;
        return (
          <Link key={tab.key} href={tab.href} style={{ flex: 1, textDecoration: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", height: "100%", padding: "0.5rem 0", background: active ? c.bg : "transparent", boxShadow: active ? `inset 0 2px 0 ${c.active}` : "none", transition: "all 0.2s", cursor: "pointer", position: "relative" }}>
              {showBadge && (
                <span style={{ position: "absolute", top: "10px", right: "calc(50% - 14px)", width: "7px", height: "7px", borderRadius: "50%", background: "#f26b6b", animation: "pulse 0.8s ease-in-out infinite" }} />
              )}
              <div style={{ filter: active ? `drop-shadow(0 0 7px ${c.active})` : "none", transform: active ? "translateY(-1px)" : "translateY(0)", transition: "all 0.15s" }}>
                {tab.icon(active, c.active)}
              </div>
              <span style={{ fontSize: "0.58rem", fontWeight: active ? 700 : 400, letterSpacing: "0.06em", textTransform: "uppercase", color: active ? c.active : "rgba(255,255,255,0.3)", transition: "color 0.2s" }}>
                {tab.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}