"use client";
import { useState }             from "react";
import { FlagshipAssetPage }    from "@/components/assets/FlagshipAssetPage";
import { TerminalLayout }       from "@/components/terminal/TerminalLayout";
import { AssetOwnerOnboarding } from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }           from "@/components/onboarding/TrustStack";
import { BorrowPage }           from "@/components/BorrowPage";
import { CompactWallet }        from "@/components/CompactWallet";
import { LanguageSelector }     from "@/components/LanguageSelector";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#0A0C10";
const CARD = "#0D1117";
const BDR  = "#1C2333";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const W    = "#F8FAFC";

type Tab   = "overview" | "terminal" | "lending";
type WView = "featured" | "registry" | "onboarding" | "trust";

interface ScenarioData {
  color: string; label: string;
  assets: number[]; aum: number[];
  rev: number[]; ebitda: number[];
  ebitdaMargin: number[]; grossMargin: number[];
}

const SMALL: ScenarioData = {
  color: A, label: "Small ($1-3M avg)",
  assets: [75,250,500], aum: [112.5,595.6,1786.1],
  rev: [1.33,7.12,21.43], ebitda: [-5.19,-6.87,-3.20],
  ebitdaMargin: [-389.1,-96.5,-14.9], grossMargin: [-87.5,6.8,44.2],
};
const LARGE: ScenarioData = {
  color: G, label: "Large ($15-25M avg)",
  assets: [25,75,150], aum: [375,1818.8,5386.9],
  rev: [4.57,22.64,67.04], ebitda: [-0.21,13.18,49.95],
  ebitdaMargin: [-4.6,58.2,74.5], grossMargin: [74.8,87.6,91.8],
};

interface PipelineStep { n: string; t: string; c: string; }
const PIPELINE: PipelineStep[] = [
  { n:"01", t:"Asset Submission",      c:G },
  { n:"02", t:"Documentation Review",  c:G },
  { n:"03", t:"Legal Verification",    c:G },
  { n:"04", t:"Custody Confirmation",  c:B },
  { n:"05", t:"Auditor Sign-Off",       c:B },
  { n:"06", t:"On-Chain Attestation",  c:A },
  { n:"07", t:"Collateral Activation", c:A },
  { n:"08", t:"Borrow / Finance",      c:G },
];

interface Finding { n: string; c: string; t: string; d: string; }
const KEY_FINDINGS: Finding[] = [
  { n:"01", c:G, t:"Asset value is the single most leveraged variable.",
    d:"Doubling average asset value from $1.5M to $3M has more impact on economics than doubling asset count. Verification cost is per-asset, not per-dollar." },
  { n:"02", c:G, t:"Recurring AUM fees are the long-term value driver.",
    d:"Platform fees compound annually with AUM retention. By Year 3, large-asset path generates $27M in platform fees alone." },
  { n:"03", c:G, t:"Margin expansion is structural, not cyclical.",
    d:"Large-asset path reaches 74.5% EBITDA margins in Year 3. Operating leverage is inherent to the model." },
  { n:"04", c:A, t:"Hybrid sourcing balances credibility and economics.",
    d:"Showcase assets build proof and community trust. Revenue engine should be built on $10M+ institutional deals." },
  { n:"05", c:B, t:"Profitability timeline is 2+ years shorter on large-asset path.",
    d:"Near-breakeven in Year 1 (-4.6% EBITDA) and solidly profitable in Year 2 (+58.2%)." },
  { n:"06", c:G, t:"Verification capacity is the primary operational constraint.",
    d:"Small-asset path requires 50 analysts in Year 3 vs. 20 for the large-asset path — processing equivalent dollar volume." },
];

// ── Inline SVG bar chart ──────────────────────────────────────────────
interface BarDataPoint { label: string; [key: string]: number | string; }

function BarSVG({ data, keys, colors, height = 180 }: {
  data: BarDataPoint[]; keys: string[]; colors: string[]; height?: number;
}) {
  const W2 = 520; const H = height;
  const PAD = { top:10, right:8, bottom:36, left:44 };
  const cW = W2 - PAD.left - PAD.right;
  const cH = H  - PAD.top  - PAD.bottom;
  const allV = data.flatMap(d => keys.map(k => {
    const v = d[k]; return typeof v === "number" ? v : 0;
  }));
  const maxV = Math.max(...allV, 0);
  const minV = Math.min(...allV, 0);
  const range = (maxV - minV) || 1;
  const groupW = cW / data.length;
  const barW   = Math.min((groupW / keys.length) * 0.78, 32);
  const gOff   = (groupW - barW * keys.length) / 2;
  const yS = (v: number) => PAD.top + cH - ((v - minV) / range) * cH;
  const zY = yS(0);
  const ticks = [minV, minV+range/4, minV+range/2, minV+range*3/4, maxV]
    .map(t => Math.round(t * 10) / 10);

  return (
    <svg viewBox={`0 0 ${W2} ${H}`} style={{ width:"100%", height:"auto" }}>
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.left} x2={PAD.left+cW} y1={yS(t)} y2={yS(t)}
            stroke={BDR} strokeWidth="1"/>
          <text x={PAD.left-4} y={yS(t)+4} textAnchor="end"
            fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily={M}>
            {t >= 0 ? `$${t.toFixed(0)}M` : `($${Math.abs(t).toFixed(0)}M)`}
          </text>
        </g>
      ))}
      {minV < 0 && (
        <line x1={PAD.left} x2={PAD.left+cW} y1={zY} y2={zY}
          stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
      )}
      {data.map((d, gi) => (
        <g key={gi}>
          {keys.map((k, ki) => {
            const raw = d[k];
            const v   = typeof raw === "number" ? raw : 0;
            const x   = PAD.left + gi*groupW + gOff + ki*barW;
            const y   = v >= 0 ? yS(v) : zY;
            const h   = Math.max(Math.abs(yS(v) - zY), 1);
            return (
              <rect key={k} x={x} y={y} width={barW-1} height={h}
                fill={colors[ki]} opacity="0.85" rx="1"/>
            );
          })}
          <text x={PAD.left+gi*groupW+groupW/2} y={H-6}
            textAnchor="middle" fill="rgba(255,255,255,0.3)"
            fontSize="9" fontFamily={M}>
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── Primitives ────────────────────────────────────────────────────────
function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                   color:"rgba(255,255,255,0.22)", textTransform:"uppercase",
                   letterSpacing:"0.15em", marginBottom:"0.875rem" }}>
      {children}
    </div>
  );
}
function Divider() {
  return <div style={{ height:1, background:BDR, margin:"2.5rem 0" }}/>;
}
function SubNav({ tabs, active, onSelect, accent = B }: {
  tabs: { id: string; label: string; sub: string }[];
  active: string;
  onSelect: (id: string) => void;
  accent?: string;
}) {
  return (
    <div style={{ display:"flex", borderBottom:`1px solid ${BDR}`,
                   background:CARD, overflowX:"auto" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onSelect(t.id)} style={{
          padding:"0.7rem clamp(0.75rem,2vw,1.5rem)",
          background:"transparent", border:"none",
          borderBottom:`2px solid ${active === t.id ? accent : "transparent"}`,
          fontFamily:M, fontSize:"clamp(0.28rem,0.9vw,0.36rem)", fontWeight:700,
          color: active === t.id ? accent : "rgba(255,255,255,0.25)",
          cursor:"pointer", textTransform:"uppercase",
          letterSpacing:"0.1em", whiteSpace:"nowrap",
          flexShrink:0, transition:"all 0.15s",
        }}>
          {t.label}
          <span style={{ display:"block", fontSize:"0.26rem",
                          color:"rgba(255,255,255,0.15)", fontWeight:400,
                          letterSpacing:"0.05em", marginTop:1 }}>
            {t.sub}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── OVERVIEW ─────────────────────────────────────────────────────────
function OverviewTab({ goTo }: { goTo: (t: Tab) => void }) {
  const [scenario, setScenario] = useState<"small" | "large">("large");
  const SC: ScenarioData = scenario === "small" ? SMALL : LARGE;

  const ebitdaData: BarDataPoint[] = [
    { label:"Year 1", small:-5.19, large:-0.21 },
    { label:"Year 2", small:-6.87, large:13.18 },
    { label:"Year 3", small:-3.20, large:49.95 },
  ];

  return (
    <div style={{ maxWidth:1060, margin:"0 auto",
                   padding:"2.5rem clamp(1rem,3vw,2rem) 5rem" }}>

      {/* Positioning */}
      <div style={{ marginBottom:"2.5rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:`${G}70`,
                       textTransform:"uppercase", letterSpacing:"0.2em",
                       marginBottom:"0.75rem" }}>
          ABRAXAS PROTOCOL · SOLANA
        </div>
        <h1 style={{ fontFamily:S, fontSize:"clamp(1.6rem,4.5vw,3.2rem)",
                      fontWeight:800, color:W, margin:"0 0 1rem",
                      letterSpacing:"-0.03em", lineHeight:1.08 }}>
          Verification first.<br/>
          <span style={{ color:G }}>Financeability second.</span>
        </h1>
        <p style={{ fontFamily:S, fontSize:"clamp(0.8rem,1.8vw,1rem)",
                     color:"rgba(255,255,255,0.32)", lineHeight:1.8,
                     maxWidth:580, margin:"0 0 0.875rem" }}>
          Most RWA projects tokenize first and verify never.
          Abraxas does the opposite — rigorous legal, custodial,
          and audit verification before anything is issued on-chain.
          The result: collateral that lenders can actually trust.
        </p>

        {/* Trust badges */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem", marginBottom:"1.25rem" }}>
          {[
            { t:"Legal Review",        c:G },
            { t:"Custody Verified",    c:G },
            { t:"Auditor Sign-Off",     c:G },
            { t:"On-Chain Attestation",c:B },
            { t:"Collateral Eligible", c:B },
          ].map(tag => (
            <span key={tag.t} style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                                        color:tag.c, background:`${tag.c}10`,
                                        border:`1px solid ${tag.c}25`, borderRadius:3,
                                        padding:"2px 8px", letterSpacing:"0.08em" }}>
              &#10003; {tag.t}
            </span>
          ))}
        </div>

        {/* Tribal sovereignty callout */}
        <div style={{ padding:"0.875rem 1.125rem", borderRadius:6,
                       border:`1px solid ${A}20`, background:`${A}04`,
                       marginBottom:"1.5rem", maxWidth:580 }}>
          <div style={{ fontFamily:M, fontSize:"0.28rem", fontWeight:700,
                         color:`${A}80`, textTransform:"uppercase",
                         letterSpacing:"0.15em", marginBottom:"0.35rem" }}>
            TRIBAL SOVEREIGNTY · NATURAL RESOURCE RECLAMATION
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.5vw,0.8rem)",
                         color:"rgba(255,255,255,0.38)", lineHeight:1.75 }}>
            McGirt v. Oklahoma reaffirmed sovereign Native land rights across
            half of Oklahoma — including jurisdiction over oil, gas, and mineral
            resources. Abraxas provides the verification infrastructure to bring
            these assets on-chain, preserving tribal sovereignty while unlocking
            institutional capital.
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
          <button onClick={() => goTo("terminal")} style={{
            padding:"0.875rem 1.75rem", borderRadius:6, border:"none",
            background:G, color:"#000", fontFamily:M, fontSize:"0.5rem",
            fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
            textTransform:"uppercase",
          }}>
            SUBMIT AN ASSET &#8594;
          </button>
          <button onClick={() => goTo("terminal")} style={{
            padding:"0.875rem 1.75rem", borderRadius:6,
            border:`1px solid ${B}40`, background:`${B}08`,
            color:B, fontFamily:M, fontSize:"0.5rem", fontWeight:700,
            cursor:"pointer", letterSpacing:"0.04em", textTransform:"uppercase",
          }}>
            VIEW TERMINAL &#8594;
          </button>
        </div>
      </div>

      <Divider/>

      {/* Economics */}
      <div style={{ marginBottom:"0.5rem" }}>
        <div style={{ display:"flex", alignItems:"baseline",
                       justifyContent:"space-between", marginBottom:"1.5rem",
                       flexWrap:"wrap", gap:"0.5rem" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center",
                           gap:"0.5rem", marginBottom:"0.4rem" }}>
              <SLabel>Platform Economics</SLabel>
              <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                              color:A, background:`${A}12`,
                              border:`1px solid ${A}25`, borderRadius:3,
                              padding:"1px 6px", textTransform:"uppercase",
                              letterSpacing:"0.1em" }}>
                PROJECTED · LARGE ASSET PATH
              </span>
            </div>
            <h2 style={{ fontFamily:S, fontSize:"clamp(1.2rem,3vw,1.9rem)",
                          fontWeight:800, color:W, margin:0,
                          letterSpacing:"-0.02em" }}>
              Built for recurring revenue, not token events.
            </h2>
          </div>
          <a href="/economics" style={{ fontFamily:M, fontSize:"0.34rem",
                                          color:`${B}60`, textDecoration:"none",
                                          flexShrink:0 }}>
            Full model &#8594;
          </a>
        </div>
        <p style={{ fontFamily:S, fontSize:"clamp(0.78rem,1.5vw,0.9rem)",
                     color:"rgba(255,255,255,0.3)", lineHeight:1.85,
                     maxWidth:580, margin:"0 0 2rem" }}>
          Abraxas generates revenue at verification and tokenization (one-time),
          then recurring platform fees on AUM and lending spreads.
          The recurring streams scale with collateral growth without
          proportional cost increases.
        </p>
      </div>

      {/* Revenue streams */}
      <div style={{ marginBottom:"2rem" }}>
        <SLabel>Revenue Architecture</SLabel>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                       gap:"1px", border:`1px solid ${BDR}`,
                       borderRadius:8, overflow:"hidden" }}>
          {[
            { icon:"&#9673;", color:B,        title:"Verification",  rate:"0.50%", basis:"asset value",  kind:"One-time"  },
            { icon:"&#9672;", color:"#8B5CF6", title:"Tokenization",  rate:"0.25%", basis:"asset value",  kind:"One-time"  },
            { icon:"&#9670;", color:G,         title:"Platform AUM",  rate:"0.75%", basis:"annual AUM",   kind:"Recurring" },
            { icon:"&#11041;",color:A,         title:"Lending Spread",rate:"1.50%", basis:"loan volume",  kind:"Recurring" },
          ].map(r => (
            <div key={r.title} style={{ background:CARD, padding:"1rem",
                                          borderTop:`2px solid ${r.color}` }}>
              <div style={{ display:"flex", alignItems:"center",
                             gap:"0.35rem", marginBottom:"0.5rem" }}>
                <span style={{ color:r.color, fontSize:"0.55rem"
                  }} dangerouslySetInnerHTML={{ __html: r.icon }}/>
                <span style={{ fontFamily:M, fontSize:"0.38rem",
                                fontWeight:700, color:W }}>{r.title}</span>
              </div>
              <div style={{ fontFamily:M, fontSize:"clamp(0.8rem,2vw,1.1rem)",
                             fontWeight:900, color:r.color }}>{r.rate}</div>
              <div style={{ fontFamily:M, fontSize:"0.26rem",
                             color:"rgba(255,255,255,0.2)",
                             marginBottom:"0.4rem" }}>
                of {r.basis}
              </div>
              <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                              color:r.kind === "Recurring" ? G : A,
                              background:r.kind === "Recurring" ? `${G}12` : `${A}12`,
                              border:`1px solid ${r.kind === "Recurring" ? G : A}25`,
                              borderRadius:3, padding:"1px 5px",
                              textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {r.kind}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario analysis */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"center",
                       justifyContent:"space-between",
                       marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem" }}>
          <SLabel>Scenario Analysis</SLabel>
          <div style={{ display:"flex", gap:"0.4rem" }}>
            {(["small", "large"] as Array<"small" | "large">).map(k => (
              <button key={k} onClick={() => setScenario(k)} style={{
                padding:"0.3rem 0.75rem", borderRadius:4, cursor:"pointer",
                border:`1px solid ${scenario === k ? (k === "small" ? A : G) : BDR}`,
                background: scenario === k ? `${k === "small" ? A : G}12` : CARD,
                color: scenario === k ? (k === "small" ? A : G) : "rgba(255,255,255,0.3)",
                fontFamily:M, fontSize:"0.32rem", fontWeight:700,
                textTransform:"uppercase", letterSpacing:"0.08em",
                transition:"all 0.15s",
              }}>
                {k === "small" ? "SMALL ($1-3M)" : "LARGE ($15-25M)"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)",
                       gap:"0.75rem", marginBottom:"1.25rem" }}>
          {[0, 1, 2].map(y => {
            const profit = SC.ebitda[y] > 0;
            const ebitdaVal = SC.ebitda[y];
            const ebitdaStr = ebitdaVal < 0
              ? `($${Math.abs(ebitdaVal).toFixed(2)}M)`
              : `$${ebitdaVal.toFixed(2)}M`;
            return (
              <div key={y} style={{ background:CARD,
                                      border:`1px solid ${BDR}`,
                                      borderTop:`2px solid ${profit ? G : "#EF4444"}`,
                                      borderRadius:7, padding:"1rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.3rem",
                               color:"rgba(255,255,255,0.2)",
                               textTransform:"uppercase", letterSpacing:"0.1em",
                               marginBottom:"0.75rem" }}>
                  YEAR {y + 1}
                </div>
                {[
                  { l:"Assets Verified",  v:`${SC.assets[y]}`,                              vc:"" },
                  { l:"Tokenized AUM",    v:`$${SC.aum[y].toFixed(0)}M`,                    vc:"" },
                  { l:"Total Revenue",    v:`$${SC.rev[y].toFixed(2)}M`,                    vc:"" },
                  { l:"Gross Margin",     v:`${SC.grossMargin[y].toFixed(1)}%`,              vc:SC.grossMargin[y] > 0 ? G : "#EF4444" },
                  { l:"EBITDA",           v:ebitdaStr,                                       vc:profit ? G : "#EF4444" },
                  { l:"EBITDA Margin",    v:`${SC.ebitdaMargin[y].toFixed(1)}%`,             vc:profit ? G : "#EF4444" },
                ].map(row => (
                  <div key={row.l} style={{ display:"flex",
                                             justifyContent:"space-between",
                                             padding:"0.3rem 0",
                                             borderBottom:`1px solid ${BDR}` }}>
                    <span style={{ fontFamily:S, fontSize:"0.62rem",
                                    color:"rgba(255,255,255,0.35)" }}>
                      {row.l}
                    </span>
                    <span style={{ fontFamily:M, fontSize:"0.58rem",
                                    fontWeight:700,
                                    color:row.vc || W }}>
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* EBITDA chart */}
        <div style={{ background:CARD, border:`1px solid ${BDR}`,
                       borderRadius:7, padding:"1.25rem" }}>
          <div style={{ fontFamily:M, fontSize:"0.3rem",
                         color:"rgba(255,255,255,0.2)",
                         textTransform:"uppercase", letterSpacing:"0.1em",
                         marginBottom:"0.875rem" }}>
            EBITDA TRAJECTORY ($M) — SMALL vs. LARGE ASSET PATH
          </div>
          <BarSVG data={ebitdaData} keys={["small","large"]}
                  colors={[A, G]} height={180}/>
          <div style={{ display:"flex", gap:"1rem", marginTop:"0.5rem" }}>
            {[{ c:A, l:"Small Assets" }, { c:G, l:"Large Assets" }].map(x => (
              <div key={x.l} style={{ display:"flex", alignItems:"center", gap:"0.3rem" }}>
                <div style={{ width:10, height:10, borderRadius:2,
                               background:x.c, opacity:0.85 }}/>
                <span style={{ fontFamily:M, fontSize:"0.3rem",
                                color:"rgba(255,255,255,0.3)" }}>{x.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key findings */}
      <div style={{ marginBottom:"2rem" }}>
        <SLabel>Key Findings</SLabel>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem" }}>
          {KEY_FINDINGS.map(f => (
            <div key={f.n} style={{ display:"grid",
                                      gridTemplateColumns:"48px 1fr",
                                      gap:"0.875rem", padding:"1rem 1.125rem",
                                      background:CARD,
                                      border:`1px solid ${BDR}`,
                                      borderLeft:`3px solid ${f.c}`,
                                      borderRadius:7, alignItems:"start" }}>
              <div style={{ fontFamily:M, fontSize:"clamp(0.9rem,2.5vw,1.4rem)",
                             fontWeight:900, color:`${f.c}20`, lineHeight:1 }}>
                {f.n}
              </div>
              <div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.78rem,1.8vw,0.92rem)",
                               fontWeight:700, color:W, marginBottom:"0.3rem" }}>
                  {f.t}
                </div>
                <div style={{ fontFamily:S, fontSize:"clamp(0.64rem,1.4vw,0.76rem)",
                               color:"rgba(255,255,255,0.32)", lineHeight:1.75 }}>
                  {f.d}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fee structure */}
      <div style={{ marginBottom:"2rem" }}>
        <SLabel>Fee Structure</SLabel>
        <div style={{ padding:"0.875rem 1.25rem", borderRadius:7,
                       border:`1px solid ${B}20`, background:`${B}04`,
                       marginBottom:"1rem", fontFamily:S,
                       fontSize:"clamp(0.68rem,1.4vw,0.78rem)",
                       color:"rgba(255,255,255,0.4)", lineHeight:1.75 }}>
          Platform fees are charged on verified AUM, not on token creation.
          This aligns Abraxas incentives with long-term collateral quality,
          not issuance volume.
        </div>
        <div style={{ border:`1px solid ${BDR}`, borderRadius:7, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 72px 88px 1fr",
                         padding:"0.6rem 1.25rem", borderBottom:`1px solid ${BDR}`,
                         background:"#111620", fontFamily:M, fontSize:"0.28rem",
                         color:"rgba(255,255,255,0.2)", textTransform:"uppercase",
                         letterSpacing:"0.1em" }}>
            <span>Fee Type</span>
            <span style={{ textAlign:"center" }}>Rate</span>
            <span style={{ textAlign:"center" }}>Structure</span>
            <span>Basis</span>
          </div>
          {[
            { t:"Verification Fee",  r:"0.50%", k:"One-time",  b:"Asset value at onboarding",  kc:A },
            { t:"Tokenization Fee",  r:"0.25%", k:"One-time",  b:"Asset value at issuance",    kc:A },
            { t:"Platform Fee",      r:"0.75%", k:"Recurring", b:"Average AUM per annum",      kc:G },
            { t:"Lending Take Rate", r:"1.50%", k:"Recurring", b:"Total loan volume originated",kc:G },
          ].map((row, i) => (
            <div key={row.t} style={{ display:"grid",
                                       gridTemplateColumns:"1fr 72px 88px 1fr",
                                       padding:"0.75rem 1.25rem", alignItems:"center",
                                       borderBottom:i < 3 ? `1px solid ${BDR}` : "none",
                                       background:i % 2 === 0 ? CARD : "transparent" }}>
              <span style={{ fontFamily:S, fontSize:"0.76rem",
                              fontWeight:600, color:W }}>{row.t}</span>
              <span style={{ fontFamily:M, fontSize:"0.7rem", fontWeight:700,
                              color:G, textAlign:"center" }}>{row.r}</span>
              <span style={{ fontFamily:M, fontSize:"0.3rem", color:row.kc,
                              background:`${row.kc}10`, border:`1px solid ${row.kc}25`,
                              borderRadius:3, padding:"2px 5px", display:"inline-block",
                              textAlign:"center", textTransform:"uppercase",
                              letterSpacing:"0.06em" }}>{row.k}</span>
              <span style={{ fontFamily:S, fontSize:"0.7rem",
                              color:"rgba(255,255,255,0.3)" }}>{row.b}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"center",
                       gap:"0.625rem", marginBottom:"0.875rem" }}>
          <SLabel>Collateral Activation Pipeline</SLabel>
          <div style={{ width:6, height:6, borderRadius:"50%", background:G,
                         boxShadow:`0 0 6px ${G}80`, flexShrink:0 }}/>
          <span style={{ fontFamily:M, fontSize:"0.26rem",
                          color:`${G}70`, letterSpacing:"0.1em" }}>
            ACTIVE
          </span>
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                       gap:"0.5rem" }}>
          {PIPELINE.map(s => (
            <div key={s.n} style={{ background:CARD, border:`1px solid ${BDR}`,
                                      borderLeft:`2px solid ${s.c}`, borderRadius:6,
                                      padding:"0.75rem 1rem", display:"flex",
                                      alignItems:"center", gap:"0.625rem" }}>
              <span style={{ fontFamily:M,
                              fontSize:"clamp(0.7rem,1.8vw,0.88rem)",
                              fontWeight:900, color:`${s.c}25`,
                              flexShrink:0, width:28 }}>{s.n}</span>
              <span style={{ fontFamily:S,
                              fontSize:"clamp(0.62rem,1.5vw,0.74rem)",
                              fontWeight:600,
                              color:"rgba(255,255,255,0.5)" }}>{s.t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tribal sovereign assets */}
      <div style={{ marginBottom:"1.25rem", padding:"1.5rem", borderRadius:8,
                     border:`1px solid ${A}25`, background:`${A}04` }}>
        <div style={{ fontFamily:M, fontSize:"0.28rem", color:`${A}70`,
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"0.35rem" }}>
          SOVEREIGN ASSET CLASSES · TRIBAL NATIONS
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1rem)",
                       fontWeight:700, color:W, marginBottom:"0.3rem" }}>
          McGirt v. Oklahoma — Land, Minerals &amp; Resources
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(0.64rem,1.4vw,0.76rem)",
                       color:"rgba(255,255,255,0.35)", lineHeight:1.7,
                       maxWidth:540, marginBottom:"0.875rem" }}>
          The Supreme Court reaffirmed tribal sovereignty over roughly half
          of Oklahoma — including jurisdiction over oil, gas, and mineral
          resources. Abraxas is building the verification infrastructure to
          bring these assets on-chain while preserving sovereign governance,
          legal compliance, and tribal control.
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
          {[
            "Mineral Rights (Oil & Gas)",
            "Tribal Land Title",
            "Working Interests",
            "Timber & Conservation",
            "Water Rights",
            "Carbon Credits / REC",
          ].map(a => (
            <span key={a} style={{ fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                                    color:A, background:`${A}10`,
                                    border:`1px solid ${A}20`,
                                    borderRadius:3, padding:"2px 8px",
                                    letterSpacing:"0.06em" }}>
              {a}
            </span>
          ))}
        </div>
      </div>

      {/* Investor disclosure */}
      <div style={{ marginBottom:"2rem", padding:"1.5rem", background:CARD,
                     border:`1px solid ${BDR}`, borderRadius:7 }}>
        <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                       textTransform:"uppercase", letterSpacing:"0.15em",
                       marginBottom:"0.75rem" }}>
          Investor Disclosure
        </div>
        <p style={{ fontFamily:S, fontSize:"clamp(0.68rem,1.4vw,0.8rem)",
                     color:"rgba(255,255,255,0.28)", lineHeight:1.9, margin:0 }}>
          These projections are illustrative and based on current fee structures,
          assumed onboarding velocity, modeled verification capacity, and projected
          AUM retention rates. Actual results will vary. Neither scenario constitutes
          a guarantee of future performance. This material is for informational
          purposes only.
        </p>
      </div>

      {/* Genesis callout */}
      <div style={{ padding:"1.375rem 1.5rem", borderRadius:8,
                     border:`1px solid ${G}25`, background:`${G}05`,
                     display:"flex", justifyContent:"space-between",
                     alignItems:"center", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <div style={{ fontFamily:M, fontSize:"0.28rem", color:`${G}60`,
                         textTransform:"uppercase", letterSpacing:"0.12em",
                         marginBottom:"0.3rem" }}>
            GENESIS ASSET · AAS-1 VERIFIED · SERIES A
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.8rem,2vw,1rem)",
                         fontWeight:700, color:W }}>
            Cielo Sunrise — $1,100,000 · Mineral Bluff, Georgia
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.62rem,1.3vw,0.74rem)",
                         color:"rgba(255,255,255,0.28)", marginTop:"0.2rem" }}>
            89/100 collateral score · $660K max borrow · 5.0 stars · AAS-1 certified
          </div>
        </div>
        <button onClick={() => goTo("terminal")} style={{
          padding:"0.625rem 1.25rem", borderRadius:5,
          border:`1px solid ${G}40`, background:`${G}08`,
          fontFamily:M, fontSize:"0.38rem", fontWeight:700,
          color:G, cursor:"pointer", textTransform:"uppercase",
          letterSpacing:"0.06em", whiteSpace:"nowrap",
        }}>
          INSPECT ASSET &#8594;
        </button>
      </div>
    </div>
  );
}

// ── TERMINAL WORKSPACE ────────────────────────────────────────────────
function TerminalWorkspace() {
  const [view, setView] = useState<WView>("featured");

  const VIEWS = [
    { id:"featured"   as WView, label:"GENESIS ASSET",   sub:"Cielo Sunrise · Series A",  accent:B },
    { id:"registry"   as WView, label:"ASSET REGISTRY",  sub:"Inspector · On-chain",       accent:B },
    { id:"onboarding" as WView, label:"SUBMIT AN ASSET", sub:"Owner onboarding",           accent:G },
    { id:"trust"      as WView, label:"TRUST LAYER",     sub:"Verification architecture",  accent:G },
  ];

  return (
    <div>
      <div style={{ display:"flex", borderBottom:`1px solid ${BDR}`,
                     background:CARD, overflowX:"auto" }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            padding:"0.7rem clamp(0.75rem,2vw,1.5rem)",
            background:"transparent", border:"none",
            borderBottom:`2px solid ${view === v.id ? v.accent : "transparent"}`,
            fontFamily:M, fontSize:"clamp(0.28rem,0.9vw,0.36rem)", fontWeight:700,
            color: view === v.id ? v.accent : "rgba(255,255,255,0.25)",
            cursor:"pointer", textTransform:"uppercase",
            letterSpacing:"0.1em", whiteSpace:"nowrap",
            flexShrink:0, transition:"all 0.15s",
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
      {view === "featured"   && <FlagshipAssetPage />}
      {view === "registry"   && <TerminalLayout />}
      {view === "onboarding" && (
        <AssetOwnerOnboarding onEnterTerminal={() => setView("trust")} />
      )}
      {view === "trust" && <TrustStack />}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────
export default function TerminalPage() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div style={{ background:BG, minHeight:"100vh",
                   display:"flex", flexDirection:"column" }}>

      {/* Protocol status strip */}
      <div style={{ background:"#060810", borderBottom:"1px solid #0F1929",
                     padding:"0 clamp(0.75rem,2.5vw,1.5rem)",
                     height:28, display:"flex", alignItems:"center",
                     gap:"1.5rem", overflowX:"auto", flexShrink:0 }}>
        {[
          { dot:G, text:"SOLANA MAINNET" },
          { dot:G, text:"AAS-1 PROTOCOL ACTIVE" },
          { dot:A, text:"VERIFICATION NETWORK v1.0" },
          { dot:B, text:"COLLATERAL TERMINAL" },
          { dot:A, text:"TRIBAL SOVEREIGNTY · RESOURCE TOKENIZATION" },
        ].map(s => (
          <div key={s.text} style={{ display:"flex", alignItems:"center",
                                      gap:"0.35rem", flexShrink:0 }}>
            <div style={{ width:5, height:5, borderRadius:"50%",
                           background:s.dot,
                           boxShadow:`0 0 5px ${s.dot}80` }}/>
            <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                            color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em",
                            textTransform:"uppercase" }}>
              {s.text}
            </span>
          </div>
        ))}
        <div style={{ flex:1 }}/>
        <span style={{ fontFamily:M, fontSize:"0.26rem",
                        color:"rgba(255,255,255,0.15)", letterSpacing:"0.1em" }}>
          ABRAXAS OS · BUILD 2025.1
        </span>
      </div>

      {/* Nav */}
      <nav style={{ position:"sticky", top:28, zIndex:200,
                     background:"rgba(10,12,16,0.97)", backdropFilter:"blur(12px)",
                     borderBottom:`1px solid ${BDR}`, display:"flex", alignItems:"center",
                     padding:"0 clamp(0.75rem,2.5vw,1.5rem)",
                     height:"clamp(46px,6vw,54px)",
                     gap:"clamp(0.25rem,1vw,0.5rem)",
                     flexWrap:"nowrap", overflowX:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.375rem",
                       flexShrink:0, marginRight:"clamp(0.375rem,1.5vw,1rem)" }}>
          <span style={{ color:G, fontSize:"clamp(0.7rem,2vw,0.9rem)" }}>&#9672;</span>
          <div>
            <span style={{ fontFamily:M, fontSize:"clamp(0.5rem,1.5vw,0.7rem)",
                            fontWeight:900, color:W, letterSpacing:"0.1em" }}>
              ABRAXAS
            </span>
            <span style={{ fontFamily:M, fontSize:"0.24rem",
                            color:"rgba(255,255,255,0.2)", letterSpacing:"0.15em",
                            marginLeft:"0.375rem", verticalAlign:"middle" }}>
              PROTOCOL OS
            </span>
          </div>
        </div>

        {([
          { id:"overview" as Tab,  label:"OVERVIEW"  },
          { id:"terminal" as Tab,  label:"TERMINAL"  },
          { id:"lending"  as Tab,  label:"LENDING"   },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"0.25rem clamp(0.4rem,1.2vw,0.75rem)", borderRadius:4,
            border:`1px solid ${tab === t.id ? `${G}50` : BDR}`,
            background: tab === t.id ? `${G}10` : "transparent",
            color: tab === t.id ? G : "rgba(255,255,255,0.28)",
            fontFamily:M, fontSize:"clamp(0.28rem,0.85vw,0.36rem)",
            fontWeight:700, cursor:"pointer", textTransform:"uppercase",
            letterSpacing:"0.1em", whiteSpace:"nowrap", flexShrink:0,
            transition:"all 0.15s",
          }}>
            {t.label}
          </button>
        ))}

        <div style={{ flex:1 }}/>
        <LanguageSelector/>
        <CompactWallet/>
      </nav>

      {/* Content */}
      <div style={{ flex:1 }}>
        {tab === "overview"  && <OverviewTab goTo={setTab}/>}
        {tab === "terminal"  && <TerminalWorkspace/>}
        {tab === "lending"   && (
          <div style={{ maxWidth:1060, margin:"0 auto",
                         padding:"2rem clamp(1rem,3vw,2rem) 5rem" }}>
            <BorrowPage/>
          </div>
        )}
      </div>
    </div>
  );
}
