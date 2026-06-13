"use client";
// FILE: components/terminal/TerminalApp.tsx
// Outer shell: status strip + sticky nav. Renders TerminalMain inside.
// Default export — imported by app/terminal/page.tsx.

import Image             from "next/image";
import { CompactWallet } from "@/components/CompactWallet";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TerminalMain }  from "./TerminalMain";
import { M, BG, BDR, G, A, B, W } from "./tokens";

const STATUS_ITEMS = [
  { dot: G, text: "SOLANA MAINNET" },
  { dot: G, text: "AAS-1 PROTOCOL ACTIVE" },
  { dot: A, text: "REG A / D / CF READY" },
  { dot: B, text: "OWNERSHIP INFRASTRUCTURE" },
];

export default function TerminalApp() {
  return (
    <div style={{ background: BG, minHeight: "100vh",
                   display: "flex", flexDirection: "column" }}>

      {/* Protocol status strip */}
      <div style={{ background: "#060810",
                     borderBottom: "1px solid #0F1929",
                     padding: "0 clamp(0.75rem,2.5vw,1.5rem)",
                     height: 28, display: "flex", alignItems: "center",
                     gap: "1.5rem", overflowX: "auto", flexShrink: 0 }}>
        {STATUS_ITEMS.map(s => (
          <div key={s.text}
            style={{ display: "flex", alignItems: "center",
                      gap: "0.35rem", flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%",
                           background: s.dot,
                           boxShadow: `0 0 5px ${s.dot}80` }} />
            <span style={{ fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                            color: "rgba(255,255,255,0.25)",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase" }}>
              {s.text}
            </span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontFamily: M, fontSize: "0.6rem",
                        color: "rgba(255,255,255,0.15)",
                        letterSpacing: "0.1em" }}>
          ABRAXAS OS · BUILD 2025.1
        </span>
      </div>

      {/* Sticky nav */}
      <nav style={{ position: "sticky", top: 28, zIndex: 200,
                     background: "rgba(10,12,16,0.97)",
                     backdropFilter: "blur(12px)",
                     borderBottom: `1px solid ${BDR}`,
                     display: "flex", alignItems: "center",
                     padding: `0 clamp(0.75rem,2.5vw,1.5rem)`,
                     height: "clamp(46px,6vw,54px)",
                     gap: "clamp(0.25rem,1vw,0.5rem)",
                     flexWrap: "nowrap", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center",
                       gap: "0.375rem", flexShrink: 0,
                       marginRight: "clamp(0.375rem,1.5vw,1rem)" }}>
          <Image src="/icon-48.png" alt="Abraxas"
                 width={24} height={24} priority
                 style={{ display: "block", flexShrink: 0 }} />
          <div>
            <span style={{ fontFamily: M,
                            fontSize: "clamp(1rem,1.5vw,1.15rem)",
                            fontWeight: 900, color: W,
                            letterSpacing: "0.1em" }}>
              ABRAXAS
            </span>
            <span className="abraxas-nav-os"
              style={{ fontFamily: M, fontSize: "1.1rem",
                        color: "rgba(255,255,255,0.2)",
                        letterSpacing: "0.15em",
                        marginLeft: "0.375rem",
                        verticalAlign: "middle" }}>
              PROTOCOL OS
            </span>
          </div>
        </div>

        <button style={{ padding: "0.5rem clamp(0.75rem,1.5vw,1.125rem)",
                          borderRadius: 5,
                          border: `1px solid ${G}50`,
                          background: `${G}10`, color: G,
                          fontFamily: M,
                          fontSize: "clamp(0.7rem,0.85vw,0.85rem)",
                          fontWeight: 700, cursor: "default",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          whiteSpace: "nowrap", flexShrink: 0 }}>
          TERMINAL
        </button>

        <a href="/dashboard"
          style={{ padding: "0.5rem clamp(0.75rem,1.5vw,1.125rem)",
                    borderRadius: 5, border: `1px solid ${BDR}`,
                    background: "transparent",
                    color: "rgba(255,255,255,0.4)",
                    fontFamily: M,
                    fontSize: "clamp(0.7rem,0.85vw,0.85rem)",
                    fontWeight: 700, textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap", flexShrink: 0 }}>
          DASHBOARD
        </a>

        <div style={{ flex: 1 }} />
        <LanguageSelector />
        <CompactWallet />
      </nav>

      <div style={{ flex: 1 }}>
        <TerminalMain />
      </div>
    </div>
  );
}
