"use client";
// FILE: components/terminal/TerminalApp.tsx
// Outer shell: clean nav, no terminal/OS chrome. Renders TerminalMain inside.
// Default export. Imported by app/terminal/page.tsx.

import Image             from "next/image";
import { useState, useEffect } from "react";
import { CompactWallet } from "@/components/CompactWallet";
import { LanguageSelector } from "@/components/LanguageSelector";
import { EmailWalletLogin } from "@/components/EmailWalletLogin";
import { TerminalMain }  from "./TerminalMain";
import { DemoMode }      from "./DemoMode";
import { M, S, BDR, G } from "./tokens";

type SignInTab = "email" | "wallet";
const SIGN_IN_TABS: SignInTab[] = ["email", "wallet"];

export default function TerminalApp() {
  const [emailWallet, setEmailWallet] = useState<string | null>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [signInTab, setSignInTab] = useState<SignInTab>("email");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === "1") {
      setShowSignIn(true);
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

      {/* Slim top bar, just branding and account status now, navigation
          lives at the bottom, app-style, not website-style */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200,
                     background: "var(--nav-bg)",
                     backdropFilter: "blur(12px)",
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
        <LanguageSelector />
        {emailWallet ? (
          <div style={{ padding:"0.45rem 0.9rem", borderRadius:20,
                         background:`${G}12`,
                         color:G, fontFamily:M, fontSize:"0.7rem",
                         fontWeight:600 }}>
            {emailWallet.slice(0, 4)}...{emailWallet.slice(-4)}
          </div>
        ) : (
          <button
            onClick={() => setShowSignIn(true)}
            style={{ padding:"0.5rem 1.25rem", borderRadius:20,
                      border:"none", background:G,
                      color:"#000", fontFamily:S,
                      fontSize:"0.8rem", fontWeight:700, cursor:"pointer" }}>
            Sign in
          </button>
        )}
      </nav>

      {/* Bottom tab bar, app-style navigation, fixed to the bottom of
          the viewport */}
      <nav style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:200,
                     background:"var(--nav-bg)", backdropFilter:"blur(16px)",
                     borderTop:`1px solid ${BDR}`,
                     display:"flex", justifyContent:"space-around",
                     padding:"0.5rem clamp(0.5rem,2vw,1rem)",
                     paddingBottom:"max(0.5rem, env(safe-area-inset-bottom))" }}>
        {[
          { href:"#", label:"Market", icon:"\u25c8", active:true },
          { href:"/dashboard", label:"Dashboard", icon:"\u25a3" },
          { href:"/swap", label:"Swap", icon:"\u21c6" },
          { href:"/gallery", label:"Gallery", icon:"\u25c6" },
        ].map(item => (
          <a key={item.label} href={item.href}
            style={{ display:"flex", flexDirection:"column", alignItems:"center",
                      gap:"0.2rem", padding:"0.4rem 0.75rem", borderRadius:10,
                      textDecoration:"none",
                      color: item.active ? G : "var(--text-secondary)",
                      background: item.active ? `${G}14` : "transparent",
                      minWidth:60 }}>
            <span style={{ fontSize:"1.05rem" }}>{item.icon}</span>
            <span style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:600 }}>
              {item.label}
            </span>
          </a>
        ))}
      </nav>
      <div style={{ height:"4.25rem" }} aria-hidden="true" />

      {/* Sign-in modal. centered and fixed, never clips at screen edges */}
      {showSignIn && (
        <div onClick={() => setShowSignIn(false)}
          style={{ position:"fixed", inset:0, zIndex:3000,
                    background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)",
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
                Sign in to Abraxas
              </span>
              <button onClick={() => setShowSignIn(false)}
                style={{ background:"transparent", border:"none",
                          color:"var(--text-muted)", fontSize:"1.4rem",
                          cursor:"pointer", lineHeight:1, padding:0 }}>
                ×
              </button>
            </div>
            <div style={{ display:"flex", gap:"0.375rem", padding:"0.75rem 1rem 0" }}>
              {SIGN_IN_TABS.map(tab => (
                <button key={tab} onClick={() => setSignInTab(tab)}
                  style={{ flex:1, padding:"0.5rem", borderRadius:10,
                            border:"none",
                            background: signInTab === tab ? `${G}15` : "transparent",
                            color: signInTab === tab ? G : "var(--text-muted)",
                            fontFamily:S, fontSize:"0.78rem", fontWeight:600,
                            cursor:"pointer" }}>
                  {tab === "email" ? "Email" : "Wallet"}
                </button>
              ))}
            </div>
            <div style={{ padding:"1.25rem 1.5rem 1.5rem" }}>
              {signInTab === "email" ? (
                <EmailWalletLogin
                  onWalletReady={(pk) => { setEmailWallet(pk); setShowSignIn(false); }}
                />
              ) : (
                <div style={{ display:"flex", flexDirection:"column",
                               gap:"0.75rem", alignItems:"center" }}>
                  <div style={{ fontFamily:S, fontSize:"0.8rem",
                                 color:"var(--text-secondary)",
                                 textAlign:"center", lineHeight:1.6 }}>
                    Connect Phantom, Solflare, or any Solana wallet.
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.7rem",
                                 color:"#F59E0B", background:"#F59E0B12",
                                 borderRadius:8, padding:"0.5rem 0.75rem",
                                 textAlign:"center" }}>
                    Wallet sign-in is being fixed right now. Email sign-in
                    works and creates your profile the same way.
                  </div>
                  <CompactWallet />
                </div>
              )}
              <div style={{ marginTop:"1rem", paddingTop:"1rem",
                             borderTop:"1px solid var(--border)",
                             textAlign:"center" }}>
                <a href="/passport" style={{ fontFamily:S, fontSize:"0.72rem",
                                              color:G, textDecoration:"underline" }}>
                  Signing in creates your account. Identity verification
                  is separate, check your Passport status →
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
