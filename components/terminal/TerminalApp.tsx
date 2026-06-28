"use client";
// FILE: components/terminal/TerminalApp.tsx
// Outer shell with premium top nav and marketplace content.

import { useState, useEffect } from "react";
import { TerminalMain }  from "./TerminalMain";
import { LiveBackground } from "@/components/LiveBackground";
import { SiteNav } from "@/components/SiteNav";
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { BottomNav }     from "@/components/BottomNav";
import { WaitlistForm }  from "@/components/WaitlistForm";
import { DemoMode }      from "./DemoMode";
import { S, BDR, G } from "./tokens";

export default function TerminalApp() {
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") {
      setShowWaitlist(true);
    }
    if (window.location.hash) {
      const id = window.location.hash.slice(1);
      let attempts = 0;
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (attempts < 10) {
          attempts++;
          setTimeout(tryScroll, 150);
        }
      };
      tryScroll();
    }
  }, []);

  return (
    <WalletContextProvider>
    <div style={{
      background: "var(--bg)",
      minHeight: "100vh",
      color: "var(--text-primary)",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    }}>
      <LiveBackground />
      <SiteNav onWaitlistClick={() => setShowWaitlist(true)} />
      <BottomNav />

      {showWaitlist && (
        <div onClick={() => setShowWaitlist(false)}
          style={{
            position:"fixed", inset:0, zIndex:3000,
            background:"var(--overlay)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:"1rem",
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              background:"var(--surface-raised)",
              borderRadius:20,
              border:`1px solid ${BDR}`,
              maxWidth:400, width:"100%",
              boxShadow:"var(--shadow-glow)",
            }}>
            <div style={{
              padding:"1.25rem 1.5rem",
              borderBottom:`1px solid ${BDR}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <span style={{
                fontFamily:S, fontSize:"1.05rem", fontWeight:700,
                color:"var(--text-primary)",
              }}>
                ZK Login, coming soon
              </span>
              <button onClick={() => setShowWaitlist(false)}
                style={{
                  background:"transparent", border:"none",
                  color:"var(--text-muted)", fontSize:"1.4rem",
                  cursor:"pointer", lineHeight:1, padding:0,
                }}>
                ×
              </button>
            </div>
            <div style={{ padding:"1.25rem 1.5rem 1.5rem" }}>
              <WaitlistForm onJoined={() => setShowWaitlist(false)} />
              <div style={{
                marginTop:"1rem", paddingTop:"1rem",
                borderTop:"1px solid var(--border)",
                textAlign:"center",
              }}>
                <a href="/passport" style={{
                  fontFamily:S, fontSize:"0.72rem",
                  color:G, textDecoration:"underline",
                }}>
                  Already verifying? Check your Passport status →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
        <TerminalMain />
      </div>

      <DemoMode />
    </div>
    </WalletContextProvider>
  );
}
