// FILE: components/FloatingTerminal.tsx
// Persistent VOS terminal button. bottom-right corner on every page.
// Click to open/close the panel. Works like Intercom/support chat.
// Add <FloatingTerminal /> to app/layout.tsx.
"use client";

import { useState, useEffect } from "react";
import { VerificationTerminal } from "@/components/vos/VerificationTerminal";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const G   = "#10B981";
const BDR = "#1C2333";

export function FloatingTerminal() {
  const [open,    setOpen]    = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      {/* Panel */}
      {open && (
        <>
          {/* Backdrop (mobile) */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 8998,
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Terminal panel */}
          <div style={{
            position: "fixed",
            bottom: "clamp(56px,9vh,72px)",
            right: "clamp(0.75rem,2vw,1.25rem)",
            width: "min(480px, calc(100vw - 1.5rem))",
            height: "clamp(340px,52vh,560px)",
            zIndex: 8999,
            border: `1px solid ${G}40`,
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px ${G}20`,
            display: "flex", flexDirection: "column",
          }}>
            {/* Panel header */}
            <div style={{
              background: "#030508", borderBottom: `1px solid ${BDR}`,
              padding: "0.5rem 0.875rem",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%",
                               background: G, boxShadow: `0 0 5px ${G}` }}/>
                <span style={{ fontFamily: M, fontSize: "0.65rem",
                                fontWeight: 700, color: G, letterSpacing: "0.1em",
                                textTransform: "uppercase" }}>
                  Abraxas VOS
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: "0.2rem 0.5rem", borderRadius: 4,
                  border: `1px solid ${BDR}`, background: "transparent",
                  color: "rgba(255,255,255,0.4)", fontFamily: M,
                  fontSize: "0.7rem", cursor: "pointer",
                }}>✕</button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <VerificationTerminal />
            </div>
          </div>
        </>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Open Abraxas VOS Terminal"
        style={{
          position: "fixed",
          bottom: "clamp(0.875rem,2vh,1.25rem)",
          right: "clamp(0.75rem,2vw,1.25rem)",
          zIndex: 9000,
          width: 48, height: 48, borderRadius: "50%",
          border: `1.5px solid ${open ? G : "rgba(16,185,129,0.4)"}`,
          background: open ? G : "rgba(6,8,16,0.92)",
          backdropFilter: "blur(8px)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: open
            ? `0 0 20px ${G}50`
            : "0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.15)",
          transition: "all 0.2s",
        }}
      >
        {open ? (
          <span style={{ fontFamily: M, fontSize: "0.7rem",
                          fontWeight: 900, color: "#000" }}>✕</span>
        ) : (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h10M4 18h7" stroke="#10B981"
              strokeWidth="1.75" strokeLinecap="round"/>
            <circle cx="19" cy="18" r="2.5" stroke="#10B981"
              strokeWidth="1.5" fill="rgba(16,185,129,0.15)"/>
          </svg>
        )}
      </button>
    </>
  );
}
