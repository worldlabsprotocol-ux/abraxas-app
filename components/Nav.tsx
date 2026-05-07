// FILE: components/Nav.tsx
// 3-button sovereign nav: Terminal · Vaults · Arena
// Circuit state pulse remains in logo area — information without a dedicated tab.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useCircuitState } from "@/lib/protocolStream";

const NAV_LINKS = [
  { label: "Terminal", href: "/",        match: (p: string) => p === "/" || p === "/dashboard" },
  { label: "Vaults",   href: "/protect", match: (p: string) => p.startsWith("/protect") || p.startsWith("/vault") || p.startsWith("/circuit") },
  { label: "Arena",    href: "/arena",   match: (p: string) => p.startsWith("/arena") || p.startsWith("/collect") || p.startsWith("/rwa") },
] as const;

export function Nav() {
  const pathname = usePathname();
  const { state } = useCircuitState();

  const pulseColor =
    state === "RISK"  ? "#f26b6b" :
    state === "WATCH" ? "#FBBF24" :
    "#14F195";

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      height: "56px",
      display: "flex", alignItems: "center",
      padding: "0 1.25rem",
      justifyContent: "space-between",
      background: "rgba(2,3,10,0.85)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* Logo + pulse */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          border: "1px solid rgba(200,169,110,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 10px rgba(200,169,110,0.15)",
        }}>
          <div style={{
            width: "9px", height: "9px", borderRadius: "50%",
            background: "var(--gold,#C8A96E)",
            boxShadow: "0 0 10px rgba(200,169,110,0.9)",
          }} />
        </div>
        <span style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 800, fontSize: "0.875rem",
          letterSpacing: "0.12em", color: "var(--gold,#C8A96E)",
          textTransform: "uppercase",
        }}>
          Abraxas
        </span>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.25rem",
          padding: "0.12rem 0.45rem", borderRadius: "100px",
          background: `${pulseColor}14`, border: `1px solid ${pulseColor}30`,
        }}>
          <span style={{
            width: "5px", height: "5px", borderRadius: "50%",
            background: pulseColor,
            animation: "pulse 1.5s ease-in-out infinite",
            boxShadow: `0 0 6px ${pulseColor}`,
          }} />
          <span style={{
            fontSize: "0.52rem", fontWeight: 700,
            color: pulseColor, letterSpacing: "0.1em", textTransform: "uppercase",
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {state === "RISK" ? "Alert" : state === "WATCH" ? "Watch" : "Online"}
          </span>
        </div>
      </Link>

      {/* 3-button nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {NAV_LINKS.map(({ label, href, match }) => {
          const active = match(pathname);
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div style={{
                padding: "0.35rem 0.875rem",
                borderRadius: "7px",
                fontSize: "0.72rem",
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.02em",
                color: active ? "#f0f0f0" : "rgba(255,255,255,0.4)",
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                border: `1px solid ${active ? "rgba(255,255,255,0.12)" : "transparent"}`,
                transition: "all 0.15s",
                cursor: "pointer",
              }}>
                {label}
              </div>
            </Link>
          );
        })}
        <div style={{ marginLeft: "0.5rem" }}>
          <ConnectWalletButton size="sm" compact />
        </div>
      </div>
    </nav>
  );
}