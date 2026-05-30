"use client";
// FILE: app/terminal/page.tsx
// Abraxas Collateral Terminal — 4-tab institutional workspace
// OVERVIEW | COLLATERAL | LENDING | PROTOCOL
// Language selector removed (non-functional). Single auth point (CompactWallet).
// Economics surfaced inline on OVERVIEW. Genesis + Terminal merged into COLLATERAL.

import { useState }              from "react";
import { FlagshipAssetPage }     from "@/components/assets/FlagshipAssetPage";
import { TerminalLayout }        from "@/components/terminal/TerminalLayout";
import { AssetOwnerOnboarding }  from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }            from "@/components/onboarding/TrustStack";
import { BorrowPage }            from "@/components/BorrowPage";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CompactWallet }         from "@/components/CompactWallet";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const BG = "#0A0C10"; const CARD = "#0D1117"; const BORDER = "#1C2333";
const G  = "#10B981"; const A = "#F59E0B"; const B = "#3B82F6";

type Tab = "overview" | "collateral" | "lending" | "protocol";
type CollateralView = "featured" | "registry";

// ── Protocol metrics (live once Supabase connected) ──────────────────
// Currently: realistic projections from the financial model
// Replace with real hook once API is wired
const METRICS = [
  { label:"Tokenized AUM",          value:"$375M",    sub:"Year 1 large-asset path", color:G,  tag:"PROJECTED" },
  { label:"Assets Verified (Y1)",   value:"25",        sub:"Large asset pipeline",    color:G,  tag:"PROJECTED" },
  { label:"Max Borrow Capacity",    value:"$225M USDC",sub:"60% LTV on current AUM",  color:B,  tag:"PROJECTED" },
  { label:"Platform Fee Revenue",   value:"$1.4M",     sub:"Annual recurring (Y1)",   color:G,  tag:"PROJECTED" },
  { label:"Verification Fee (Y1)",  value:"$1.9M",     sub:"25 assets at $15M avg",   color:A,  tag:"PROJECTED" },
  { label:"Year 2 EBITDA",          value:"$13.2M",    sub:"Large-asset path",        color:G,  tag:"PROJECTED" },
];

const VERIFICATION_STEPS = [
  { n:"01", t:"Asset Submission",      d:"Owner submits asset details, jurisdiction, and estimated value. No wallet required at this stage.",         color:G },
  { n:"02", t:"Documentation Review",  d:"Title, deed, appraisal, reserve report, or equivalent instrument reviewed by Abraxas verification team.",   color:G },
  { n:"03", t:"Legal Verification",    d:"Licensed legal counsel confirms ownership structure, entity formation, and jurisdictional compliance.",       color:G },
  { n:"04", t:"Custody Verification",  d:"Physical or legal asset confirmed under vault, escrow, or entity-controlled custody arrangement.",           color:B },
  { n:"05", t:"Auditor Sign-Off",       d:"Independent auditor reviews documentation chain for completeness and accuracy. Collateral score assigned.",  color:B },
  { n:"06", t:"On-Chain Attestation",  d:"SHA-256 document hashes committed to Solana mainnet. AAS-1 certificate minted as Token-2022.",              color:A },
  { n:"07", t:"Collateral Activation", d:"Verified certificate becomes eligible collateral. LTV tier assigned based on asset class and risk score.",   color:A },
  { n:"08", t:"Borrow / Finance",       d:"Asset owner draws USDC against collateral via integrated lending protocol. Non-recourse.",                   color:G },
] as const;

const REVENUE_STREAMS = [
  { icon:"◉", color:B,   title:"Verification",   rate:"0.50%", basis:"Asset value", type:"One-time" },
  { icon:"◈", color:"#8B5CF6", title:"Tokenization",  rate:"0.25%", basis:"Asset value", type:"One-time" },
  { icon:"◆", color:G,   title:"Platform AUM",   rate:"0.75%", basis:"Annual AUM",  type:"Recurring" },
  { icon:"⬡", color:A,   title:"Lending Spread", rate:"1.50%", basis:"Loan volume", type:"Recurring" },
];

function SLabel({ c = "children" }:{ c?: string; children: React.ReactNode }){
  return (
    <div style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                   color:`${G}80`, textTransform:"uppercase",
                   letterSpacing:"0.2em", marginBottom:"0.75rem" }}>
      {c}
    </div>
  );
}

function MetricTag({ v, color }: { v:string; color:string }) {
  return (
    <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                    color, background:`${color}12`, border:`1px solid ${color}25`,
                    borderRadius:3, padding:"1px 5px",
                    textTransform:"uppercase", letterSpacing:"0.08em" }}>
      {v}
    </span>
  );
}

// ── OVERVIEW tab — economics + pipeline + positioning ─────────────────
function OverviewTab({ onGoToCollateral, onGoToProtocol }:
  { onGoToCollateral:()=>void; onGoToProtocol:()=>void }) {

  return (
    <div style={{ maxWidth:1060, margin:"0 auto",
                   padding:"2.5rem clamp(1rem,3vw,2rem) 4rem" }}>

      {/* ── Positioning headline ────────────────────────────────── */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                       color:`${G}80`, textTransform:"uppercase",
                       letterSpacing:"0.2em", marginBottom:"0.75rem" }}>
          ABRAXAS PROTOCOL · SOLANA
        </div>
        <h1 style={{ fontFamily:S, fontSize:"clamp(1.6rem,4.5vw,3.2rem)",
                      fontWeight:800, color:"#F8FAFC", margin:"0 0 1rem",
                      letterSpacing:"-0.03em", lineHeight:1.08 }}>
          Institutional collateral<br/>
          infrastructure, on-chain.
        </h1>
        <p style={{ fontFamily:S, fontSize:"clamp(0.8rem,1.8vw,1rem)",
                     color:"rgba(255,255,255,0.32)", lineHeight:1.8,
                     maxWidth:580, margin:"0 0 2rem" }}>
          Abraxas verifies whether a real-world asset is financeable.
          We transform verified property, minerals, energy reserves, and
          precious metals into programmable on-chain collateral — backed
          by legal, custodial, and audit infrastructure.
        </p>
        {/* Primary CTAs */}
        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
          <button onClick={onGoToProtocol} style={{
            padding:"0.875rem 1.75rem", borderRadius:6, border:"none",
            background:G, color:"#000", fontFamily:M, fontSize:"0.5rem",
            fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
            textTransform:"uppercase",
          }}>
            SUBMIT AN ASSET →
          </button>
          <button onClick={onGoToCollateral} style={{
            padding:"0.875rem 1.75rem", borderRadius:6,
            border:`1px solid ${B}40`, background:`${B}08`,
            color:B, fontFamily:M, fontSize:"0.5rem", fontWeight:700,
            cursor:"pointer", letterSpacing:"0.04em", textTransform:"uppercase",
          }}>
            VIEW COLLATERAL TERMINAL →
          </button>
        </div>
      </div>

      {/* ── Protocol metrics grid ───────────────────────────────── */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"0.875rem" }}>
          PROTOCOL PROJECTIONS — LARGE ASSET PATH (YEAR 1)
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                       gap:"1px", border:`1px solid ${BORDER}`,
                       borderRadius:8, overflow:"hidden" }}>
          {METRICS.map(m => (
            <div key={m.label} style={{ background:CARD, padding:"1.125rem 1rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.1em",
                             marginBottom:"0.35rem" }}>
                {m.label}
              </div>
              <div style={{ fontFamily:M, fontSize:"clamp(0.8rem,2vw,1.15rem)",
                             fontWeight:900, color:m.color, lineHeight:1 }}>
                {m.value}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.26rem",
                             color:"rgba(255,255,255,0.2)", marginTop:"0.25rem" }}>
                {m.sub}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.18)",
                       marginTop:"0.5rem" }}>
          ↑ Illustrative projections from Abraxas sensitivity pro forma. Not a guarantee of performance.
        </div>
      </div>

      {/* ── Verification pipeline ────────────────────────────────── */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"1.125rem" }}>
          COLLATERAL ACTIVATION PIPELINE
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",
                       gap:"0.625rem" }}>
          {VERIFICATION_STEPS.map(step => (
            <div key={step.n} style={{ background:CARD, border:`1px solid ${BORDER}`,
                                         borderLeft:`2px solid ${step.color}`,
                                         borderRadius:6, padding:"0.875rem 1rem" }}>
              <div style={{ fontFamily:M,
                             fontSize:"clamp(0.9rem,2vw,1.3rem)",
                             fontWeight:900, color:`${step.color}20`,
                             lineHeight:1, marginBottom:"0.35rem" }}>
                {step.n}
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.6vw,0.82rem)",
                             fontWeight:700, color:"#F8FAFC", marginBottom:"0.3rem" }}>
                {step.t}
              </div>
              <div style={{ fontFamily:S, fontSize:"clamp(0.6rem,1.3vw,0.7rem)",
                             color:"rgba(255,255,255,0.3)", lineHeight:1.65 }}>
                {step.d}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Revenue model ────────────────────────────────────────── */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"0.875rem" }}>
          REVENUE ARCHITECTURE
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                       gap:"1px", border:`1px solid ${BORDER}`,
                       borderRadius:8, overflow:"hidden" }}>
          {REVENUE_STREAMS.map(r => (
            <div key={r.title} style={{ background:CARD, padding:"1rem",
                                          borderTop:`2px solid ${r.color}` }}>
              <div style={{ display:"flex", alignItems:"center",
                             gap:"0.35rem", marginBottom:"0.5rem" }}>
                <span style={{ color:r.color, fontSize:"0.55rem" }}>{r.icon}</span>
                <span style={{ fontFamily:M, fontSize:"0.38rem",
                                fontWeight:700, color:"#F8FAFC" }}>{r.title}</span>
              </div>
              <div style={{ fontFamily:M,
                             fontSize:"clamp(0.8rem,2vw,1.1rem)",
                             fontWeight:900, color:r.color,
                             marginBottom:"0.25rem" }}>
                {r.rate}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.28rem",
                             color:"rgba(255,255,255,0.2)", marginBottom:"0.4rem" }}>
                of {r.basis}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.28rem", color:r.color,
                             background:`${r.color}12`, border:`1px solid ${r.color}20`,
                             borderRadius:3, padding:"1px 5px", display:"inline-block" }}>
                {r.type}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:"0.75rem", textAlign:"right" }}>
          <a href="/economics" style={{ fontFamily:M, fontSize:"0.34rem",
                                         color:`${B}80`, textDecoration:"none" }}>
            Full economics model →
          </a>
        </div>
      </div>

      {/* ── Genesis asset callout ────────────────────────────────── */}
      <div style={{ padding:"1.375rem 1.5rem", borderRadius:8,
                     border:`1px solid ${G}25`,
                     background:`${G}05`,
                     display:"flex", justifyContent:"space-between",
                     alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <div style={{ fontFamily:M, fontSize:"0.28rem", color:`${G}60`,
                         textTransform:"uppercase", letterSpacing:"0.12em",
                         marginBottom:"0.3rem" }}>
            GENESIS ASSET · AAS-1 VERIFIED · SERIES A
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1rem)",
                         fontWeight:700, color:"#F8FAFC" }}>
            Cielo Sunrise — $1,100,000 · Mineral Bluff, Georgia
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.64rem,1.4vw,0.76rem)",
                         color:"rgba(255,255,255,0.3)", marginTop:"0.2rem" }}>
            89/100 collateral score · $660K max borrow · 75% occupancy · 5.0★ superhost
          </div>
        </div>
        <button onClick={onGoToCollateral} style={{
          padding:"0.625rem 1.25rem", borderRadius:5,
          border:`1px solid ${G}40`, background:`${G}08`,
          fontFamily:M, fontSize:"0.38rem", fontWeight:700,
          color:G, cursor:"pointer",
          textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap",
        }}>
          INSPECT ASSET →
        </button>
      </div>
    </div>
  );
}

// ── COLLATERAL tab — Genesis + Terminal merged ───────────────────────
function CollateralTab() {
  const [view, setView] = useState<CollateralView>("featured");

  return (
    <div>
      {/* Sub-nav */}
      <div style={{ display:"flex", borderBottom:`1px solid ${BORDER}`,
                     background:CARD, overflowX:"auto", flexShrink:0 }}>
        {([
          { id:"featured" as CollateralView, label:"FEATURED ASSET",  sub:"Cielo Sunrise · Genesis" },
          { id:"registry" as CollateralView,  label:"ASSET TERMINAL",  sub:"Inspector · Registry"    },
        ]).map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding:"0.75rem clamp(0.75rem,2vw,1.5rem)", background:"transparent",
            border:"none", borderBottom:`2px solid ${view===v.id ? B : "transparent"}`,
            fontFamily:M, fontSize:"clamp(0.28rem,0.9vw,0.36rem)", fontWeight:700,
            color:view===v.id ? B : "rgba(255,255,255,0.25)",
            cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.1em",
            whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s",
          }}>
            {v.label}
            <span style={{ display:"block", fontSize:"0.26rem",
                            color:"rgba(255,255,255,0.15)", fontWeight:400,
                            letterSpacing:"0.05em", marginTop:1 }}>
              {v.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {view === "featured" && <FlagshipAssetPage />}
      {view === "registry"  && <TerminalLayout />}
    </div>
  );
}

// ── PROTOCOL tab — onboarding + trust stack ──────────────────────────
function ProtocolTab() {
  const [view, setView] = useState<"onboarding"|"trust">("onboarding");

  return (
    <div>
      <div style={{ display:"flex", borderBottom:`1px solid ${BORDER}`,
                     background:CARD, overflowX:"auto" }}>
        {([
          { id:"onboarding" as const, label:"SUBMIT AN ASSET",  sub:"Owner onboarding" },
          { id:"trust"      as const, label:"TRUST ARCHITECTURE",sub:"Verification layers" },
        ]).map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding:"0.75rem clamp(0.75rem,2vw,1.5rem)", background:"transparent",
            border:"none", borderBottom:`2px solid ${view===v.id ? G : "transparent"}`,
            fontFamily:M, fontSize:"clamp(0.28rem,0.9vw,0.36rem)", fontWeight:700,
            color:view===v.id ? G : "rgba(255,255,255,0.25)",
            cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.1em",
            whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s",
          }}>
            {v.label}
            <span style={{ display:"block", fontSize:"0.26rem",
                            color:"rgba(255,255,255,0.15)", fontWeight:400,
                            letterSpacing:"0.05em", marginTop:1 }}>
              {v.sub}
            </span>
          </button>
        ))}
      </div>

      {view === "onboarding" && (
        <AssetOwnerOnboarding onEnterTerminal={() => setView("trust")} />
      )}
      {view === "trust" && <TrustStack />}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────
export default function TerminalPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const TABS: { id:Tab; label:string; sub:string }[] = [
    { id:"overview",   label:"OVERVIEW",   sub:"Economics · Protocol" },
    { id:"collateral", label:"COLLATERAL", sub:"Assets · Verification" },
    { id:"lending",    label:"LENDING",    sub:"Borrow · LTV"          },
    { id:"protocol",   label:"PROTOCOL",   sub:"Submit · Trust"        },
  ];

  return (
    <div style={{ background:BG, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

      {/* ── Primary nav ─────────────────────────────────────────── */}
      <nav style={{
        position:"sticky", top:0, zIndex:200,
        background:"rgba(10,12,16,0.97)", backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${BORDER}`,
        display:"flex", alignItems:"center",
        padding:"0 clamp(0.75rem,2.5vw,1.5rem)",
        height:"clamp(46px,6vw,54px)",
        gap:"clamp(0.25rem,1vw,0.5rem)",
        flexWrap:"nowrap", overflowX:"auto",
      }}>
        {/* Brand */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem",
                       flexShrink:0, marginRight:"clamp(0.375rem,1.5vw,1rem)" }}>
          <span style={{ color:G, fontSize:"clamp(0.7rem,2vw,0.88rem)", lineHeight:1 }}>◈</span>
          <span style={{ fontFamily:M, fontSize:"clamp(0.5rem,1.5vw,0.68rem)",
                          fontWeight:900, color:"#F8FAFC", letterSpacing:"0.1em" }}>
            ABRAXAS
          </span>
          <span style={{ fontFamily:M, fontSize:"0.26rem",
                          color:"rgba(255,255,255,0.2)", letterSpacing:"0.15em",
                          display:"none", ["@media(min-width:640px)" as string]:{display:"block"} }}>
            COLLATERAL TERMINAL
          </span>
        </div>

        {/* 4 tabs */}
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"0.25rem clamp(0.4rem,1.2vw,0.75rem)",
            borderRadius:4,
            border:`1px solid ${tab===t.id ? `${G}50` : BORDER}`,
            background: tab===t.id ? `${G}10` : "transparent",
            color: tab===t.id ? G : "rgba(255,255,255,0.28)",
            fontFamily:M, fontSize:"clamp(0.28rem,0.85vw,0.36rem)",
            fontWeight:700, cursor:"pointer", textTransform:"uppercase",
            letterSpacing:"0.1em", whiteSpace:"nowrap", flexShrink:0,
            transition:"all 0.15s",
          }}>{t.label}</button>
        ))}

        <div style={{ flex:1 }}/>

        {/* Language + wallet */}
        <LanguageSelector />
        <CompactWallet />
      </nav>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div style={{ flex:1 }}>
        {tab === "overview" && (
          <OverviewTab
            onGoToCollateral={() => setTab("collateral")}
            onGoToProtocol={() => setTab("protocol")}
          />
        )}
        {tab === "collateral" && <CollateralTab />}
        {tab === "lending"    && (
          <div style={{ maxWidth:1060, margin:"0 auto",
                         padding:"2rem clamp(1rem,3vw,2rem) 4rem" }}>
            <BorrowPage />
          </div>
        )}
        {tab === "protocol"   && <ProtocolTab />}
      </div>
    </div>
  );
}
