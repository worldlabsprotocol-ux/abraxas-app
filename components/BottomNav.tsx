// FILE: components/BottomNav.tsx
// 2-tab bottom nav: Terminal (home + arena unified) · Vaults
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
    color: "#6b8cff",
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.28)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8l3 3-3 3M13 14h4"/>
      </svg>
    ),
  },
  {
    key: "vaults",
    label: "Vaults",
    href: "/protect",
    matches: (p: string) =>
      p.startsWith("/protect") || p.startsWith("/vault") || p.startsWith("/circuit"),
    color: "#14F195",
    icon: (active: boolean, color: string) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke={active ? color : "rgba(255,255,255,0.28)"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { systemState } = useSystemState();
  const atRisk   = systemState === "AT_RISK" || systemState === "CIRCUIT_TRIGGERED";

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      height: "68px",
      display: "flex", alignItems: "center",
      background: "rgba(2,3,10,0.94)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    }}>
      {TABS.map((tab) => {
        const active     = tab.matches(pathname);
        const showAlert  = tab.key === "vaults" && atRisk;

        return (
          <Link key={tab.key} href={tab.href}
            onClick={() => { window.scrollTo({ top:0, behavior:"smooth" }); }}
            style={{ textDecoration: "none", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.25rem", position: "relative", padding: "0.375rem 0" }}>

            {/* Active bar */}
            {active && (
              <span style={{ position:"absolute", top:0, left:"25%", right:"25%", height:"2px", borderRadius:"0 0 2px 2px", background:tab.color, boxShadow:`0 0 8px ${tab.color}` }} />
            )}

            {/* Alert dot */}
            {showAlert && (
              <span style={{ position:"absolute", top:"6px", right:"calc(50% - 16px)", width:"6px", height:"6px", borderRadius:"50%", background:"#f26b6b", boxShadow:"0 0 5px rgba(242,107,107,0.8)", animation:"pulse 1s ease-in-out infinite" }} />
            )}

            {tab.icon(active, tab.color)}

            <span style={{
              fontSize: "0.62rem", fontWeight: active ? 700 : 400,
              color: active ? tab.color : "rgba(255,255,255,0.28)",
              letterSpacing: "0.03em", lineHeight: 1,
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}