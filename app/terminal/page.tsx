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
import { VerificationTerminal }      from "@/components/vos/VerificationTerminal";
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
          {[["Verified Properties","1"],["Pending Verification","0"],
            ["Total AUM","$1.1M"],["Avg Collateral Score","89/100"]].map(([k,v]) => (
            <div key={k} style={{ background:CARD, padding:"0.875rem" }}>
              <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:"1.25rem", fontWeight:900, color:G }}>{v}</div>
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
            {[["● 1 ASSET VERIFIED",true],["$1.1M ATTESTED",false],["W3C VC · SOLANA MAINNET",false]].map(([t,hi]) => (
              <div key={t as string} style={{ padding:"0.35rem 0.75rem", borderRadius:4,
                               background:hi ? `${G}12` : "rgba(255,255,255,0.04)",
                               border:`1px solid ${hi ? G+"30" : BDR}`,
                               fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                               color:hi ? G : "rgba(255,255,255,0.4)",
                               letterSpacing:"0.08em" }}>
                {t as string}
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
                ["Max Borrow","$660K USDC"],["Cap Rate","9.95%"]].map(([k,v]) => (
                <div key={k} style={{ background:CARD, padding:"0.75rem 0.875rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.52rem",
                                 color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:3 }}>{k}</div>
                  <div style={{ fontFamily:M, fontSize:"0.92rem",
                                 fontWeight:900, color:G }}>{v}</div>
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
                         maxWidth:560, margin:"0 0 1rem" }}>
              Wyoming LLC for on-chain ownership, governance, fundraising, and lending.
            </p>
            <div style={{ display:"flex", gap:"0.625rem", marginBottom:"1rem",
                           overflowX:"auto", paddingBottom:"0.25rem",
                           scrollSnapType:"x mandatory" }}>
              {([
                { id:"starter"    as const, tier:"STARTER",    price:"$1,499", color:B,         items:["Wyoming LLC Formation","Operating Agreement","On-chain Token","V5 Verification"] },
                { id:"growth"     as const, tier:"GROWTH",     price:"$2,999", color:"#8B5CF6", items:["Everything in Starter","Multi-sig Governance","Cap Table Mgmt","Lending Eligible"] },
                { id:"enterprise" as const, tier:"ENTERPRISE", price:"$4,999", color:G,         items:["Everything in Growth","Compliance Package","Priority 24h","Dedicated Verifier"] },
              ]).map(pkg => (
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
                  <button onClick={() => { setInitialTier(pkg.id); setWyOpen(true); }} style={{
                    width:"100%", padding:"0.5rem 0.625rem", borderRadius:4,
                    border:`1px solid ${pkg.color}55`, background:`${pkg.color}12`,
                    color:pkg.color, fontFamily:M, fontSize:"0.68rem",
                    fontWeight:900, cursor:"pointer", letterSpacing:"0.06em",
                    textTransform:"uppercase" }}>
                    SELECT →
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => { setInitialTier(null); setWyOpen(true); }} style={{
              padding:"0.55rem 1.125rem", borderRadius:5, border:"none",
              background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
              fontWeight:900, cursor:"pointer", letterSpacing:"0.05em",
              textTransform:"uppercase", boxShadow:`0 0 12px ${G}45`,
            }}>
              START TOKENIZATION NOW →
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

        {/* ── PROTOCOL ARCHITECTURE ────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
          <Label>Protocol Architecture</Label>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.92rem" }}>
            {[
              { n:"L5", title:"Reinvestment Engine",     desc:"Compounding ownership across generations", color:G, intensity:1.0 },
              { n:"L4", title:"Cash Flow & Governance",  desc:"Distributions and participation rights to token holders", color:G, intensity:0.8 },
              { n:"L3", title:"Community Distribution",  desc:"Ownership accessible at meaningful price points", color:A, intensity:0.85 },
              { n:"L2", title:"Regulated Tokenization",  desc:"Compliant digital securities under Reg A, D, CF", color:A, intensity:0.7 },
              { n:"L1", title:"Asset Origination",       desc:"Real-world assets structured into investment vehicles", color:B, intensity:0.6 },
            ].map(layer => (
              <div key={layer.n} style={{
                display:"grid", gridTemplateColumns:"60px 1fr",
                gap:"0.92rem", padding:"0.875rem 1.25rem",
                background:`${layer.color}${Math.round(layer.intensity*12).toString(16).padStart(2,"0")}`,
                border:`1px solid ${layer.color}30`, borderLeft:`3px solid ${layer.color}`,
                borderRadius:6, alignItems:"center",
              }}>
                <div style={{ fontFamily:M, fontSize:"clamp(1.1rem,2.5vw,1.4rem)",
                               fontWeight:900, color:W }}>{layer.n}</div>
                <div>
                  <div style={{ fontFamily:S, fontSize:"clamp(0.84rem,1.8vw,1rem)",
                                 fontWeight:700, color:W, marginBottom:2,
                                 textTransform:"uppercase", letterSpacing:"0.05em" }}>
                    {layer.title}
                  </div>
                  <div style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.4vw,0.8rem)",
                                 color:"rgba(255,255,255,0.5)" }}>{layer.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

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

          {/* DeMarko Reddins sample IP showcase */}
          <div style={{ marginTop:"1rem", padding:"1rem 1.125rem", borderRadius:7,
                         background:"rgba(59,130,246,0.06)",
                         border:"1px solid rgba(59,130,246,0.2)" }}>
            <div style={{ fontFamily:M, fontSize:"0.55rem", color:B,
                           letterSpacing:"0.14em", textTransform:"uppercase",
                           marginBottom:"0.5rem" }}>
              SAMPLE ASSET · BOOKS & PUBLISHING RIGHTS
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
                           alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem" }}>
              <div>
                <div style={{ fontFamily:"Georgia,serif",
                               fontSize:"clamp(0.9rem,2vw,1.1rem)",
                               fontWeight:700, color:W, marginBottom:"0.25rem" }}>
                  DeMarko Reddins — Published Catalog
                </div>
                <div style={{ fontFamily:S, fontSize:"0.72rem",
                               color:"rgba(255,255,255,0.4)", lineHeight:1.6,
                               maxWidth:460 }}>
                  Multi-title published author catalog. Royalty streams from Amazon KDP
                  and global distributors. Eligible for tokenization as an IP-backed RWA —
                  lending against future royalty income, catalog equity access.
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem",
                             flexShrink:0 }}>
                <a href="https://www.amazon.com/stores/DeMarko-Reddins/author/B00JUA0U0G"
                   target="_blank" rel="noopener noreferrer"
                   style={{ padding:"0.45rem 0.875rem", borderRadius:4,
                             border:"1px solid rgba(59,130,246,0.4)", background:"transparent",
                             color:B, fontFamily:M, fontSize:"0.62rem", fontWeight:700,
                             textDecoration:"none", letterSpacing:"0.06em",
                             textTransform:"uppercase", display:"block", textAlign:"center" }}>
                  VIEW CATALOG ↗
                </a>
                <button onClick={() => setDeep("submit")} style={{
                  padding:"0.45rem 0.875rem", borderRadius:4, border:"none",
                  background:B, color:"#000", fontFamily:M, fontSize:"0.62rem",
                  fontWeight:900, cursor:"pointer", letterSpacing:"0.06em",
                  textTransform:"uppercase",
                }}>TOKENIZE THIS CATALOG →</button>
              </div>
            </div>
          </div>
        </div>

        <Divider/>

        {/* ── ASSET REGISTRY ───────────────────────────────────────────────── */}
        <div style={{ marginBottom:"1.5rem" }}>
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

      {/* ── VOS TERMINAL ─────────────────────────────────────────────────────── */}
      <div style={{ height:"clamp(360px,52vh,620px)", borderBottom:`1px solid ${BDR}`,
                     overflow:"hidden", position:"relative", isolation:"isolate" }}>
        <VerificationTerminal />
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
