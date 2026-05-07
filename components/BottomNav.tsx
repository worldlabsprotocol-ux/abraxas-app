// FILE: components/BottomNav.tsx
// 3-tab bottom nav: Terminal · Vaults · Arena
// Circuit is embedded in Vaults — not a standalone destination.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSystemState } from "@/lib/systemState";

const TABS = [
  {
    key: "terminal",
    label: "Terminal",
    href: "/",
    matches: (p: string) => p === "/" || p === "/dashboard",
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3-3 3M13 14h4"/>
      </svg>
    ),
    color: "#6b8cff",
  },
  {
    key: "vaults",
    label: "Vaults",
    href: "/protect",
    matches: (p: string) =>
      p.startsWith("/protect") || p.startsWith("/vault") ||
      p.startsWith("/circuit") || p.startsWith("/dashboard"),
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    color: "#14F195",
  },
  {
    key: "arena",
    label: "Arena",
    href: "/arena",
    matches: (p: string) =>
      p.startsWith("/arena") || p.startsWith("/collect") || p.startsWith("/rwa"),
    icon: (active: boolean, color: string) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.3)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
        <line x1="13" y1="19" x2="19" y2="13"/>
        <line x1="16" y1="16" x2="20" y2="20"/>
      </svg>
    ),
    color: "#C8A96E",
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { systemState } = useSystemState();
  const atRisk = systemState === "AT_RISK" || systemState === "CIRCUIT_TRIGGERED";

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      height: "72px",
      display: "flex", alignItems: "center",
      background: "rgba(2,3,10,0.92)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.06)",
    }}>
      {TABS.map((tab) => {
        const active = tab.matches(pathname);
        const showAlert = tab.key === "vaults" && atRisk;

        return (
          <Link key={tab.key} href={tab.href}
            style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", position: "relative", padding: "0.375rem 0" }}>

            {/* Alert dot for vault state */}
            {showAlert && (
              <span style={{
                position: "absolute", top: "4px", right: "calc(50% - 14px)",
                width: "7px", height: "7px", borderRadius: "50%",
                background: "#f26b6b",
                boxShadow: "0 0 6px rgba(242,107,107,0.8)",
                animation: "pulse 1s ease-in-out infinite",
              }} />
            )}

            {tab.icon(active, tab.color)}

            <span style={{
              fontSize: "0.6rem", fontWeight: active ? 700 : 400,
              color: active ? tab.color : "rgba(255,255,255,0.3)",
              letterSpacing: "0.04em", lineHeight: 1,
            }}>
              {tab.label}
            </span>

            {/* Active indicator bar */}
            {active && (
              <span style={{
                position: "absolute", top: 0, left: "20%", right: "20%",
                height: "2px", borderRadius: "0 0 2px 2px",
                background: tab.color,
                boxShadow: `0 0 8px ${tab.color}`,
              }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}