// FILE: app/terminal/page.tsx
// Two-door entry: Asset Owner Onboarding + Collateral Terminal
// Genesis Asset default. No auth wall. Wallet only when needed.
"use client";
import { useState }                  from "react";
import { FlagshipAssetPage }          from "@/components/assets/FlagshipAssetPage";
import { TerminalLayout }             from "@/components/terminal/TerminalLayout";
import { AssetOwnerOnboarding }       from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }                 from "@/components/onboarding/TrustStack";
import { CompactWallet }              from "@/components/CompactWallet";
import { LanguageSelector }           from "@/components/LanguageSelector";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";

type View = "home" | "onboarding" | "trust" | "flagship" | "terminal";

const NAV: { id: View; label: string; desc: string }[] = [
  { id:"home",       label:"HOME",           desc:"" },
  { id:"onboarding", label:"SUBMIT ASSET",   desc:"" },
  { id:"flagship",   label:"GENESIS ASSET",  desc:"" },
  { id:"terminal",   label:"TERMINAL",       desc:"" },
];

export default function TerminalPage() {
  const [view, setView] = useState<View>("home");

  return (
    <div style={{ background:"#0C0E12", minHeight:"100vh" }}>

      {/* ── Sticky nav ─────────────────────────────────────────────── */}
      <nav style={{
        position:"sticky", top:0, zIndex:200,
        background:"rgba(12,14,18,0.97)", backdropFilter:"blur(12px)",
        borderBottom:"1px solid #1F2937",
        display:"flex", alignItems:"center",
        padding:"0 clamp(0.75rem,2.5vw,1.25rem)",
        height:"clamp(44px,6vw,52px)", gap:"clamp(0.3rem,1.2vw,0.5rem)",
        flexWrap:"nowrap", overflowX:"auto",
      }}>
        {/* Brand */}
        <button onClick={() => setView("home")} style={{
          display:"flex", alignItems:"center", gap:"0.4rem",
          flexShrink:0, background:"none", border:"none",
          cursor:"pointer", marginRight:"clamp(0.25rem,1vw,0.75rem)",
          padding:0,
        }}>
          <span style={{ color:"#10B981", fontSize:"clamp(0.7rem,2vw,0.9rem)" }}>◈</span>
          <span style={{ fontFamily:M, fontSize:"clamp(0.48rem,1.5vw,0.68rem)",
                          fontWeight:900, color:"#f0f0f0", letterSpacing:"0.1em" }}>
            ABRAXAS
          </span>
        </button>

        {/* Nav items */}
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)} style={{
            padding:"0.2rem clamp(0.35rem,1.2vw,0.625rem)", borderRadius:"3px",
            border:"1px solid " + (view === n.id ? "#10B981" : "#1F2937"),
            background: view === n.id ? "rgba(16,185,129,0.1)" : "transparent",
            color: view === n.id ? "#10B981" : "rgba(255,255,255,0.3)",
            fontFamily:M, fontSize:"clamp(0.26rem,0.85vw,0.34rem)",
            fontWeight:700, cursor:"pointer", textTransform:"uppercase",
            letterSpacing:"0.1em", whiteSpace:"nowrap", flexShrink:0,
            transition:"all 0.15s",
          }}>{n.label}</button>
        ))}

        <div style={{ flex:1 }}/>

        <LanguageSelector />
        <a href="/auth/signin" style={{
          fontFamily:M, fontSize:"clamp(0.26rem,0.85vw,0.34rem)",
          color:"rgba(255,255,255,0.2)", textDecoration:"none",
          textTransform:"uppercase", letterSpacing:"0.1em",
          whiteSpace:"nowrap", flexShrink:0, padding:"0.2rem 0.4rem",
          border:"1px solid rgba(255,255,255,0.06)", borderRadius:"3px",
        }}>SIGN IN</a>
        <CompactWallet />
      </nav>

      {/* ── HOME ──────────────────────────────────────────────────── */}
      {view === "home" && (
        <div style={{ maxWidth:960, margin:"0 auto",
                       padding:"clamp(2.5rem,6vw,5rem) clamp(1rem,3vw,1.5rem)" }}>

          {/* Hero */}
          <div style={{ marginBottom:"4rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.32rem", fontWeight:700,
                           color:"rgba(16,185,129,0.5)", textTransform:"uppercase",
                           letterSpacing:"0.2em", marginBottom:"1rem" }}>
              ABRAXAS PROTOCOL · SOLANA
            </div>
            <h1 style={{ fontFamily:S, fontSize:"clamp(1.8rem,5vw,3.6rem)",
                          fontWeight:800, color:"#f0f0f0", margin:"0 0 1.25rem",
                          letterSpacing:"-0.03em", lineHeight:1.08 }}>
              Institutional collateral<br/>
              infrastructure — on chain.
            </h1>
            <p style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1.05rem)",
                         color:"rgba(255,255,255,0.35)", lineHeight:1.8,
                         maxWidth:560, margin:"0 0 2.5rem" }}>
              Abraxas verifies whether a real-world asset is financeable.
              We transform verified property, minerals, energy reserves,
              and precious metals into programmable on-chain collateral —
              with the legal, custodial, and audit infrastructure to back it.
            </p>

            {/* Two doors */}
            <div style={{ display:"grid",
                           gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                           gap:"1rem" }}>
              {/* Door 1: Asset Owner */}
              <button onClick={() => setView("onboarding")} style={{
                padding:"1.75rem", borderRadius:"8px", cursor:"pointer", textAlign:"left",
                border:"1px solid rgba(16,185,129,0.3)",
                background:"rgba(16,185,129,0.06)",
                transition:"all 0.15s",
              }}>
                <div style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                               color:"rgba(16,185,129,0.5)", textTransform:"uppercase",
                               letterSpacing:"0.15em", marginBottom:"0.75rem" }}>
                  ASSET OWNER
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.25rem)",
                               fontWeight:800, color:"#f0f0f0", marginBottom:"0.625rem" }}>
                  Bring an asset into the protocol.
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.6vw,0.8rem)",
                               color:"rgba(255,255,255,0.35)", lineHeight:1.7,
                               marginBottom:"1.25rem" }}>
                  Property, land, minerals, energy reserves, or precious metals.
                  No wallet required to assess eligibility.
                </div>
                <div style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                               color:"#10B981" }}>
                  Check requirements + timeline →
                </div>
              </button>

              {/* Door 2: Lender / Operator */}
              <button onClick={() => setView("terminal")} style={{
                padding:"1.75rem", borderRadius:"8px", cursor:"pointer", textAlign:"left",
                border:"1px solid rgba(49,130,206,0.25)",
                background:"rgba(49,130,206,0.04)",
                transition:"all 0.15s",
              }}>
                <div style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                               color:"rgba(49,130,206,0.5)", textTransform:"uppercase",
                               letterSpacing:"0.15em", marginBottom:"0.75rem" }}>
                  LENDER / OPERATOR
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(1rem,2.5vw,1.25rem)",
                               fontWeight:800, color:"#f0f0f0", marginBottom:"0.625rem" }}>
                  Inspect verified collateral.
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.6vw,0.8rem)",
                               color:"rgba(255,255,255,0.35)", lineHeight:1.7,
                               marginBottom:"1.25rem" }}>
                  Underwriting engine. Provenance chain. Risk scoring.
                  On-chain attestations. Collateral terminal.
                </div>
                <div style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                               color:"#3182CE" }}>
                  Open collateral terminal →
                </div>
              </button>
            </div>
          </div>

          {/* 8-step operational flow */}
          <div style={{ marginBottom:"3rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.15em",
                           marginBottom:"1.25rem" }}>
              VERIFICATION → COLLATERAL ACTIVATION
            </div>
            <div style={{ display:"grid",
                           gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                           gap:"0.5rem" }}>
              {[
                { n:"01", t:"Register Asset",           c:"#10B981" },
                { n:"02", t:"Submit Documentation",     c:"#10B981" },
                { n:"03", t:"Verification Review",      c:"#3182CE" },
                { n:"04", t:"Custody + Legal Validation",c:"#3182CE" },
                { n:"05", t:"Auditor Sign-Off",         c:"#3182CE" },
                { n:"06", t:"On-Chain Attestation",     c:"#ED8936" },
                { n:"07", t:"Collateral Activation",    c:"#ED8936" },
                { n:"08", t:"Borrow / Finance",         c:"#f0f0f0" },
              ].map(s => (
                <div key={s.n} style={{ padding:"0.875rem 1rem", borderRadius:"5px",
                                          border:"1px solid #1F2937",
                                          background:"#0E1117" }}>
                  <div style={{ fontFamily:M,
                                 fontSize:"clamp(1rem,2.5vw,1.4rem)",
                                 fontWeight:900, color:s.c + "25",
                                 marginBottom:"0.35rem", lineHeight:1 }}>
                    {s.n}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.6vw,0.8rem)",
                                 fontWeight:600, color:"rgba(255,255,255,0.55)" }}>
                    {s.t}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Genesis asset callout */}
          <div style={{ padding:"1.5rem", borderRadius:"8px",
                         border:"1px solid rgba(16,185,129,0.2)",
                         background:"rgba(16,185,129,0.04)",
                         display:"flex", justifyContent:"space-between",
                         alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
            <div>
              <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(16,185,129,0.5)",
                             textTransform:"uppercase", letterSpacing:"0.15em",
                             marginBottom:"0.35rem" }}>
                GENESIS ASSET · SERIES A
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1rem)",
                             fontWeight:700, color:"#f0f0f0" }}>
                Cielo Sunrise — $1,100,000 · Mountain Wellness Retreat
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.64rem,1.5vw,0.76rem)",
                             color:"rgba(255,255,255,0.3)", marginTop:"0.2rem" }}>
                Mineral Bluff, Georgia · AAS-1 Verified · 89/100 collateral score
              </div>
            </div>
            <button onClick={() => setView("flagship")} style={{
              padding:"0.75rem 1.5rem", borderRadius:"5px",
              border:"1px solid rgba(16,185,129,0.3)",
              background:"rgba(16,185,129,0.08)",
              fontFamily:M, fontSize:"0.4rem", fontWeight:700,
              color:"#10B981", cursor:"pointer",
              textTransform:"uppercase", letterSpacing:"0.06em",
              whiteSpace:"nowrap",
            }}>
              INSPECT ASSET →
            </button>
          </div>

          {/* Trust stack callout */}
          <div style={{ marginTop:"1rem", padding:"1.25rem 1.5rem", borderRadius:"7px",
                         border:"1px solid #1F2937", background:"#0E1117",
                         display:"flex", justifyContent:"space-between",
                         alignItems:"center", flexWrap:"wrap", gap:"0.75rem",
                         cursor:"pointer" }}
            onClick={() => setView("trust")}>
            <div>
              <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.15em",
                             marginBottom:"0.3rem" }}>
                TRUST INFRASTRUCTURE
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.8vw,0.88rem)",
                             color:"rgba(255,255,255,0.5)" }}>
                7-layer verification: ownership → custody → legal → audit → on-chain
              </div>
            </div>
            <span style={{ fontFamily:M, fontSize:"0.4rem", color:"rgba(255,255,255,0.2)" }}>
              VIEW TRUST STACK →
            </span>
          </div>
        </div>
      )}

      {/* ── ONBOARDING ────────────────────────────────────────────── */}
      {view === "onboarding" && (
        <AssetOwnerOnboarding onEnterTerminal={() => setView("terminal")} />
      )}

      {/* ── TRUST STACK ───────────────────────────────────────────── */}
      {view === "trust" && <TrustStack />}

      {/* ── GENESIS ASSET ─────────────────────────────────────────── */}
      {view === "flagship" && <FlagshipAssetPage />}

      {/* ── TERMINAL ──────────────────────────────────────────────── */}
      {view === "terminal" && <TerminalLayout />}

    </div>
  );
}
