"use client";
// FILE: app/terminal/page.tsx  —  Abraxas Protocol · Verification & Identity Layer
// Build 2025.1 · Solana Mainnet · W3C VC 2.0

import { useState, useEffect }      from "react";
import Image                         from "next/image";
import { FlagshipAssetPage }         from "@/components/assets/FlagshipAssetPage";
import { AssetOwnerOnboarding }      from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }                from "@/components/onboarding/TrustStack";
import { CompactWallet }             from "@/components/CompactWallet";
import { LanguageSelector }          from "@/components/LanguageSelector";
import { BecomeAPartner }            from "@/components/BecomeAPartner";
import { ArtistAuditForm }           from "@/components/music/ArtistAuditForm";
import { TokenizationRequestModal }  from "@/components/TokenizationRequestModal";
import { AbraxasPassport }           from "@/components/identity/AbraxasPassport";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#0A0C10";
const CARD = "#0D1117";
const BDR  = "#1C2333";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const W    = "#F8FAFC";

type Tab  = "terminal";
type Deep = "main"|"asset"|"registry"|"submit"|"trust";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                   marginBottom:"1.125rem" }}>
      <div style={{ width:3, height:15, background:G, borderRadius:2,
                     boxShadow:`0 0 6px ${G}60` }}/>
      <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                      fontWeight:800, color:G, letterSpacing:"0.16em",
                      textTransform:"uppercase" }}>
        {children}
      </span>
    </div>
  );
}
function Divider() { return <div style={{ height:1, background:BDR, margin:"1.5rem 0" }}/>; }

// ── DEEP VIEW WRAPPER ────────────────────────────────────────────────────────
function DeepView({ children, onBack }: { children: React.ReactNode; onBack(): void }) {
  return (
    <div>
      <div style={{ padding:"0.75rem clamp(1rem,3vw,1.5rem)",
                     borderBottom:`1px solid ${BDR}`, background:CARD,
                     display:"flex", alignItems:"center", gap:"0.7rem" }}>
        <button onClick={onBack} style={{
          padding:"0.3rem 0.75rem", borderRadius:4,
          border:`1px solid ${BDR}`, background:"transparent",
          color:"rgba(255,255,255,0.5)", fontFamily:M,
          fontSize:"0.75rem", fontWeight:700, cursor:"pointer",
          textTransform:"uppercase", letterSpacing:"0.08em",
        }}>← BACK TO TERMINAL</button>
      </div>
      {children}
    </div>
  );
}

// ── TERMINAL TAB ─────────────────────────────────────────────────────────────
function TerminalTab() {
  const [deep, setDeep]               = useState<Deep>("main");
  const [wyOpen, setWyOpen]           = useState(false);
  const [initialTier, setInitialTier] = useState<"starter"|"growth"|"enterprise"|null>(null);

  // Fix: VOS terminal input.focus() pulls the page down. Scroll to top on mount.
  useEffect(() => { window.scrollTo({ top:0, behavior:"instant" }); }, []);

  if (deep === "asset")    return <DeepView onBack={() => setDeep("main")}><FlagshipAssetPage /></DeepView>;
  if (deep === "submit")   return <DeepView onBack={() => setDeep("main")}><AssetOwnerOnboarding onEnterTerminal={() => setDeep("main")} /></DeepView>;
  if (deep === "trust")    return <DeepView onBack={() => setDeep("main")}><TrustStack /></DeepView>;
  if (deep === "registry") return (
    <DeepView onBack={() => setDeep("main")}>
      <div style={{ padding:"2rem", fontFamily:M, color:W, maxWidth:800, margin:"0 auto" }}>
        <div style={{ fontSize:"0.7rem", color:G, fontWeight:700, textTransform:"uppercase",
                       letterSpacing:"0.2em", marginBottom:"1.5rem" }}>
          ABRAXAS REGISTRY · VERIFIED ASSETS
        </div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.4rem,3.5vw,2rem)",
                       fontWeight:700, color:W, marginBottom:"0.875rem" }}>
          Ownership Infrastructure for<br/>Real-World Assets.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                       gap:"1px", background:BDR, borderRadius:7, overflow:"hidden",
                       marginBottom:"1.5rem" }}>
          {[
            {label:"Verified Properties", val:"3"},
            {label:"Pending Verification", val:"0"},
            {label:"Total AUM",            val:"$2.2M+"},
            {label:"Avg Collateral Score", val:"89/100"},
          ].map(s => (
            <div key={s.label} style={{ background:CARD, padding:"0.875rem" }}>
              <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>
                {s.label}
              </div>
              <div style={{ fontSize:"1.25rem", fontWeight:900, color:G }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.4)", marginBottom:"0.7rem",
                       letterSpacing:"0.1em", textTransform:"uppercase" }}>
          AAS-1 · GENESIS ASSET
        </div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem", fontWeight:700,
                       color:W, marginBottom:4 }}>
          Cielo Sunrise — Mountain Wellness Retreat
        </div>
        <div style={{ fontSize:"0.75rem", color:"rgba(255,255,255,0.4)" }}>
          Mineral Bluff, Georgia · $1,100,000 appraised · 89/100 collateral score ·{" "}
          96% verification confidence · $660K max borrow capacity
        </div>
      </div>
    </DeepView>
  );

  // ── MAIN VIEW ──────────────────────────────────────────────────────────────
  return (
    <div>
      <TokenizationRequestModal
        open={wyOpen} initialTier={initialTier}
        onClose={() => { setWyOpen(false); setInitialTier(null); }}
      />

      <div style={{ maxWidth:1060, margin:"0 auto",
                     padding:"1rem clamp(0.75rem,2.5vw,1.5rem) 0.75rem" }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem", paddingBottom:"1.5rem",
                       borderBottom:`1px solid ${BDR}` }}>
          <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:G,
                         letterSpacing:"0.2em", textTransform:"uppercase",
                         marginBottom:"0.625rem" }}>
            ABRAXAS PROTOCOL · SOLANA MAINNET · BUILD 2025.1
          </div>
          <h1 style={{ fontFamily:"Georgia,'Times New Roman',serif",
                        fontSize:"clamp(1.6rem,4.5vw,3rem)", fontWeight:700,
                        color:W, lineHeight:1.1, letterSpacing:"-0.02em",
                        margin:"0 0 0.75rem" }}>
            The verification and<br/>
            <span style={{ color:G }}>identity layer</span> for<br/>
            real-world assets onchain.
          </h1>
          <p style={{ fontFamily:S, fontSize:"clamp(0.82rem,1.8vw,0.95rem)",
                       color:"rgba(255,255,255,0.5)", lineHeight:1.75,
                       maxWidth:540, margin:"0 0 1.25rem" }}>
            Verify your identity and assets once on Abraxas. Receive a portable
            credential every integrated protocol accepts. No re-KYC. One passport.
            Every lender, marketplace, and payment rail.
          </p>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", alignItems:"center" }}>
            {[["● 4 ASSETS VERIFIED",true],["$2.4M+ ATTESTED",false],["W3C VC · SOLANA MAINNET",false]].map((item: [string,boolean]) => (
              <div key={item[0]} style={{ padding:"0.35rem 0.75rem", borderRadius:4,
                               background:hi ? `${G}12` : "rgba(255,255,255,0.04)",
                               border:`1px solid ${hi ? G+"30" : BDR}`,
                               fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                               color:hi ? G : "rgba(255,255,255,0.4)",
                               letterSpacing:"0.08em" }}>
                {item[0]}
              </div>
            ))}
          </div>
        </div>

        {/* ── ABRAXAS DIGITAL PASSPORT — PRIMARY FEATURE ───────────────────── */}
        <div style={{ marginBottom:"1.75rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                         marginBottom:"0.875rem" }}>
            <div style={{ width:3, height:18, background:G, borderRadius:2,
                           boxShadow:`0 0 6px ${G}60` }}/>
            <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                            fontWeight:800, color:G, letterSpacing:"0.16em",
                            textTransform:"uppercase" }}>
              ABRAXAS PASSPORT
            </span>
            <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                            color:G, background:`${G}15`, border:`1px solid ${G}30`,
                            borderRadius:3, padding:"1px 7px",
                            letterSpacing:"0.08em", textTransform:"uppercase" }}>
              VERIFY ONCE · USE EVERYWHERE
            </span>
          </div>
          <AbraxasPassport
            onGetVerified={() => setDeep("submit")}
            earnedStamps={["identity","compliance"]}
          />
        </div>

        <Divider/>

        {/* ── AAS-1: CIELO SUNRISE — Genesis Asset ─────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>Genesis Asset · AAS-1</Label>
          <div style={{ borderRadius:8, overflow:"hidden",
                         border:`1px solid ${G}35`, position:"relative" }}>
            {/* Mountain visual */}
            <div style={{ height:"clamp(200px,35vw,300px)",
                           background:"linear-gradient(160deg,#0a1a0f 0%,#0d2318 25%,#112b1e 50%,#0a1a12 75%,#061008 100%)",
                           position:"relative", overflow:"hidden" }}>
              <svg viewBox="0 0 1200 320"
                style={{ position:"absolute", bottom:0, left:0, width:"100%",
                          height:"100%", opacity:0.6 }} preserveAspectRatio="none">
                <path d="M0,320 L0,200 L120,140 L200,160 L280,100 L380,130 L460,80
                         L540,110 L620,60 L700,90 L780,50 L860,80 L940,40 L1020,70
                         L1100,50 L1200,80 L1200,320 Z" fill="rgba(16,185,129,0.08)"/>
                <path d="M0,320 L0,240 L100,190 L200,210 L300,160 L400,185 L500,140
                         L600,165 L700,120 L800,150 L900,110 L1000,140 L1100,120
                         L1200,140 L1200,320 Z" fill="rgba(16,185,129,0.12)"/>
              </svg>
              {[...Array(18)].map((_,i) => (
                <div key={i} style={{ position:"absolute",
                  top:`${8+(i*17%55)}%`, left:`${(i*23+7)%94}%`,
                  width:i%3===0?2:1, height:i%3===0?2:1,
                  borderRadius:"50%", background:"rgba(255,255,255,0.6)",
                  boxShadow:i%5===0?"0 0 4px rgba(255,255,255,0.4)":"none" }}/>
              ))}
              <div style={{ position:"absolute", bottom:0, left:0, right:0,
                             background:"linear-gradient(transparent,rgba(4,6,8,0.95))",
                             padding:"2rem 1.25rem 1rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.58rem", color:G, fontWeight:700,
                               letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>
                  AAS-1 · VERIFIED · COLLATERAL ELIGIBLE
                </div>
                <div style={{ fontFamily:"Georgia,serif",
                               fontSize:"clamp(1.1rem,3vw,1.6rem)",
                               fontWeight:700, color:W, lineHeight:1.2, marginBottom:4 }}>
                  Cielo Sunrise
                </div>
                <div style={{ fontFamily:S, fontSize:"0.75rem",
                               color:"rgba(255,255,255,0.5)" }}>
                  Private Mountain Wellness Retreat · Mineral Bluff, Georgia
                </div>
              </div>
              <div style={{ position:"absolute", top:12, right:12 }}>
                <a href="https://www.airbnb.com/rooms/1681387746169197852"
                   target="_blank" rel="noopener noreferrer"
                   style={{ display:"inline-block", padding:"0.3rem 0.625rem",
                             borderRadius:4, background:"rgba(0,0,0,0.7)",
                             backdropFilter:"blur(4px)",
                             border:"1px solid rgba(255,255,255,0.15)",
                             fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                             color:W, textDecoration:"none", letterSpacing:"0.06em",
                             textTransform:"uppercase" }}>
                  VIEW PHOTOS ↗
                </a>
              </div>
            </div>
            {/* Stats */}
            <div style={{ display:"grid",
                           gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                           gap:"1px", background:BDR }}>
              {[["Appraised Value","$1,100,000"],["Annual NOI","$109,500"],
                ["Cash Yield","14.6%"],["Collateral Score","89 / 100"],
                ["Max Borrow","$660K USDC"],["Cap Rate","9.95%"]].map((item: string[]) => (
                <div key={item[0]} style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.52rem",
                                 color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:3 }}>{item[0]}</div>
                  <div style={{ fontFamily:M, fontSize:"0.92rem",
                                 fontWeight:900, color:G }}>{item[1]}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"0.875rem 1rem", background:"#08090F",
                           display:"flex", gap:"0.5rem", flexWrap:"wrap",
                           alignItems:"center" }}>
              <a href="https://www.airbnb.com/rooms/1681387746169197852"
                 target="_blank" rel="noopener noreferrer"
                 style={{ padding:"0.5rem 0.875rem", borderRadius:5,
                           border:`1px solid ${BDR}`, background:"transparent",
                           color:"rgba(255,255,255,0.5)", fontFamily:M,
                           fontSize:"0.65rem", fontWeight:700, textDecoration:"none",
                           textTransform:"uppercase", letterSpacing:"0.08em" }}>
                VIEW ON AIRBNB ↗
              </a>
              <button onClick={() => setDeep("registry")} style={{
                padding:"0.5rem 0.875rem", borderRadius:5,
                border:`1px solid ${G}40`, background:`${G}10`,
                color:G, fontFamily:M, fontSize:"0.65rem", fontWeight:700,
                cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em",
              }}>VIEW ASSET RECORD</button>
              <button onClick={() => setDeep("submit")} style={{
                padding:"0.5rem 0.875rem", borderRadius:5, border:"none",
                background:G, color:"#000", fontFamily:M, fontSize:"0.65rem",
                fontWeight:900, cursor:"pointer", textTransform:"uppercase",
                letterSpacing:"0.08em", marginLeft:"auto",
              }}>SUBMIT YOUR ASSET →</button>
            </div>
          </div>
        </div>

        {/* ── AAS-2 + AAS-3 right under Cielo ──────────────────────────── */}
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                       gap:"0.75rem", marginBottom:"1.5rem" }}>

          {/* AAS-2 DeMarko Reddins */}
          <div style={{ borderRadius:8, overflow:"hidden",
                         border:"1px solid rgba(99,102,241,0.5)",
                         background:"linear-gradient(145deg,#0C0E20 0%,#0A0C1A 100%)" }}>
            <div style={{ padding:"0.875rem 1rem",
                           borderBottom:"1px solid rgba(99,102,241,0.2)",
                           background:"linear-gradient(135deg,rgba(99,102,241,0.12),rgba(0,0,0,0))" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                             color:"#6366F1", letterSpacing:"0.15em",
                             textTransform:"uppercase", marginBottom:"0.375rem" }}>
                AAS-2 · LITERARY IP · PUBLISHING RIGHTS
              </div>
              <div style={{ fontFamily:"Georgia,serif",
                             fontSize:"clamp(1rem,2.5vw,1.25rem)",
                             fontWeight:700, color:W, marginBottom:"0.25rem" }}>
                DeMarko Reddins
              </div>
              <div style={{ fontFamily:S, fontSize:"0.7rem",
                             color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
                Published author catalog · KDP royalty streams · Multi-title publishing rights
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                           gap:"1px", background:"#1C2333" }}>
              {[["Asset Class","Literary IP"],["Revenue","KDP + Distributors"],
                ["Rights","Publishing / Royalties"],["Status","PENDING VERIFICATION"]
              ].map((item: string[]) => (
                <div key={item[0]} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.48rem",
                                 color:"rgba(255,255,255,0.25)", textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:2 }}>{item[0]}</div>
                  <div style={{ fontFamily:M, fontSize:"0.68rem",
                                 fontWeight:700, color:"#6366F1" }}>{item[1]}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                           display:"flex", gap:"0.5rem", alignItems:"center" }}>
              <a href="https://www.amazon.com/stores/DeMarko-Reddins/author/B00JUA0U0G"
                 target="_blank" rel="noopener noreferrer"
                 style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                           color:"#6366F1", textDecoration:"none",
                           letterSpacing:"0.06em", textTransform:"uppercase" }}>
                VIEW CATALOG ↗
              </a>
              <button onClick={() => setDeep("submit")}
                style={{ marginLeft:"auto", padding:"0.35rem 0.75rem", borderRadius:4,
                          border:"none", background:"#6366F1", color:"#fff",
                          fontFamily:M, fontSize:"0.58rem", fontWeight:900,
                          cursor:"pointer", textTransform:"uppercase",
                          letterSpacing:"0.06em" }}>
                TOKENIZE →
              </button>
            </div>
          </div>

          {/* AAS-3 Chancellor K. Jackson */}
          <div style={{ borderRadius:8, overflow:"hidden",
                         border:`1px solid ${A}55`,
                         background:"linear-gradient(145deg,#140E00 0%,#0C0800 100%)" }}>
            <div style={{ padding:"0.875rem 1rem",
                           borderBottom:`1px solid ${A}25`,
                           background:`linear-gradient(135deg,${A}15,rgba(0,0,0,0))` }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                             color:A, letterSpacing:"0.15em",
                             textTransform:"uppercase", marginBottom:"0.375rem" }}>
                AAS-3 · MULTI-FORMAT IP · ACTIVE PRODUCTION
              </div>
              <div style={{ fontFamily:"Georgia,serif",
                             fontSize:"clamp(1rem,2.5vw,1.25rem)",
                             fontWeight:700, color:W, marginBottom:"0.25rem" }}>
                14 Days in Beijing
              </div>
              <div style={{ fontFamily:S, fontSize:"0.7rem",
                             color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
                Chancellor K. Jackson · TV/film talks · Anime in dev · Live play · Funding active
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"0.25rem",
                           padding:"0.5rem 0.75rem",
                           background:"rgba(245,158,11,0.05)" }}>
              {[["TV / Film","IN TALKS"],["Anime","IN DEV"],
                ["Live Play","IN PROGRESS"],["Funding","ACTIVE"]].map((item: string[]) => (
                <div key={item[0]} style={{ padding:"0.2rem 0.5rem", borderRadius:3,
                  background:`${A}10`, border:`1px solid ${A}30`,
                  fontFamily:M, fontSize:"0.48rem", color:W, letterSpacing:"0.04em" }}>
                  {item[0]} <span style={{ color:A }}>· {item[1]}</span>
                </div>
              ))}
            </div>
            <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                           display:"flex", gap:"0.5rem", alignItems:"center" }}>
              <a href="https://www.amazon.com/stores/Chancellor-K.-Jackson/author/B086YGY4BM"
                 target="_blank" rel="noopener noreferrer"
                 style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                           color:A, textDecoration:"none",
                           letterSpacing:"0.06em", textTransform:"uppercase" }}>
                VIEW CATALOG ↗
              </a>
              <button onClick={() => setDeep("submit")}
                style={{ marginLeft:"auto", padding:"0.35rem 0.75rem", borderRadius:4,
                          border:"none", background:A, color:"#000",
                          fontFamily:M, fontSize:"0.58rem", fontWeight:900,
                          cursor:"pointer", textTransform:"uppercase",
                          letterSpacing:"0.06em" }}>
                TOKENIZE →
              </button>
            </div>
          </div>
        </div>

        {/* ── AAS-4: Smyrna Townhome ─────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                         marginBottom:"0.875rem" }}>
            <div style={{ width:3, height:18, background:"#DC2626", borderRadius:2,
                           boxShadow:"0 0 6px rgba(220,38,38,0.6)" }}/>
            <span style={{ fontFamily:M, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                            fontWeight:800, color:"#DC2626", letterSpacing:"0.16em",
                            textTransform:"uppercase" }}>
              AAS-4 · RESIDENTIAL REAL ESTATE
            </span>
            <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                            color:"#DC2626", background:"rgba(220,38,38,0.12)",
                            border:"1px solid rgba(220,38,38,0.3)", borderRadius:3,
                            padding:"1px 7px", letterSpacing:"0.08em",
                            textTransform:"uppercase" }}>
              EQUITY OPEN
            </span>
          </div>

          <div style={{ borderRadius:8, overflow:"hidden",
                         border:"1px solid rgba(220,38,38,0.4)",
                         background:"linear-gradient(145deg,#1A0808 0%,#0E0606 60%,#0A0404 100%)" }}>

            {/* Visual header — Atlanta skyline / urban feel */}
            <div style={{ height:"clamp(160px,25vw,240px)",
                           background:"linear-gradient(160deg,#1A0A0A 0%,#120808 40%,#0A0606 100%)",
                           position:"relative", overflow:"hidden" }}>
              {/* City grid lines — urban residential feel */}
              {[...Array(8)].map((_,i) => (
                <div key={i} style={{ position:"absolute",
                  left:`${10+i*12}%`, top:0, bottom:0, width:"1px",
                  background:`linear-gradient(180deg,transparent,rgba(220,38,38,${0.05+i%3*0.03}),transparent)` }}/>
              ))}
              {[...Array(5)].map((_,i) => (
                <div key={i} style={{ position:"absolute",
                  top:`${15+i*18}%`, left:0, right:0, height:"1px",
                  background:`rgba(220,38,38,${0.04+i*0.02})` }}/>
              ))}
              {/* Rooftop silhouette */}
              <svg viewBox="0 0 1200 240"
                style={{ position:"absolute", bottom:0, left:0, width:"100%", height:"60%",
                          opacity:0.35 }} preserveAspectRatio="none">
                <path d="M0,240 L0,180 L60,160 L80,140 L100,160 L160,160 L180,130
                         L200,160 L260,155 L280,120 L300,155 L380,155 L400,140
                         L420,155 L500,150 L520,110 L540,150 L620,148 L640,130
                         L660,148 L720,145 L740,100 L760,145 L840,142 L860,120
                         L880,142 L940,140 L960,115 L980,140 L1060,138 L1080,125
                         L1100,138 L1200,135 L1200,240 Z"
                  fill="rgba(220,38,38,0.25)"/>
              </svg>
              {/* Stars */}
              {[...Array(12)].map((_,i) => (
                <div key={i} style={{ position:"absolute",
                  top:`${5+(i*19%45)}%`, left:`${(i*31+7)%92}%`,
                  width:i%4===0?2:1, height:i%4===0?2:1,
                  borderRadius:"50%", background:"rgba(255,255,255,0.5)" }}/>
              ))}
              {/* Overlay content */}
              <div style={{ position:"absolute", bottom:0, left:0, right:0,
                             background:"linear-gradient(transparent,rgba(4,2,2,0.97))",
                             padding:"1.5rem 1.25rem 1rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                               color:"#DC2626", letterSpacing:"0.15em",
                               textTransform:"uppercase", marginBottom:3 }}>
                  AAS-4 · PAID OFF · EQUITY TOKENIZATION ELIGIBLE
                </div>
                <div style={{ fontFamily:"Georgia,serif",
                               fontSize:"clamp(1.1rem,3vw,1.6rem)",
                               fontWeight:700, color:W, lineHeight:1.2, marginBottom:4 }}>
                  Smyrna Townhome
                </div>
                <div style={{ fontFamily:S, fontSize:"0.75rem",
                               color:"rgba(255,255,255,0.5)" }}>
                  Smyrna, GA · Cumberland District ·
                  6 min from Truist Park · Owner: Chancellor K. Jackson
                </div>
              </div>
              {/* Braves proximity badge */}
              <div style={{ position:"absolute", top:12, right:12 }}>
                <div style={{ padding:"0.28rem 0.625rem", borderRadius:4,
                               background:"rgba(0,0,0,0.75)",
                               backdropFilter:"blur(4px)",
                               border:"1px solid rgba(220,38,38,0.4)",
                               fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                               color:W, letterSpacing:"0.06em",
                               textTransform:"uppercase" }}>
                  ⚾ 6 MIN · TRUIST PARK
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display:"grid",
                           gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                           gap:"1px", background:"#1C2333" }}>
              {[
                {label:"Property Type",    val:"Residential Townhome"},
                {label:"Location",         val:"Smyrna, GA 30080"},
                {label:"Lien Status",      val:"PAID OFF · $0 Owed"},
                {label:"Equity Position",  val:"100% Owner Equity"},
                {label:"Investment Status",val:"OPEN TO INVESTORS"},
                {label:"Asset Owner",      val:"Chancellor K. Jackson"},
              ].map(s => (
                <div key={s.label} style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.5rem",
                                 color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:3 }}>{s.label}</div>
                  <div style={{ fontFamily:M, fontSize:"0.72rem",
                                 fontWeight:700, color:"#DC2626" }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Equity structure explanation */}
            <div style={{ padding:"1rem 1.125rem",
                           borderBottom:"1px solid rgba(220,38,38,0.15)",
                           background:"rgba(220,38,38,0.04)" }}>
              <div style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                             color:"#DC2626", letterSpacing:"0.14em",
                             textTransform:"uppercase", marginBottom:"0.625rem" }}>
                INVESTMENT STRUCTURE · PAID-OFF EQUITY
              </div>
              <p style={{ fontFamily:S, fontSize:"0.75rem",
                           color:"rgba(255,255,255,0.5)", lineHeight:1.72,
                           margin:"0 0 0.875rem", maxWidth:560 }}>
                Because this property carries zero mortgage debt, the owner holds
                100% of the equity. Abraxas enables three distinct paths for
                investor access without the owner relinquishing title or occupancy rights.
              </p>
              <div style={{ display:"grid",
                             gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                             gap:"0.5rem" }}>
                {[
                  {
                    label:"Fractional Equity Token",
                    desc:"Sell a defined % of home equity to investors as on-chain tokens. Upon future sale, token holders receive proportional proceeds. Owner retains full use and title.",
                    color:"#DC2626",
                    tag:"RECOMMENDED",
                  },
                  {
                    label:"On-Chain Equity Loan",
                    desc:"Borrow USDC against the property's appraised value (50–60% LTV). No credit check — the asset is the collateral. Repay on your terms.",
                    color:G,
                    tag:"LIQUIDITY",
                  },
                  {
                    label:"Renovation Partnership",
                    desc:"Investors fund improvements in exchange for an equity stake. Property appreciates. Investors earn upside on resale. Owner's basis increases.",
                    color:B,
                    tag:"GROWTH",
                  },
                ].map(opt => (
                  <div key={opt.label} style={{ padding:"0.75rem",
                                                  background:"rgba(255,255,255,0.03)",
                                                  border:`1px solid ${opt.color}25`,
                                                  borderTop:`2px solid ${opt.color}`,
                                                  borderRadius:5 }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                                   alignItems:"center", marginBottom:"0.375rem" }}>
                      <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                                     color:opt.color, textTransform:"uppercase",
                                     letterSpacing:"0.08em" }}>{opt.label}</div>
                      <div style={{ fontFamily:M, fontSize:"0.48rem", fontWeight:700,
                                     color:opt.color, background:`${opt.color}12`,
                                     borderRadius:2, padding:"1px 5px",
                                     letterSpacing:"0.06em" }}>{opt.tag}</div>
                    </div>
                    <div style={{ fontFamily:S, fontSize:"0.68rem",
                                   color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
                      {opt.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div style={{ padding:"0.875rem 1rem", background:"#08090F",
                           display:"flex", gap:"0.5rem", flexWrap:"wrap",
                           alignItems:"center" }}>
              <button onClick={() => setDeep("submit")} style={{
                padding:"0.5rem 1rem", borderRadius:5, border:"none",
                background:"#DC2626", color:"#fff", fontFamily:M,
                fontSize:"0.68rem", fontWeight:900, cursor:"pointer",
                textTransform:"uppercase", letterSpacing:"0.08em",
                boxShadow:"0 0 16px rgba(220,38,38,0.4)",
              }}>SUBMIT FOR VERIFICATION →</button>
              <button onClick={() => setDeep("submit")} style={{
                padding:"0.5rem 1rem", borderRadius:5,
                border:"1px solid rgba(220,38,38,0.35)", background:"transparent",
                color:"#DC2626", fontFamily:M, fontSize:"0.68rem", fontWeight:700,
                cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em",
              }}>EXPLORE INVESTOR ACCESS</button>
              <span style={{ fontFamily:M, fontSize:"0.55rem",
                              color:"rgba(255,255,255,0.2)", marginLeft:"auto" }}>
                USDC · SOLANA · COLLATERAL ELIGIBLE
              </span>
            </div>
          </div>
          {/* AAS-4 Smyrna Townhome — mini card */}
          <div style={{ borderRadius:8, overflow:"hidden",
                         border:"1px solid rgba(220,38,38,0.45)",
                         background:"linear-gradient(145deg,#1A0808 0%,#0A0404 100%)" }}>
            <div style={{ padding:"0.875rem 1rem",
                           borderBottom:"1px solid rgba(220,38,38,0.2)",
                           background:"linear-gradient(135deg,rgba(220,38,38,0.12),rgba(0,0,0,0))" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                             color:"#DC2626", letterSpacing:"0.15em",
                             textTransform:"uppercase", marginBottom:"0.375rem" }}>
                AAS-4 · RESIDENTIAL · EQUITY OPEN
              </div>
              <div style={{ fontFamily:"Georgia,serif",
                             fontSize:"clamp(1rem,2.5vw,1.25rem)",
                             fontWeight:700, color:W, marginBottom:"0.25rem" }}>
                Smyrna Townhome
              </div>
              <div style={{ fontFamily:S, fontSize:"0.7rem",
                             color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
                Smyrna, GA · Paid Off · 6 min Truist Park ·
                Chancellor K. Jackson
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                           gap:"1px", background:"#1C2333" }}>
              {[
                {label:"Liens",   val:"$0 · Paid Off"},
                {label:"Equity",  val:"100% Owner"},
                {label:"Status",  val:"Investor Open"},
                {label:"Owner",   val:"C.K. Jackson"},
              ].map(s => (
                <div key={s.label} style={{ background:CARD, padding:"0.55rem 0.75rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.48rem",
                                 color:"rgba(255,255,255,0.25)", textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:2 }}>{s.label}</div>
                  <div style={{ fontFamily:M, fontSize:"0.68rem",
                                 fontWeight:700, color:"#DC2626" }}>{s.val}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"0.625rem 0.875rem", background:"#08090F",
                           display:"flex", gap:"0.5rem", alignItems:"center" }}>
              <span style={{ fontFamily:M, fontSize:"0.55rem",
                              color:"rgba(220,38,38,0.5)", letterSpacing:"0.08em",
                              textTransform:"uppercase" }}>⚾ 6 MIN · TRUIST PARK</span>
              <button onClick={() => setDeep("submit")}
                style={{ marginLeft:"auto", padding:"0.35rem 0.75rem", borderRadius:4,
                          border:"none", background:"#DC2626", color:"#fff",
                          fontFamily:M, fontSize:"0.58rem", fontWeight:900,
                          cursor:"pointer", textTransform:"uppercase",
                          letterSpacing:"0.06em" }}>
                TOKENIZE →
              </button>
            </div>
          </div>
        </div>

        <Divider/>

        {/* ── WYOMING LLC ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.25rem" }}>
          <Label>Wyoming LLC Formation</Label>
          <div style={{ padding:"1rem 1.125rem", borderRadius:8,
                         background:`linear-gradient(135deg,rgba(59,130,246,0.07),rgba(139,92,246,0.04))`,
                         border:`1px solid ${B}25` }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                           marginBottom:"0.625rem" }}>
              <div style={{ padding:"0.25rem 0.625rem", borderRadius:3,
                             background:`${B}18`, border:`1px solid ${B}35`,
                             fontFamily:M, fontSize:"0.6rem", fontWeight:900,
                             color:B, letterSpacing:"0.12em",
                             textTransform:"uppercase" }}>
                TOKENIZE YOUR BUSINESS
              </div>
            </div>
            <h2 style={{ fontFamily:S, fontSize:"clamp(0.95rem,2.5vw,1.35rem)",
                          fontWeight:800, color:W, margin:"0 0 0.375rem",
                          letterSpacing:"-0.01em" }}>
              Launch your business on-chain.
            </h2>
            <p style={{ fontFamily:S, fontSize:"0.78rem",
                         color:"rgba(255,255,255,0.4)", lineHeight:1.6,
                         maxWidth:560, margin:"0 0 0.75rem" }}>
              Wyoming LLC for on-chain ownership, governance, fundraising, and lending.
            </p>
            <div style={{ padding:"0.5rem 0.75rem", borderRadius:5,
                           background:`${G}07`,
                           border:`1px solid ${G}20`,
                           marginBottom:"0.875rem",
                           display:"flex", alignItems:"center", gap:"0.5rem",
                           flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:G }}/>
                <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                                color:G, letterSpacing:"0.08em" }}>USDC · SOLANA</span>
              </div>
              <span style={{ fontFamily:S, fontSize:"0.7rem",
                              color:"rgba(255,255,255,0.4)" }}>
                Send to circuit.skr treasury wallet
              </span>
              <div style={{ display:"flex", gap:"0.25rem", flexWrap:"wrap",
                             marginLeft:"auto", opacity:0.4 }}>
                {["CARD","APPLE PAY","GOOGLE PAY","KLARNA"].map(m => (
                  <div key={m} style={{ padding:"1px 6px", borderRadius:2,
                    background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(255,255,255,0.08)",
                    fontFamily:M, fontSize:"0.44rem",
                    color:"rgba(255,255,255,0.3)", letterSpacing:"0.04em" }}>
                    {m} · COMING SOON
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:"0.625rem", marginBottom:"1rem",
                           overflowX:"auto", paddingBottom:"0.25rem",
                           scrollSnapType:"x mandatory" }}>
              {(([
                { id:"starter"    , tier:"STARTER",    price:"$1,499", color:B,         items:["Wyoming LLC Formation","Operating Agreement","On-chain Token","V5 Verification"] },
                { id:"growth"     , tier:"GROWTH",     price:"$2,999", color:"#8B5CF6", items:["Everything in Starter","Multi-sig Governance","Cap Table Mgmt","Lending Eligible"] },
                { id:"enterprise" , tier:"ENTERPRISE", price:"$4,999", color:G,         items:["Everything in Growth","Compliance Package","Priority 24h","Dedicated Verifier"] },
              ] as { id:"starter"|"growth"|"enterprise"; tier:string; price:string; color:string; items:string[] }[])).map(pkg => (
                <div key={pkg.tier} style={{ minWidth:200, flex:"0 0 200px",
                  padding:"0.875rem", borderRadius:6, background:CARD,
                  border:`1px solid ${pkg.color}25`, borderTop:`2px solid ${pkg.color}`,
                  display:"flex", flexDirection:"column", scrollSnapAlign:"start" }}>
                  <div style={{ fontFamily:M, fontSize:"0.62rem", fontWeight:900,
                                 color:pkg.color, letterSpacing:"0.1em",
                                 marginBottom:"0.2rem" }}>{pkg.tier}</div>
                  <div style={{ fontFamily:M, fontSize:"1.05rem", fontWeight:900,
                                 color:W, marginBottom:"0.5rem" }}>{pkg.price}</div>
                  <div style={{ flex:1, marginBottom:"0.625rem" }}>
                    {pkg.items.map(item => (
                      <div key={item} style={{ display:"flex", gap:"0.4rem",
                                                alignItems:"flex-start", marginBottom:3 }}>
                        <span style={{ color:pkg.color, fontSize:"0.6rem", flexShrink:0, marginTop:2 }}>◉</span>
                        <span style={{ fontFamily:S, fontSize:"0.72rem",
                                        color:"rgba(255,255,255,0.5)", lineHeight:1.4 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { setInitialTier(pkg.id); setWyOpen(true); }}
                    style={{ width:"100%", padding:"0.5rem 0.625rem", borderRadius:4,
                              border:`1px solid ${pkg.color}55`, background:`${pkg.color}12`,
                              color:pkg.color, fontFamily:M, fontSize:"0.68rem",
                              fontWeight:900, cursor:"pointer", letterSpacing:"0.06em",
                              textTransform:"uppercase" }}>
                    SELECT →
                  </button>
                  <div style={{ display:"flex", gap:"0.2rem", flexWrap:"wrap",
                                 marginTop:"0.3rem", opacity:0.4 }}>
                    {["CARD","APPLE PAY","KLARNA"].map(m => (
                      <div key={m} style={{ padding:"1px 4px", borderRadius:2,
                        background:"rgba(255,255,255,0.04)",
                        border:"1px solid rgba(255,255,255,0.1)",
                        fontFamily:M, fontSize:"0.4rem",
                        color:"rgba(255,255,255,0.3)",
                        letterSpacing:"0.04em" }}>
                        {m} · SOON
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { setInitialTier(null); setWyOpen(true); }} style={{
              padding:"0.55rem 1.125rem", borderRadius:5, border:"none",
              background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
              fontWeight:900, cursor:"pointer", letterSpacing:"0.05em",
              textTransform:"uppercase", boxShadow:`0 0 12px ${G}45`,
            }}>
              BROWSE TIERS →
            </button>
          </div>
        </div>

        <Divider/>

        {/* ── ABRAXAS ID deep anchor ────────────────────────────────────────── */}
        <div id="abraxas-id"/>

        {/* ── MUSIC ROYALTY AUDIT ───────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>Music Royalty Audit</Label>
          <div style={{ marginBottom:"1rem" }}>
            <div style={{ fontFamily:"Georgia,'Times New Roman',serif",
                           fontSize:"clamp(1.5rem,4vw,2.5rem)", fontWeight:700,
                           color:W, lineHeight:1.15, letterSpacing:"-0.02em",
                           marginBottom:"0.625rem" }}>
              Your catalog is<br/>
              <span style={{ color:G }}>earning money<br/>you haven't seen.</span>
            </div>
            <p style={{ fontFamily:S, fontSize:"0.82rem",
                         color:"rgba(255,255,255,0.5)", lineHeight:1.7,
                         maxWidth:560, margin:0 }}>
              Publishing deals routinely route royalties to the wrong party. Missing ISRCs,
              unregistered compositions, and MLC gaps leave years of income in an unclaimed pool.
              We work with 80+ publishing clients and have seen this pattern in every catalog
              we have reviewed. Our team finds it. You keep it.
            </p>
          </div>
          <ArtistAuditForm />
        </div>

        <Divider/>

        {/* ── VERIFICATION PARTNERS ─────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>Verification Partners</Label>
          <div style={{ padding:"1rem 1.125rem", background:CARD,
                         border:`1px solid ${BDR}`, borderRadius:8,
                         marginBottom:"1.5rem" }}>
            {/* Utilia custody partnership badge */}
          <div style={{ padding:"0.625rem 0.875rem", borderRadius:6,
                         background:"rgba(59,130,246,0.07)",
                         border:"1px solid rgba(59,130,246,0.25)",
                         display:"flex", alignItems:"center",
                         gap:"0.75rem", flexWrap:"wrap",
                         marginBottom:"0.875rem" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <div style={{ width:8, height:8, borderRadius:"50%",
                             background:B, boxShadow:`0 0 5px ${B}` }}/>
              <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                              color:B, letterSpacing:"0.12em",
                              textTransform:"uppercase" }}>
                CUSTODY PARTNER · UTILIA
              </span>
            </div>
            <span style={{ fontFamily:S, fontSize:"0.7rem",
                            color:"rgba(255,255,255,0.4)", lineHeight:1.5 }}>
              Institutional MPC custody for assets verified on Abraxas. 
              Policy-grade key management beyond what Phantom or MetaMask offer.
            </span>
            <a href="https://utila.io" target="_blank" rel="noopener noreferrer"
               style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                         color:B, textDecoration:"none", letterSpacing:"0.08em",
                         textTransform:"uppercase", flexShrink:0 }}>
              UTILA.IO ↗
            </a>
          </div>

          <div style={{ display:"flex", alignItems:"flex-start",
                           justifyContent:"space-between",
                           flexWrap:"wrap", gap:"0.75rem",
                           marginBottom:"0.875rem" }}>
              <div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.92rem,2vw,1.15rem)",
                               fontWeight:800, color:W, marginBottom:"0.25rem" }}>
                  Join the verification network.
                </div>
                <p style={{ fontFamily:S, fontSize:"0.75rem",
                             color:"rgba(255,255,255,0.45)", lineHeight:1.65,
                             maxWidth:520, margin:0 }}>
                  Abraxas partners are the trusted professionals behind every verified asset —
                  appraisers, attorneys, title companies, and auditors who validate the claims
                  that make on-chain collateral real.
                </p>
              </div>
              <BecomeAPartner />
            </div>
          </div>
        </div>

        <Divider/>

        {/* ── POSITIONING / SUBMIT CTA ─────────────────────────────────────── */}
        <div style={{ padding:"2rem", borderRadius:8,
                       border:`1px solid ${B}25`, background:`${B}05`,
                       textAlign:"center", marginBottom:"1.5rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.7rem", color:`${B}80`,
                         textTransform:"uppercase", letterSpacing:"0.2em",
                         marginBottom:"0.625rem" }}>
            BRING AN ASSET INTO THE PROTOCOL
          </div>
          <h2 style={{ fontFamily:S, fontSize:"clamp(1.1rem,2.5vw,1.5rem)",
                        fontWeight:800, color:W, margin:"0 0 0.625rem",
                        letterSpacing:"-0.02em" }}>
            Verification before tokenization.
          </h2>
          <p style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.5vw,0.84rem)",
                       color:"rgba(255,255,255,0.38)", lineHeight:1.75,
                       maxWidth:540, margin:"0 auto 1.25rem" }}>
            Owner-led onboarding for real estate, minerals, energy reserves,
            royalty interests, books, IP, and other cash-flowing assets.
            No wallet required to assess eligibility.
          </p>
          <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap",
                         justifyContent:"center" }}>
            <button onClick={() => setDeep("submit")} style={{
              padding:"0.875rem 1.75rem", borderRadius:6, border:"none",
              background:G, color:"#000", fontFamily:M, fontSize:"0.92rem",
              fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
              textTransform:"uppercase",
            }}>START ONBOARDING →</button>
            <button onClick={() => setDeep("trust")} style={{
              padding:"0.875rem 1.75rem", borderRadius:6,
              border:`1px solid ${BDR}`, background:"transparent",
              color:"rgba(255,255,255,0.55)", fontFamily:M,
              fontSize:"0.92rem", fontWeight:700, cursor:"pointer",
              letterSpacing:"0.04em", textTransform:"uppercase",
            }}>VIEW TRUST LAYER</button>
          </div>
        </div>

        <Divider/>


        <Divider/>

        {/* ── ASSET VERTICALS ──────────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>Asset Verticals</Label>
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                         gap:"0.7rem" }}>
            {[
              { n:"01", color:A, badge:"Generational Sovereignty",
                title:"Tribal & Natural Resources",
                desc:"Direct participation in oil, gas, mineral, and renewable energy projects on indigenous and sovereign land. Co-ownership structures that preserve jurisdictional autonomy.",
                tags:["Mineral Rights","Working Interests","Carbon Credits","Water Rights"] },
              { n:"02", color:B, badge:"Anti-Displacement",
                title:"Affordable Housing",
                desc:"Community Land Trusts and operator-managed properties tokenized so residents become fractional owners. Appreciation captured by the community, not outside investors.",
                tags:["CLT Structures","Operator Properties","Cash-Flow Residential"] },
              { n:"03", color:"#8B5CF6", badge:"Cultural Equity",
                title:"Music & Creator Royalties",
                desc:"Artist catalogs, publishing rights, and future royalty streams structured as regulated securities. We currently work with 80 clients holding active publishing deals, each being introduced to the Abraxas Protocol.",
                tags:["Master Recordings","Publishing Rights","Sync Licensing","80 Active Publishing Clients"] },
              { n:"04", color:B, badge:"Intellectual Capital",
                title:"Books & Intellectual Property",
                desc:"Published works, patents, trademarks, and licensing revenue tokenized as verifiable on-chain assets. Book catalogs become investable royalty streams. IP-backed lending against proven revenue.",
                tags:["Book Royalties","Publishing Rights","Patent Revenue","Licensing Income","Digital Catalogs"] },
            ].map(v => (
              <div key={v.n} style={{ background:CARD, border:`1px solid ${BDR}`,
                                       borderTop:`2px solid ${v.color}`,
                                       borderRadius:7, padding:"1.125rem" }}>
                <div style={{ display:"flex", alignItems:"center",
                               justifyContent:"space-between", marginBottom:"0.92rem" }}>
                  <span style={{ fontFamily:M, fontSize:"0.84rem", fontWeight:900,
                                  color:`${v.color}50` }}>{v.n}</span>
                  <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                                  color:v.color, background:`${v.color}12`,
                                  border:`1px solid ${v.color}25`, borderRadius:3,
                                  padding:"1px 6px", textTransform:"uppercase",
                                  letterSpacing:"0.08em" }}>{v.badge}</span>
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.84rem,1.8vw,0.96rem)",
                               fontWeight:700, color:W, marginBottom:"0.92rem" }}>{v.title}</div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.85rem,1.4vw,0.95rem)",
                               color:"rgba(255,255,255,0.38)", lineHeight:1.7,
                               marginBottom:"0.7rem" }}>{v.desc}</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.25rem" }}>
                  {v.tags.map(t => (
                    <span key={t} style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                                            color:`${v.color}90`, background:`${v.color}08`,
                                            border:`1px solid ${v.color}18`,
                                            borderRadius:2, padding:"1px 5px",
                                            letterSpacing:"0.06em" }}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

        <Divider/>

        {/* ── WORLD LABS · CREATIVE IP INFRASTRUCTURE ──────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>World Labs · Creative IP Infrastructure</Label>
          {/* World Studios Kansas City */}
          <div style={{ borderRadius:8, overflow:"hidden",
                         border:"1px solid rgba(139,92,246,0.35)",
                         background:"linear-gradient(135deg,#0D0A1A 0%,#080810 60%,#09070F 100%)",
                         marginBottom:"0.875rem" }}>
            <div style={{ padding:"1.25rem 1.375rem",
                           borderBottom:"1px solid rgba(139,92,246,0.15)" }}>
              <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                             color:"#8B5CF6", letterSpacing:"0.18em",
                             textTransform:"uppercase", marginBottom:"0.5rem" }}>
                WORLD LABS STUDIOS · KANSAS CITY, MO · IN DEVELOPMENT
              </div>
              <h3 style={{ fontFamily:"Georgia,serif",
                            fontSize:"clamp(1.2rem,3vw,1.75rem)",
                            fontWeight:700, color:W, lineHeight:1.2,
                            letterSpacing:"-0.01em", margin:"0 0 0.625rem" }}>
                World Studios
              </h3>
              <p style={{ fontFamily:S, fontSize:"0.78rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.72,
                           maxWidth:560, margin:"0 0 1rem" }}>
                A multi-disciplinary creative hub in Kansas City — photography, live theatre,
                dance, and a full production studio under one roof. The foundational venue
                for the World Labs catalog and a live events pipeline generating verifiable
                IP revenue.
              </p>
              <div style={{ display:"grid",
                             gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",
                             gap:"0.5rem" }}>
                {[["Photography Studio","Commercial + editorial"],["Live Theatre","Original productions"],
                  ["Dance Studio","Classes + performances"],["Production Hub","Film, manga, animation"],
                  ["IP Catalog Home","World Labs protocols"],["Status","Scouting · In talks"]
                ].map((item: string[]) => (
                  <div key={item[0]} style={{ padding:"0.625rem 0.75rem", borderRadius:5,
                                         background:"rgba(139,92,246,0.07)",
                                         border:"1px solid rgba(139,92,246,0.2)" }}>
                    <div style={{ fontFamily:M, fontSize:"0.5rem",
                                   color:"rgba(139,92,246,0.6)", textTransform:"uppercase",
                                   letterSpacing:"0.1em", marginBottom:2 }}>{item[0]}</div>
                    <div style={{ fontFamily:S, fontSize:"0.68rem",
                                   color:"rgba(255,255,255,0.45)" }}>{item[1]}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:"0.75rem 1rem", background:"#08090F",
                           display:"flex", gap:"0.5rem", flexWrap:"wrap",
                           alignItems:"center" }}>
              <div style={{ fontFamily:M, fontSize:"0.58rem",
                             color:"rgba(139,92,246,0.5)", letterSpacing:"0.1em",
                             textTransform:"uppercase" }}>● STUDIO ACQUISITION IN PROGRESS</div>
              <button onClick={() => setDeep("submit")} style={{
                padding:"0.45rem 0.875rem", borderRadius:4, border:"none",
                background:"#8B5CF6", color:"#fff", fontFamily:M, fontSize:"0.62rem",
                fontWeight:900, cursor:"pointer", textTransform:"uppercase",
                letterSpacing:"0.08em", marginLeft:"auto",
              }}>BECOME A PARTNER →</button>
            </div>
          </div>
          {/* LifeWay Live Show IP */}
          <div style={{ borderRadius:8, padding:"1rem 1.125rem",
                         border:`1px solid ${G}20`, background:`${G}04` }}>
            <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                           color:G, letterSpacing:"0.18em", textTransform:"uppercase",
                           marginBottom:"0.5rem" }}>
              LIFEWAY · LIVE SHOW IP RIGHTS · IN DISCUSSIONS
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
                           alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
              <div style={{ flex:1, minWidth:220 }}>
                <div style={{ fontFamily:"Georgia,serif",
                               fontSize:"clamp(0.9rem,2vw,1.1rem)",
                               fontWeight:700, color:W, marginBottom:"0.375rem" }}>
                  Live Show IP Catalog
                </div>
                <p style={{ fontFamily:S, fontSize:"0.72rem",
                             color:"rgba(255,255,255,0.4)", lineHeight:1.65, margin:0 }}>
                  Discussions underway with LifeWay to acquire live show IP rights and bring
                  them into the World Labs protocol. Rights-verified performance IP becomes
                  tokenizable revenue under the Abraxas framework — building catalog depth
                  before the studio opens.
                </p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem", flexShrink:0 }}>
                <div style={{ padding:"0.3rem 0.75rem", borderRadius:3,
                               background:`${G}12`, border:`1px solid ${G}30`,
                               fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                               color:G, letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  ● IN DISCUSSIONS
                </div>
                <button onClick={() => setDeep("submit")} style={{
                  padding:"0.45rem 0.875rem", borderRadius:4, border:"none",
                  background:G, color:"#000", fontFamily:M, fontSize:"0.62rem",
                  fontWeight:900, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em",
                }}>SUBMIT IP ASSET →</button>
              </div>
            </div>
          </div>
        </div>

        <Divider/>


        {/* ── ASSET REGISTRY ───────────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          {/* Registry shows all 3 verified/pending assets */}
        <div style={{ display:"flex", alignItems:"baseline",
                         justifyContent:"space-between", flexWrap:"wrap",
                         gap:"0.92rem", marginBottom:"1.25rem" }}>
            <Label>Asset Registry</Label>
            <button onClick={() => setDeep("registry")}
              style={{ fontFamily:M, fontSize:"0.78rem", color:`${B}80`,
                        background:"transparent", border:"none",
                        cursor:"pointer", textDecoration:"underline",
                        textUnderlineOffset:4 }}>
              Open inspector →
            </button>
          </div>
          <div onClick={() => setDeep("asset")} style={{
            padding:"1.375rem 1.5rem", borderRadius:8,
            border:`1px solid ${G}25`, background:`${G}05`,
            display:"flex", justifyContent:"space-between",
            alignItems:"center", flexWrap:"wrap", gap:"0.92rem",
            cursor:"pointer",
          }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.92rem",
                             marginBottom:"0.7rem" }}>
                <span style={{ fontFamily:M, fontSize:"0.65rem",
                                color:`${G}60`, textTransform:"uppercase",
                                letterSpacing:"0.12em" }}>
                  AAS-1 · GENESIS ASSET
                </span>
                <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                                color:G, background:`${G}15`, border:`1px solid ${G}30`,
                                borderRadius:3, padding:"1px 6px",
                                textTransform:"uppercase", letterSpacing:"0.08em" }}>
                  VERIFIED
                </span>
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.85rem,2vw,1.05rem)",
                             fontWeight:700, color:W }}>
                Cielo Sunrise · $1,100,000
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.64rem,1.3vw,0.76rem)",
                             color:"rgba(255,255,255,0.32)", marginTop:"0.2rem" }}>
                Mineral Bluff, Georgia · 89/100 collateral score · $660K max borrow · 96% verification confidence
              </div>
            </div>
            <span style={{ fontFamily:M, fontSize:"0.82rem", color:G,
                            letterSpacing:"0.06em" }}>INSPECT →</span>
          </div>
        </div>

        <div style={{ height:"3rem" }}/>
      </div>

    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────
export default function TerminalPage() {
  return (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      {/* Protocol status strip */}
      <div style={{ background:"#060810", borderBottom:"1px solid #0F1929",
                     padding:"0 clamp(0.75rem,2.5vw,1.5rem)",
                     height:28, display:"flex", alignItems:"center",
                     gap:"1.5rem", overflowX:"auto", flexShrink:0 }}>
        {[
          { dot:G, text:"SOLANA MAINNET" }, { dot:G, text:"AAS-1 PROTOCOL ACTIVE" },
          { dot:A, text:"REG A / D / CF READY" }, { dot:B, text:"OWNERSHIP INFRASTRUCTURE" },
        ].map(s => (
          <div key={s.text} style={{ display:"flex", alignItems:"center",
                                      gap:"0.35rem", flexShrink:0 }}>
            <div style={{ width:5, height:5, borderRadius:"50%",
                           background:s.dot, boxShadow:`0 0 5px ${s.dot}80` }}/>
            <span style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                            color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em",
                            textTransform:"uppercase" }}>{s.text}</span>
          </div>
        ))}
        <div style={{ flex:1 }}/>
        <span style={{ fontFamily:M, fontSize:"0.6rem",
                        color:"rgba(255,255,255,0.15)", letterSpacing:"0.1em" }}>
          ABRAXAS OS · BUILD 2025.1
        </span>
      </div>

      {/* Nav */}
      <nav style={{ position:"sticky", top:28, zIndex:200,
                     background:"rgba(10,12,16,0.97)", backdropFilter:"blur(12px)",
                     borderBottom:`1px solid ${BDR}`,
                     display:"flex", alignItems:"center",
                     padding:`0 clamp(0.75rem,2.5vw,1.5rem)`,
                     height:"clamp(46px,6vw,54px)",
                     gap:"clamp(0.25rem,1vw,0.5rem)",
                     flexWrap:"nowrap", overflowX:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem",
                       flexShrink:0, marginRight:"clamp(0.375rem,1.5vw,1rem)" }}>
          <Image src="/icon-48.png" alt="Abraxas" width={24} height={24}
                 priority style={{ display:"block", flexShrink:0 }}/>
          <div>
            <span style={{ fontFamily:M, fontSize:"clamp(1rem,1.5vw,1.15rem)",
                            fontWeight:900, color:W, letterSpacing:"0.1em" }}>
              ABRAXAS
            </span>
            <span className="abraxas-nav-os" style={{ fontFamily:M, fontSize:"1.1rem",
                   color:"rgba(255,255,255,0.2)", letterSpacing:"0.15em",
                   marginLeft:"0.375rem", verticalAlign:"middle" }}>
              PROTOCOL OS
            </span>
          </div>
        </div>
        <button style={{ padding:"0.5rem clamp(0.75rem,1.5vw,1.125rem)", borderRadius:5,
                          border:`1px solid ${G}50`, background:`${G}10`, color:G,
                          fontFamily:M, fontSize:"clamp(0.7rem,0.85vw,0.85rem)",
                          fontWeight:700, cursor:"default",
                          textTransform:"uppercase", letterSpacing:"0.1em",
                          whiteSpace:"nowrap", flexShrink:0 }}>TERMINAL</button>
        <a href="/dashboard" style={{ padding:"0.5rem clamp(0.75rem,1.5vw,1.125rem)",
                              borderRadius:5, border:`1px solid ${BDR}`,
                              background:"transparent", color:"rgba(255,255,255,0.4)",
                              fontFamily:M, fontSize:"clamp(0.7rem,0.85vw,0.85rem)",
                              fontWeight:700, textDecoration:"none",
                              textTransform:"uppercase", letterSpacing:"0.1em",
                              whiteSpace:"nowrap", flexShrink:0 }}>DASHBOARD</a>
        <div style={{ flex:1 }}/>
        <LanguageSelector/>
        <CompactWallet/>
      </nav>

      <div style={{ flex:1 }}>
        <TerminalTab/>
      </div>
    </div>
  );
}
