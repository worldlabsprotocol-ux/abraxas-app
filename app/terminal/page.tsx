"use client";
// FILE: app/terminal/page.tsx
// Abraxas — Ownership Infrastructure for Real-World Assets
// Architecture: TERMINAL (primary, scrolling) + LENDING (external). Two tabs.
// Command terminal anchors the experience; protocol stack, economics,
// registry, verticals all unified in one cohesive surface.

import { useState }             from "react";
import Image                    from "next/image";
import { FlagshipAssetPage }    from "@/components/assets/FlagshipAssetPage";
import { AssetOwnerOnboarding } from "@/components/onboarding/AssetOwnerOnboarding";
import { TrustStack }           from "@/components/onboarding/TrustStack";
import { CompactWallet }        from "@/components/CompactWallet";
import { LanguageSelector }     from "@/components/LanguageSelector";
import { VerificationTerminal } from "@/components/vos/VerificationTerminal";
import { ExplainerCarousel }    from "@/components/ExplainerCarousel";
import { TokenizationRequestModal } from "@/components/TokenizationRequestModal";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#0A0C10";
const CARD = "#0D1117";
const BDR  = "#1C2333";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const W    = "#F8FAFC";

type Tab   = "terminal" | "lending";
type Deep  = "main" | "asset" | "registry" | "submit" | "trust";

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
  const barW = Math.min((groupW / keys.length) * 0.78, 32);
  const gOff = (groupW - barW * keys.length) / 2;
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.625rem",
      marginBottom: "1.125rem",
    }}>
      <div style={{ width: 3, height: 15, background: G, borderRadius: 2,
                     boxShadow: `0 0 6px ${G}60` }}/>
      <span style={{
        fontFamily: M, fontSize: "clamp(0.78rem,1.8vw,0.92rem)", fontWeight: 800,
        color: G, letterSpacing: "0.16em", textTransform: "uppercase",
      }}>
        {children}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height:1, background:BDR, margin:"1.5rem 0" }}/>;
}




// ── TERMINAL — primary unified experience ────────────────────────────
function TerminalTab() {
  const [deep, setDeep] = useState<Deep>("main");
  const [scenario, setScenario] = useState<"small" | "large">("large");
  const [wyOpen, setWyOpen] = useState(false);
  const [initialTier, setInitialTier] = useState<"starter"|"growth"|"enterprise"|null>(null);
  const SC: ScenarioData = scenario === "small" ? SMALL : LARGE;

  const ebitdaData: BarDataPoint[] = [
    { label:"Year 1", small:-5.19, large:-0.21 },
    { label:"Year 2", small:-6.87, large:13.18 },
    { label:"Year 3", small:-3.20, large:49.95 },
  ];

  // Deep views: focused single-asset/single-flow pages
  if (deep === "asset")    return <DeepView onBack={() => setDeep("main")}><FlagshipAssetPage /></DeepView>;
  if (deep === "registry") return (
    <DeepView onBack={() => setDeep("main")}>
      <div style={{ padding: "2rem", fontFamily: "'JetBrains Mono',monospace",
                     color: "#F8FAFC", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ fontSize: "0.7rem", color: "#10B981", fontWeight: 700,
                       textTransform: "uppercase", letterSpacing: "0.2em",
                       marginBottom: "1.5rem" }}>
          ABRAXAS REGISTRY · VERIFIED ASSETS
        </div>
        <div style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", fontWeight: 800,
                       color: "#F8FAFC", marginBottom: "0.92rem",
                       fontFamily: "Georgia,serif" }}>
          Ownership Infrastructure for<br/>Real-World Assets.
        </div>
        <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.5)",
                     lineHeight: 1.8, maxWidth: 560, marginBottom: "1.5rem" }}>
          Abraxas Protocol maintains an append-only registry of verified
          real-world assets. Each entry is backed by legal review, independent
          appraisal, and on-chain attestation.
        </p>
        <div style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)",
                       borderRadius: 8, padding: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                         gap: "1px", background: "#1C2333", borderRadius: 4,
                         overflow: "hidden", marginBottom: "1.5rem" }}>
            {[["Verified Properties","1"],["Pending Verification","0"],["Total AUM","$1.1M"],
              ["Avg Collateral Score","89/100"]].map(([k,v]) => (
              <div key={k} style={{ background: "#0D1117", padding: "0.92rem" }}>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.3)",
                               textTransform: "uppercase", letterSpacing: "0.12em",
                               marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 900,
                               color: "#10B981" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)",
                         marginBottom: "0.7rem", letterSpacing: "0.1em",
                         textTransform: "uppercase" }}>
            AAS-1 · GENESIS ASSET
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: "1.1rem",
                         fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>
            Cielo Sunrise — Mountain Wellness Retreat
          </div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            Mineral Bluff, Georgia · $1,100,000 appraised · 89/100 collateral score ·
            96% verification confidence · $660K max borrow capacity
          </div>
        </div>
      </div>
    </DeepView>
  );
  if (deep === "submit")   return <DeepView onBack={() => setDeep("main")}><AssetOwnerOnboarding onEnterTerminal={() => setDeep("main")} /></DeepView>;
  if (deep === "trust")    return <DeepView onBack={() => setDeep("main")}><TrustStack /></DeepView>;

  return (
    <div>
      {/* Tokenization Request modal (Supabase-backed) */}
      <TokenizationRequestModal
        open={wyOpen}
        initialTier={initialTier}
        onClose={() => { setWyOpen(false); setInitialTier(null); }}
      />

      {/* ── 0. INLINE EXPLAINER — first-visit context ─────────────── */}
      <ExplainerCarousel />
      {/* ── 1. WYOMING LLC — primary revenue funnel ─────────────────── */}
      <div style={{ maxWidth: 1060, margin: "0 auto",
                     padding: "1rem clamp(0.75rem,2.5vw,1.5rem) 0.75rem" }}>
        {/* ── WYOMING LLC ENGINE ─────────────────────────────────── */}
        <div style={{ marginBottom: "1.25rem" }}>
          <Label>Wyoming LLC Formation</Label>
          <div style={{ padding: "1rem 1.125rem", borderRadius: 8,
                         background: "linear-gradient(135deg, rgba(59,130,246,0.07), rgba(139,92,246,0.04))",
                         border: `1px solid ${B}25` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                           marginBottom: "0.625rem" }}>
              <div style={{ padding: "0.25rem 0.625rem", borderRadius: 3,
                             background: `${B}18`, border: `1px solid ${B}35`,
                             fontFamily: M, fontSize: "0.6rem", fontWeight: 900,
                             color: B, letterSpacing: "0.12em",
                             textTransform: "uppercase" }}>
                TOKENIZE YOUR BUSINESS
              </div>
            </div>
            <h2 style={{ fontFamily: S, fontSize: "clamp(0.95rem,2.5vw,1.35rem)",
                          fontWeight: 800, color: W, margin: "0 0 0.375rem",
                          letterSpacing: "-0.01em" }}>
              Launch your business on-chain.
            </h2>
            <p style={{ fontFamily: S, fontSize: "0.78rem",
                         color: "rgba(255,255,255,0.4)", lineHeight: 1.6,
                         maxWidth: 560, margin: "0 0 1rem" }}>
              Wyoming LLC for on-chain ownership, governance, fundraising, and lending.
            </p>
            {/* Horizontal scroll on mobile — no stacking */}
            <div style={{
              display: "flex", gap: "0.625rem", marginBottom: "1rem",
              overflowX: "auto", paddingBottom: "0.25rem",
              /* allow cards to scroll but not shrink below min width */
              scrollSnapType: "x mandatory",
            }}>
              {([
                { id: "starter"    as const, tier: "STARTER",    price: "$1,499",  color: B,         items: ["Wyoming LLC Formation","Operating Agreement","On-chain Token","V5 Verification"] },
                { id: "growth"     as const, tier: "GROWTH",     price: "$2,999",  color: "#8B5CF6", items: ["Everything in Starter","Multi-sig Governance","Cap Table Mgmt","Lending Eligible"] },
                { id: "enterprise" as const, tier: "ENTERPRISE", price: "$4,999",  color: G,         items: ["Everything in Growth","Compliance Package","Priority 24h","Dedicated Verifier"] },
              ]).map(pkg => (
                <div key={pkg.tier} style={{
                  minWidth: 200, flex: "0 0 200px",
                  padding: "0.875rem", borderRadius: 6,
                  background: CARD,
                  border: `1px solid ${pkg.color}25`,
                  borderTop: `2px solid ${pkg.color}`,
                  display: "flex", flexDirection: "column",
                  scrollSnapAlign: "start",
                }}>
                  <div style={{ fontFamily: M, fontSize: "0.62rem", fontWeight: 900,
                                 color: pkg.color, letterSpacing: "0.1em",
                                 marginBottom: "0.2rem" }}>
                    {pkg.tier}
                  </div>
                  <div style={{ fontFamily: M, fontSize: "1.05rem", fontWeight: 900,
                                 color: W, marginBottom: "0.5rem" }}>
                    {pkg.price}
                  </div>
                  <div style={{ flex: 1, marginBottom: "0.625rem" }}>
                    {pkg.items.map(item => (
                      <div key={item} style={{ display: "flex", gap: "0.4rem",
                                                alignItems: "flex-start", marginBottom: 3 }}>
                        <span style={{ color: pkg.color, fontSize: "0.6rem",
                                        flexShrink: 0, marginTop: 2 }}>◉</span>
                        <span style={{ fontFamily: S, fontSize: "0.72rem",
                                        color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setInitialTier(pkg.id); setWyOpen(true); }}
                    style={{
                      width: "100%", padding: "0.5rem 0.625rem", borderRadius: 4,
                      border: `1px solid ${pkg.color}55`,
                      background: `${pkg.color}12`,
                      color: pkg.color, fontFamily: M, fontSize: "0.68rem",
                      fontWeight: 900, cursor: "pointer",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                    }}>
                    SELECT →
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={() => { setInitialTier(null); setWyOpen(true); }} style={{
                padding: "0.55rem 1.125rem", borderRadius: 5, border: "none",
                background: G, color: "#000", fontFamily: M, fontSize: "0.78rem",
                fontWeight: 900, cursor: "pointer", letterSpacing: "0.05em",
                textTransform: "uppercase", boxShadow: `0 0 12px ${G}45`,
              }}>
                START TOKENIZATION NOW →
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%",
                               background: G, boxShadow: `0 0 4px ${G}90` }}/>
                <span style={{ fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                                color: G, letterSpacing: "0.08em",
                                textTransform: "uppercase" }}>
                  Available now · Abraxas V5
                </span>
              </div>
            </div>
            {/* Promotional value-prop block */}
            <div style={{ marginTop: "1.5rem", padding: "1.125rem 1.25rem",
                           background: `${G}06`, border: `1px solid ${G}25`,
                           borderRadius: 7 }}>
              <div style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                             color: G, textTransform: "uppercase",
                             letterSpacing: "0.15em", marginBottom: "0.625rem" }}>
                WHY TOKENIZE YOUR BUSINESS WITH ABRAXAS
              </div>
              <div style={{ display: "grid",
                             gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                             gap: "0.7rem" }}>
                {[
                  { t: "Same-day initiation", d: "Wyoming LLC formation starts immediately on submission. Asset enters the V5 verification pipeline within minutes." },
                  { t: "Full lifecycle visibility", d: "Track all 10 stages: identity, ownership, legal, due diligence, risk scoring, committee approval, mint, marketplace." },
                  { t: "Native to Solana", d: "Token-2022 standard. Operating agreement anchored on-chain. Cap table maintained natively." },
                  { t: "Lending eligible", d: "Once MARKETPLACE_LIVE, your business becomes financeable collateral at up to 60% LTV." },
                ].map(b => (
                  <div key={b.t} style={{ fontFamily: S }}>
                    <div style={{ fontSize: "0.72rem",
                                   fontWeight: 700, color: W, marginBottom: 3 }}>
                      &#10003; {b.t}
                    </div>
                    <div style={{ fontSize: "0.7rem",
                                   color: "rgba(255,255,255,0.4)", lineHeight: 1.55 }}>
                      {b.d}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


      </div>


      {/* ── 1. COMMAND TERMINAL ──────────────────────────────────── */}
      {/* Height-isolated. min 360px so it's always usable on mobile. */}
      <div style={{
        height: "clamp(360px, 52vh, 620px)",
        borderBottom: `1px solid ${BDR}`,
        overflow: "hidden",
        position: "relative",
        isolation: "isolate",
      }}>
        <VerificationTerminal />
      </div>

      {/* ── 2. POSITIONING ─────────────────────────────────────────── */}
      <div style={{ maxWidth: 1060, margin: "0 auto",
                     padding: "2rem clamp(0.875rem,2.5vw,1.5rem) 0" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: M, fontSize: "0.7rem", color: `${G}80`,
                         textTransform: "uppercase", letterSpacing: "0.2em",
                         marginBottom: "0.7rem" }}>
            ABRAXAS PROTOCOL · SOLANA
          </div>
          <h1 style={{ fontFamily: S, fontSize: "clamp(1.6rem,4.5vw,3rem)",
                        fontWeight: 800, color: W, margin: "0 0 1rem",
                        letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Ownership infrastructure<br/>
            <span style={{ color: G }}>for real-world assets.</span>
          </h1>
          <p style={{ fontFamily: S, fontSize: "clamp(0.8rem,1.8vw,1rem)",
                       color: "rgba(255,255,255,0.4)", lineHeight: 1.8,
                       maxWidth: 620, margin: "0 0 1.5rem" }}>
            Most projects tokenize first and verify never. Abraxas does the
            opposite — rigorous legal, custodial, and audit verification before
            anything is issued on-chain. The result is collateral that lenders
            can underwrite and communities can actually own.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.92rem",
                         marginBottom: "1.5rem" }}>
            {[
              { t: "Legal Review",         c: G },
              { t: "Custody Verified",     c: G },
              { t: "Auditor Sign-Off",      c: G },
              { t: "Reg A / D / CF Ready", c: B },
              { t: "On-Chain Attestation", c: B },
            ].map(tag => (
              <span key={tag.t} style={{ fontFamily: M, fontSize: "0.7rem",
                                          fontWeight: 700, color: tag.c,
                                          background: `${tag.c}10`,
                                          border: `1px solid ${tag.c}25`,
                                          borderRadius: 3, padding: "2px 8px",
                                          letterSpacing: "0.08em" }}>
                &#10003; {tag.t}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <button onClick={() => setDeep("submit")} style={{
              padding: "0.875rem 1.75rem", borderRadius: 6, border: "none",
              background: G, color: "#000", fontFamily: M, fontSize: "0.92rem",
              fontWeight: 900, cursor: "pointer", letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>SUBMIT AN ASSET &#8594;</button>
            <button onClick={() => setDeep("asset")} style={{
              padding: "0.875rem 1.75rem", borderRadius: 6,
              border: `1px solid ${B}40`, background: `${B}08`,
              color: B, fontFamily: M, fontSize: "0.92rem", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.04em", textTransform: "uppercase",
            }}>VIEW GENESIS ASSET &#8594;</button>
          </div>
        </div>

        <Divider/>

        {/* ── 3. PROTOCOL STACK — 5 layers ─────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Label>Protocol Architecture</Label>
          <h2 style={{ fontFamily: S, fontSize: "clamp(1.2rem,3vw,1.8rem)",
                        fontWeight: 800, color: W, margin: "0 0 0.75rem",
                        letterSpacing: "-0.02em" }}>
            Five layers. One protocol.
          </h2>
          <p style={{ fontFamily: S, fontSize: "clamp(0.74rem,1.5vw,0.86rem)",
                       color: "rgba(255,255,255,0.35)", lineHeight: 1.75,
                       maxWidth: 600, margin: "0 0 1.5rem" }}>
            Each layer compounds value. Assets flow up; ownership compounds across
            generations. Compliant by default, programmable by design.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.92rem" }}>
            {[
              { n: "L5", title: "Reinvestment Engine",
                desc: "Compounding ownership across generations",
                color: G,         intensity: 1.0 },
              { n: "L4", title: "Cash Flow & Governance",
                desc: "Distributions and participation rights to token holders",
                color: G,         intensity: 0.8 },
              { n: "L3", title: "Community Distribution",
                desc: "Ownership accessible at meaningful price points",
                color: A,         intensity: 0.85 },
              { n: "L2", title: "Regulated Tokenization",
                desc: "Compliant digital securities under Reg A, D, CF",
                color: A,         intensity: 0.7 },
              { n: "L1", title: "Asset Origination",
                desc: "Real-world assets structured into investment vehicles",
                color: B,         intensity: 0.6 },
            ].map(layer => (
              <div key={layer.n} style={{
                display: "grid", gridTemplateColumns: "60px 1fr",
                gap: "0.92rem", padding: "0.875rem 1.25rem",
                background: `${layer.color}${Math.round(layer.intensity * 16).toString(16).padStart(2, '0')}`,
                border: `1px solid ${layer.color}30`,
                borderLeft: `3px solid ${layer.color}`,
                borderRadius: 6, alignItems: "center",
              }}>
                <div style={{ fontFamily: M, fontSize: "clamp(1.1rem,2.5vw,1.4rem)",
                               fontWeight: 900, color: W }}>
                  {layer.n}
                </div>
                <div>
                  <div style={{ fontFamily: S, fontSize: "clamp(0.84rem,1.8vw,1rem)",
                                 fontWeight: 700, color: W, marginBottom: 2,
                                 textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {layer.title}
                  </div>
                  <div style={{ fontFamily: S, fontSize: "clamp(0.68rem,1.4vw,0.8rem)",
                                 color: "rgba(255,255,255,0.5)" }}>
                    {layer.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: M, fontSize: "0.65rem",
                         color: "rgba(255,255,255,0.25)",
                         textAlign: "right", marginTop: "0.625rem",
                         letterSpacing: "0.1em" }}>
            FLOW: L1 → L5 · COMPOUNDING: L5 ↻
          </div>
        </div>

        <Divider/>

        {/* ── 4. ECONOMICS — compressed ────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline",
                         justifyContent: "space-between",
                         flexWrap: "wrap", gap: "0.92rem", marginBottom: "1.25rem" }}>
            <div>
              <Label>Platform Economics</Label>
              <h2 style={{ fontFamily: S, fontSize: "clamp(1.2rem,3vw,1.8rem)",
                            fontWeight: 800, color: W, margin: 0,
                            letterSpacing: "-0.02em" }}>
                Built for recurring revenue.
              </h2>
            </div>
            <a href="/economics" style={{ fontFamily: M, fontSize: "0.75rem",
                                            color: `${B}60`, textDecoration: "none" }}>
              Full model &#8594;
            </a>
          </div>

          {/* Revenue strip — 4 streams, one row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                         gap: "1px", border: `1px solid ${BDR}`,
                         borderRadius: 7, overflow: "hidden",
                         marginBottom: "1.5rem" }}>
            {[
              { color: B,         t: "Verification",   r: "0.50%", k: "One-time"  },
              { color: "#8B5CF6", t: "Tokenization",   r: "0.25%", k: "One-time"  },
              { color: G,         t: "Platform AUM",   r: "0.75%", k: "Recurring" },
              { color: A,         t: "Lending Spread", r: "1.50%", k: "Recurring" },
            ].map(r => (
              <div key={r.t} style={{ background: CARD, padding: "0.875rem 1rem",
                                        borderTop: `2px solid ${r.color}` }}>
                <div style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                               color: r.color, textTransform: "uppercase",
                               letterSpacing: "0.08em", marginBottom: "0.7rem" }}>
                  {r.t}
                </div>
                <div style={{ fontFamily: M, fontSize: "clamp(0.85rem,2vw,1.1rem)",
                               fontWeight: 900, color: W, marginBottom: "0.2rem" }}>
                  {r.r}
                </div>
                <div style={{ fontFamily: M, fontSize: "0.6rem",
                               color: `${r.color}90`, letterSpacing: "0.05em" }}>
                  {r.k}
                </div>
              </div>
            ))}
          </div>

          {/* Scenario toggle */}
          <div style={{ display: "flex", alignItems: "center",
                         justifyContent: "space-between",
                         marginBottom: "0.92rem", flexWrap: "wrap", gap: "0.92rem" }}>
            <span style={{ fontFamily: M, fontSize: "0.7rem", fontWeight: 700,
                            color: "rgba(255,255,255,0.4)",
                            textTransform: "uppercase", letterSpacing: "0.12em" }}>
              3-YEAR PROJECTION
            </span>
            <div style={{ display: "flex", gap: "0.82rem" }}>
              {(["small", "large"] as Array<"small" | "large">).map(k => (
                <button key={k} onClick={() => setScenario(k)} style={{
                  padding: "0.3rem 0.75rem", borderRadius: 4, cursor: "pointer",
                  border: `1px solid ${scenario === k ? (k === "small" ? A : G) : BDR}`,
                  background: scenario === k ? `${k === "small" ? A : G}12` : CARD,
                  color: scenario === k ? (k === "small" ? A : G) : "rgba(255,255,255,0.3)",
                  fontFamily: M, fontSize: "0.72rem", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  transition: "all 0.15s",
                }}>
                  {k === "small" ? "SMALL ASSETS" : "LARGE ASSETS"}
                </button>
              ))}
            </div>
          </div>

          {/* Year cards — compressed */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)",
                         gap: "0.625rem", marginBottom: "1.25rem" }}>
            {[0, 1, 2].map(y => {
              const profit = SC.ebitda[y] > 0;
              const ebStr = SC.ebitda[y] < 0
                ? `($${Math.abs(SC.ebitda[y]).toFixed(1)}M)`
                : `$${SC.ebitda[y].toFixed(1)}M`;
              return (
                <div key={y} style={{ background: CARD,
                                        border: `1px solid ${BDR}`,
                                        borderTop: `2px solid ${profit ? G : "#EF4444"}`,
                                        borderRadius: 7, padding: "0.875rem 1rem" }}>
                  <div style={{ fontFamily: M, fontSize: "0.7rem",
                                 color: "rgba(255,255,255,0.25)",
                                 textTransform: "uppercase", letterSpacing: "0.1em",
                                 marginBottom: "0.625rem" }}>
                    YEAR {y + 1}
                  </div>
                  <div style={{ fontFamily: M, fontSize: "clamp(0.9rem,2vw,1.2rem)",
                                 fontWeight: 900, color: profit ? G : "#EF4444",
                                 marginBottom: "0.35rem" }}>
                    {ebStr}
                  </div>
                  <div style={{ fontFamily: M, fontSize: "0.7rem",
                                 color: "rgba(255,255,255,0.3)" }}>
                    AUM: ${SC.aum[y].toFixed(0)}M · Rev: ${SC.rev[y].toFixed(1)}M · {SC.ebitdaMargin[y].toFixed(0)}% margin
                  </div>
                </div>
              );
            })}
          </div>

          {/* EBITDA chart */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`,
                         borderRadius: 7, padding: "0.92rem", overflow: "visible" }}>
            <div style={{ fontFamily: M, fontSize: "0.7rem",
                           color: "rgba(255,255,255,0.25)",
                           textTransform: "uppercase", letterSpacing: "0.1em",
                           marginBottom: "0.7rem" }}>
              EBITDA TRAJECTORY ($M)
            </div>
            <BarSVG data={ebitdaData} keys={["small","large"]}
                    colors={[A, G]} height={160}/>
            <div style={{ display: "flex", gap: "0.92rem", marginTop: "0.92rem" }}>
              {[{ c: A, l: "Small" }, { c: G, l: "Large" }].map(x => (
                <div key={x.l} style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2,
                                 background: x.c, opacity: 0.85 }}/>
                  <span style={{ fontFamily: M, fontSize: "0.7rem",
                                  color: "rgba(255,255,255,0.4)" }}>{x.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Divider/>

        {/* ── 5. VERTICALS — ownership categories ──────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Label>Asset Verticals</Label>
          <h2 style={{ fontFamily: S, fontSize: "clamp(1.2rem,3vw,1.8rem)",
                        fontWeight: 800, color: W, margin: "0 0 0.5rem",
                        letterSpacing: "-0.02em" }}>
            One infrastructure. Many ownership categories.
          </h2>
          <p style={{ fontFamily: S, fontSize: "clamp(0.74rem,1.5vw,0.86rem)",
                       color: "rgba(255,255,255,0.35)", lineHeight: 1.75,
                       maxWidth: 620, margin: "0 0 1.5rem" }}>
            The same verification rails unlock ownership across asset classes
            where communities have generated the most value and captured the
            least of it.
          </p>
          <div style={{ display: "grid",
                         gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
                         gap: "0.7rem" }}>
            {[
              {
                n: "01", color: A, badge: "Generational Sovereignty",
                title: "Tribal & Natural Resources",
                desc: "Direct participation in oil, gas, mineral, and renewable energy projects on indigenous and sovereign land. Co-ownership structures that preserve jurisdictional autonomy.",
                tags: ["Mineral Rights", "Working Interests", "Carbon Credits", "Water Rights"],
              },
              {
                n: "02", color: B, badge: "Anti-Displacement",
                title: "Affordable Housing",
                desc: "Community Land Trusts and operator-managed properties tokenized so residents become fractional owners. Appreciation captured by the community, not by outside investors.",
                tags: ["CLT Structures", "Operator Properties", "Cash-Flow Residential"],
              },
              {
                n: "03", color: "#8B5CF6", badge: "Cultural Equity",
                title: "Music & Creator Royalties",
                desc: "Artist catalogs, publishing rights, and future royalty streams structured as regulated securities. The culture owns the catalog.",
                tags: ["Master Recordings", "Publishing", "Sync Rights", "Catalog Funds"],
              },
            ].map(v => (
              <div key={v.n} style={{ background: CARD,
                                        border: `1px solid ${BDR}`,
                                        borderTop: `2px solid ${v.color}`,
                                        borderRadius: 7, padding: "1.125rem" }}>
                <div style={{ display: "flex", alignItems: "center",
                               justifyContent: "space-between",
                               marginBottom: "0.92rem" }}>
                  <span style={{ fontFamily: M, fontSize: "0.84rem",
                                  fontWeight: 900, color: `${v.color}50` }}>
                    {v.n}
                  </span>
                  <span style={{ fontFamily: M, fontSize: "0.6rem",
                                  fontWeight: 700, color: v.color,
                                  background: `${v.color}12`,
                                  border: `1px solid ${v.color}25`,
                                  borderRadius: 3, padding: "1px 6px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em" }}>
                    {v.badge}
                  </span>
                </div>
                <div style={{ fontFamily: S, fontSize: "clamp(0.84rem,1.8vw,0.96rem)",
                               fontWeight: 700, color: W,
                               marginBottom: "0.92rem" }}>
                  {v.title}
                </div>
                <div style={{ fontFamily: S, fontSize: "clamp(0.85rem,1.4vw,0.95rem)",
                               color: "rgba(255,255,255,0.38)", lineHeight: 1.7,
                               marginBottom: "0.7rem" }}>
                  {v.desc}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                  {v.tags.map(t => (
                    <span key={t} style={{ fontFamily: M, fontSize: "0.6rem",
                                            fontWeight: 700, color: `${v.color}90`,
                                            background: `${v.color}08`,
                                            border: `1px solid ${v.color}18`,
                                            borderRadius: 2, padding: "1px 5px",
                                            letterSpacing: "0.06em" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Divider/>

        {/* ── 6. ASSET REGISTRY — inline preview ───────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "baseline",
                         justifyContent: "space-between",
                         flexWrap: "wrap", gap: "0.92rem", marginBottom: "1.25rem" }}>
            <div>
              <Label>Asset Registry</Label>
              <h2 style={{ fontFamily: S, fontSize: "clamp(1.2rem,3vw,1.8rem)",
                            fontWeight: 800, color: W, margin: 0,
                            letterSpacing: "-0.02em" }}>
                Live registry · 1 verified asset.
              </h2>
            </div>
            <button onClick={() => setDeep("registry")}
              style={{ fontFamily: M, fontSize: "0.78rem", color: `${B}80`,
                        background: "transparent", border: "none",
                        cursor: "pointer", textDecoration: "underline",
                        textUnderlineOffset: 4 }}>
              Open inspector &#8594;
            </button>
          </div>

          {/* Genesis card */}
          <div onClick={() => setDeep("asset")} style={{
            padding: "1.375rem 1.5rem", borderRadius: 8,
            border: `1px solid ${G}25`, background: `${G}05`,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: "0.92rem",
            cursor: "pointer", transition: "background 0.15s",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.92rem",
                             marginBottom: "0.7rem" }}>
                <span style={{ fontFamily: M, fontSize: "0.65rem",
                                color: `${G}60`, textTransform: "uppercase",
                                letterSpacing: "0.12em" }}>
                  AAS-1 · GENESIS ASSET
                </span>
                <span style={{ fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                                color: G, background: `${G}15`,
                                border: `1px solid ${G}30`, borderRadius: 3,
                                padding: "1px 6px", textTransform: "uppercase",
                                letterSpacing: "0.08em" }}>
                  VERIFIED
                </span>
              </div>
              <div style={{ fontFamily: S, fontSize: "clamp(0.85rem,2vw,1.05rem)",
                             fontWeight: 700, color: W }}>
                Cielo Sunrise — $1,100,000
              </div>
              <div style={{ fontFamily: S, fontSize: "clamp(0.64rem,1.3vw,0.76rem)",
                             color: "rgba(255,255,255,0.32)", marginTop: "0.2rem" }}>
                Mineral Bluff, Georgia · 89/100 collateral score · $660K max borrow · 96% verification confidence
              </div>
            </div>
            <span style={{ fontFamily: M, fontSize: "0.82rem", color: G,
                            letterSpacing: "0.06em" }}>INSPECT &#8594;</span>
          </div>
        </div>

        <Divider/>

        {/* ── 7. SUBMIT CTA ─────────────────────────────────────── */}
        <div style={{ padding: "2rem", borderRadius: 8,
                       border: `1px solid ${B}25`, background: `${B}05`,
                       textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontFamily: M, fontSize: "0.7rem", color: `${B}80`,
                         textTransform: "uppercase", letterSpacing: "0.2em",
                         marginBottom: "0.625rem" }}>
            BRING AN ASSET INTO THE PROTOCOL
          </div>
          <h2 style={{ fontFamily: S, fontSize: "clamp(1.1rem,2.5vw,1.5rem)",
                        fontWeight: 800, color: W, margin: "0 0 0.625rem",
                        letterSpacing: "-0.02em" }}>
            Verification before tokenization.
          </h2>
          <p style={{ fontFamily: S, fontSize: "clamp(0.72rem,1.5vw,0.84rem)",
                       color: "rgba(255,255,255,0.38)", lineHeight: 1.75,
                       maxWidth: 540, margin: "0 auto 1.25rem" }}>
            Owner-led onboarding for real estate, minerals, energy reserves,
            royalty interests, and other cash-flowing assets. No wallet required
            to assess eligibility.
          </p>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => setDeep("submit")} style={{
              padding: "0.75rem 1.5rem", borderRadius: 6, border: "none",
              background: G, color: "#000", fontFamily: M, fontSize: "0.9rem",
              fontWeight: 900, cursor: "pointer", letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>START ONBOARDING &#8594;</button>
            <button onClick={() => setDeep("trust")} style={{
              padding: "0.75rem 1.5rem", borderRadius: 6,
              border: `1px solid ${BDR}`, background: "transparent",
              color: "rgba(255,255,255,0.55)", fontFamily: M,
              fontSize: "0.9rem", fontWeight: 700, cursor: "pointer",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>VIEW TRUST LAYER</button>
          </div>
        </div>


        <div style={{ height: "3rem" }}/>
      </div>
    </div>
  );
}

// ── Deep view wrapper — back button + content ────────────────────────
function DeepView({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div>
      <div style={{ padding: "0.75rem clamp(1rem,3vw,1.5rem)",
                     borderBottom: `1px solid ${BDR}`, background: CARD,
                     display: "flex", alignItems: "center", gap: "0.7rem" }}>
        <button onClick={onBack} style={{
          padding: "0.3rem 0.75rem", borderRadius: 4,
          border: `1px solid ${BDR}`, background: "transparent",
          color: "rgba(255,255,255,0.5)", fontFamily: M,
          fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>&#8592; BACK TO TERMINAL</button>
      </div>
      {children}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────
export default function TerminalPage() {
  const [tab, setTab] = useState<Tab>("terminal");

  return (
    <div style={{ background: BG, minHeight: "100vh",
                   display: "flex", flexDirection: "column" }}>

      {/* Protocol status strip */}
      <div style={{ background: "#060810", borderBottom: "1px solid #0F1929",
                     padding: "0 clamp(0.75rem,2.5vw,1.5rem)",
                     height: 28, display: "flex", alignItems: "center",
                     gap: "1.5rem", overflowX: "auto", flexShrink: 0 }}>
        {[
          { dot: G, text: "SOLANA MAINNET" },
          { dot: G, text: "AAS-1 PROTOCOL ACTIVE" },
          { dot: A, text: "REG A / D / CF READY" },
          { dot: B, text: "OWNERSHIP INFRASTRUCTURE" },
        ].map(s => (
          <div key={s.text} style={{ display: "flex", alignItems: "center",
                                      gap: "0.35rem", flexShrink: 0 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%",
                           background: s.dot,
                           boxShadow: `0 0 5px ${s.dot}80` }}/>
            <span style={{ fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                            color: "rgba(255,255,255,0.25)",
                            letterSpacing: "0.12em",
                            textTransform: "uppercase" }}>
              {s.text}
            </span>
          </div>
        ))}
        <div style={{ flex: 1 }}/>
        <span style={{ fontFamily: M, fontSize: "0.6rem",
                        color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em" }}>
          ABRAXAS OS · BUILD 2025.1
        </span>
      </div>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 28, zIndex: 200,
                     background: "rgba(10,12,16,0.97)",
                     backdropFilter: "blur(12px)",
                     borderBottom: `1px solid ${BDR}`,
                     display: "flex", alignItems: "center",
                     padding: "0 clamp(0.75rem,2.5vw,1.5rem)",
                     height: "clamp(46px,6vw,54px)",
                     gap: "clamp(0.25rem,1vw,0.5rem)",
                     flexWrap: "nowrap", overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem",
                       flexShrink: 0, marginRight: "clamp(0.375rem,1.5vw,1rem)" }}>
          <Image src="/icon-48.png" alt="Abraxas" width={24} height={24}
                  priority style={{ display:"block", flexShrink:0 }}/>
          <div>
            <span style={{ fontFamily: M, fontSize: "clamp(1rem,1.5vw,1.15rem)",
                            fontWeight: 900, color: W, letterSpacing: "0.1em" }}>
              ABRAXAS
            </span>
            <span style={{ fontFamily: M, fontSize: "1.1rem",
                            color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em",
                            marginLeft: "0.375rem", verticalAlign: "middle" }}>
              PROTOCOL OS
            </span>
          </div>
        </div>

        {([
          { id: "terminal" as Tab, label: "TERMINAL" },
          { id: "lending"  as Tab, label: "LENDING"  },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "0.5rem clamp(0.75rem,1.5vw,1.125rem)", borderRadius: 5,
            border: `1px solid ${tab === t.id ? `${G}50` : BDR}`,
            background: tab === t.id ? `${G}10` : "transparent",
            color: tab === t.id ? G : "rgba(255,255,255,0.28)",
            fontFamily: M, fontSize: "clamp(0.7rem,0.85vw,0.85rem)",
            fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
            letterSpacing: "0.1em", whiteSpace: "nowrap", flexShrink: 0,
            transition: "all 0.15s",
          }}>
            {t.label}
          </button>
        ))}

<a href="/dashboard" style={{
          padding: "0.5rem clamp(0.75rem,1.5vw,1.125rem)", borderRadius: 5,
          border: `1px solid ${BDR}`, background: "transparent",
          color: "rgba(255,255,255,0.4)", fontFamily: M,
          fontSize: "clamp(0.7rem,0.85vw,0.85rem)", fontWeight: 700,
          textDecoration: "none", textTransform: "uppercase",
          letterSpacing: "0.1em", whiteSpace: "nowrap", flexShrink: 0,
        }}>
          DASHBOARD
        </a>

        <div style={{ flex: 1 }}/>
        <LanguageSelector/>
        <CompactWallet/>
      </nav>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {tab === "terminal" && <TerminalTab/>}
        {tab === "lending"  && (
          <div style={{ maxWidth: 1060, margin: "0 auto",
                         padding: "3rem clamp(1rem,3vw,2rem) 5rem",
                         textAlign: "center" }}>
            <div style={{ fontFamily: M, fontSize: "0.75rem", fontWeight: 700,
                           color: `${A}80`, textTransform: "uppercase",
                           letterSpacing: "0.2em", marginBottom: "0.92rem" }}>
              LENDING ENGINE
            </div>
            <h2 style={{ fontFamily: "Georgia, serif",
                          fontSize: "clamp(1.85rem,4.5vw,2.75rem)", fontWeight: 800,
                          color: W, margin: "0 0 0.75rem" }}>
              Collateral-backed USDC lending<br/>
              <span style={{ color: A }}>for verified real-world assets.</span>
            </h2>
            <p style={{ fontFamily: S, fontSize: "clamp(0.8rem,1.8vw,1rem)",
                         color: "rgba(255,255,255,0.4)", lineHeight: 1.75,
                         maxWidth: 540, margin: "0 auto 2rem" }}>
              Verify your asset first. Once Abraxas issues an AAS-1 attestation,
              your asset becomes collateral-eligible for USDC lending at up to 60% LTV.
            </p>
            <a href="/lending" style={{
              display: "inline-block", padding: "0.875rem 2rem", borderRadius: 5,
              background: A, color: "#000", fontFamily: M, fontSize: "0.92rem",
              fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase",
              textDecoration: "none",
            }}>
              VIEW LENDING ENGINE →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
