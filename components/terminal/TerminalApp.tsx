"use client";
// FILE: components/terminal/TerminalApp.tsx
// Outer shell: clean nav, no terminal/OS chrome. Renders TerminalMain inside.
// Default export. Imported by app/terminal/page.tsx.

import Image             from "next/image";
import { useState, useEffect } from "react";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TerminalMain }  from "./TerminalMain";
import { LiveBackground } from "@/components/LiveBackground";
import { BottomNav }     from "@/components/BottomNav";
import { WaitlistForm }  from "@/components/WaitlistForm";
import { DemoMode }      from "./DemoMode";
import { M, S, BDR, G } from "./tokens";

export default function TerminalApp() {
  const [showWaitlist, setShowWaitlist] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") {
      setShowWaitlist(true);
    }
    // Deep-link scroll. content renders async (ScrollFade etc), so retry
    // briefly instead of assuming the target exists on first paint.
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
    <div style={{ background: "var(--bg)", minHeight: "100vh", color: "var(--text-primary)",
                   display: "flex", flexDirection: "column" }}>
      <LiveBackground />

      {/* Slim top bar, just branding and account status now, navigation
          lives at the bottom, app-style, not website-style */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200,
                     background: "var(--nav-bg)",
                     borderBottom: `1px solid ${BDR}`,
                     display: "flex", alignItems: "center",
                     padding: `0 clamp(0.875rem,2.5vw,1.75rem)`,
                     height: "clamp(54px,7vw,64px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Image src="/icon-48.png" alt="Abraxas"
                 width={26} height={26} priority
                 style={{ display: "block", flexShrink: 0, borderRadius: 6 }} />
          <span style={{ fontFamily: S,
                          fontSize: "clamp(1rem,1.5vw,1.15rem)",
                          fontWeight: 700, color: "var(--text-primary)" }}>
            Abraxas
          </span>
        </div>

        <div style={{ flex: 1 }} />
        <button onClick={() => setShowWaitlist(true)}
          style={{ display:"flex", alignItems:"center", gap:"0.4rem",
                    padding:"0.4rem 0.75rem", borderRadius:14, cursor:"pointer",
                    background:"#8B5CF612", border:"1px solid #8B5CF635" }}>
          <span style={{ width:5, height:5, borderRadius:"50%", background:"#8B5CF6" }} />
          <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                          color:"#8B5CF6", letterSpacing:"0.04em" }}>
            ZK LOGIN, COMING SOON
          </span>
        </button>
        <LanguageSelector />
      </nav>

      {/* The one persistent navigation system, shared across every page */}
      <BottomNav />

      {/* Waitlist modal, replaces the old sign-in flow entirely while
          ZK Login is being built. Honest positioning: nothing creates a
          real account right now, this just gets you notified at launch. */}
      {showWaitlist && (
        <div onClick={() => setShowWaitlist(false)}
          style={{ position:"fixed", inset:0, zIndex:3000,
                    background:"rgba(0,0,0,0.75)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    padding:"1rem" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"var(--surface)", borderRadius:16,
                      border:`1px solid ${BDR}`, maxWidth:380, width:"100%",
                      boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding:"1.25rem 1.5rem",
                           borderBottom:`1px solid ${BDR}`,
                           display:"flex", alignItems:"center",
                           justifyContent:"space-between" }}>
              <span style={{ fontFamily:S, fontSize:"1rem", fontWeight:700,
                              color:"var(--text-primary)" }}>
                ZK Login, coming soon
              </span>
              <button onClick={() => setShowWaitlist(false)}
                style={{ background:"transparent", border:"none",
                          color:"var(--text-muted)", fontSize:"1.4rem",
                          cursor:"pointer", lineHeight:1, padding:0 }}>
                ×
              </button>
            </div>
            <div style={{ padding:"1.25rem 1.5rem 1.5rem" }}>
              <WaitlistForm onJoined={() => setShowWaitlist(false)} />
              <div style={{ marginTop:"1rem", paddingTop:"1rem",
                             borderTop:"1px solid var(--border)",
                             textAlign:"center" }}>
                <a href="/passport" style={{ fontFamily:S, fontSize:"0.72rem",
                                              color:G, textDecoration:"underline" }}>
                  Already verifying? Check your Passport status →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <TerminalMain />
      </div>

      <DemoMode />
    </div>
  );
}
