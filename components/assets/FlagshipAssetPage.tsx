// FILE: components/assets/FlagshipAssetPage.tsx
// Genesis flagship property — institutional RWA showcase
// Bloomberg terminal meets luxury hospitality asset
"use client";

import { useState }          from "react";
import { FLAGSHIP_PROPERTY }       from "@/lib/data/flagshipProperty";

const M  = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG = "#0C0E12"; const CARD = "#0E1117"; const BORDER = "#1F2937";
const GREEN = "#10B981"; const AMBER = "#ED8936"; const BLUE = "#3182CE";

const D = FLAGSHIP_PROPERTY;
const F = D.financials;
const V = D.verification;
const C = D.collateral;

// ── Shared primitives ─────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:"2rem" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"1rem", paddingBottom:"0.625rem",
                     borderBottom:`1px solid ${BORDER}` }}>
        <span style={{ color:GREEN, fontSize:"0.7rem" }}>{icon}</span>
        <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                        color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                        letterSpacing:"0.2em" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, color = "#f0f0f0" }: { label:string; value:string; sub?:string; color?:string }) {
  return (
    <div style={{ padding:"1rem", background:CARD, border:`1px solid ${BORDER}`,
                   borderRadius:"6px" }}>
      <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                     textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.35rem" }}>
        {label}
      </div>
      <div style={{ fontFamily:M, fontSize:"clamp(0.9rem,2.5vw,1.3rem)",
                     fontWeight:900, color, lineHeight:1 }}>
        {value}
      </div>
      {sub && <div style={{ fontFamily:M, fontSize:"0.3rem",
                              color:"rgba(255,255,255,0.2)", marginTop:"0.25rem" }}>{sub}</div>}
    </div>
  );
}

function CopyHash({ label, value, link }: { label:string; value:string; link?:string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ padding:"0.625rem 0", borderBottom:`1px solid rgba(31,41,55,0.5)` }}>
      <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
                     textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.2rem" }}>
        {label}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <code style={{ fontFamily:M, fontSize:"0.4rem", color:GREEN,
                        wordBreak:"break-all", flex:1, lineHeight:1.5 }}>
          {value}
        </code>
        <div style={{ display:"flex", gap:"0.25rem", flexShrink:0 }}>
          <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
            style={{ padding:"2px 6px", borderRadius:"3px", border:`1px solid ${BORDER}`,
                      background:`${GREEN}10`, color:GREEN, fontSize:"0.28rem",
                      cursor:"pointer", fontFamily:M }}>
            {copied ? "✓" : "COPY"}
          </button>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              style={{ padding:"2px 6px", borderRadius:"3px", border:`1px solid ${BORDER}`,
                        background:`${BLUE}10`, color:BLUE, fontSize:"0.28rem",
                        textDecoration:"none", fontFamily:M }}>
              EXPLORER →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────
export function FlagshipAssetPage() {
  const [tab, setTab] = useState<"overview"|"financials"|"verification"|"collateral">("overview");
  const maxRev = Math.max(...F.monthlyRevenue.map(m => m.rev));

  const tabs = [
    { id:"overview",     label:"OVERVIEW" },
    { id:"financials",   label:"FINANCIALS" },
    { id:"verification", label:"VERIFICATION" },
    { id:"collateral",   label:"COLLATERAL" },
  ];

  return (
    <div style={{ background:BG, minHeight:"100vh", color:"#f0f0f0" }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <div style={{ position:"relative", background:`linear-gradient(180deg, #0a1a14 0%, ${BG} 100%)`,
                     padding:"clamp(2rem,5vw,4rem) clamp(1rem,4vw,2rem) 2rem",
                     borderBottom:`1px solid ${BORDER}` }}>
        {/* Genesis badge */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"1.25rem" }}>
          <span style={{ padding:"3px 10px", borderRadius:"3px",
                          background:`${GREEN}15`, border:`1px solid ${GREEN}35`,
                          fontFamily:M, fontSize:"0.3rem", fontWeight:900,
                          color:GREEN, textTransform:"uppercase", letterSpacing:"0.12em" }}>
            ◈ GENESIS ASSET · SERIES A
          </span>
          <span style={{ padding:"3px 10px", borderRadius:"3px",
                          background:`${BLUE}10`, border:`1px solid ${BLUE}25`,
                          fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                          color:BLUE, textTransform:"uppercase", letterSpacing:"0.12em" }}>
            AAS-1 VERIFIED
          </span>
          <span style={{ padding:"3px 10px", borderRadius:"3px",
                          background:"rgba(212,175,55,0.1)",
                          border:"1px solid rgba(212,175,55,0.25)",
                          fontFamily:M, fontSize:"0.3rem", fontWeight:700,
                          color:"#D4AF37", textTransform:"uppercase", letterSpacing:"0.12em" }}>
            COLLATERAL ELIGIBLE
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily:M, fontSize:"clamp(1.4rem,4vw,2.8rem)", fontWeight:900,
                      color:"#f0f0f0", margin:"0 0 0.5rem", letterSpacing:"-0.03em",
                      lineHeight:1.1 }}>
          Cielo Sunrise
        </h1>
        <div style={{ fontFamily:M, fontSize:"clamp(0.44rem,1.4vw,0.6rem)",
                       color:"rgba(255,255,255,0.35)", marginBottom:"2rem" }}>
          Mirrored Wellness Dome · 2,800ft Ridgeline · Tri-State Views · {D.location.address}
        </div>

        {/* Hero metrics grid */}
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))",
                       gap:"0.625rem" }}>
          <MetricCard label="Estimated Value"     value={`$${(D.collateral.appraisalValue/1_000_000).toFixed(1)}M`}  sub="Appraised Value 2025" color="#f0f0f0"/>
          <MetricCard label="Annual NOI"          value={`$${F.annualNOI.toLocaleString()}`}                  sub="Net Operating Income" color={GREEN}/>
          <MetricCard label="Cash Yield"          value={`${(F.cashYield*100).toFixed(1)}%`}                  sub="On Purchase Price"    color={GREEN}/>
          <MetricCard label="Avg Occupancy"       value={`${(F.occupancyRate*100).toFixed(0)}%`}              sub="Annual Average"       color={BLUE}/>
          <MetricCard label="Max Borrow Capacity" value={`$${C.maxBorrow.toLocaleString()} USDC`}             sub={`${C.ltv}% LTV`}     color={BLUE}/>
          <MetricCard label="Collateral Score"    value={`${C.collateralScore}/100`}                          sub="AAA Institutional"    color={AMBER}/>
        </div>
      </div>

      {/* ── TAB NAV ────────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${BORDER}`,
                     background:CARD, overflowX:"auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding:"0.875rem clamp(0.75rem,2vw,1.25rem)",
            background: tab===t.id ? `${BLUE}12` : "transparent",
            border:"none", borderBottom: tab===t.id ? `2px solid ${BLUE}` : "2px solid transparent",
            fontFamily:M, fontSize:"clamp(0.3rem,1vw,0.38rem)", fontWeight:700,
            color: tab===t.id ? BLUE : "rgba(255,255,255,0.3)",
            cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.12em",
            whiteSpace:"nowrap", transition:"all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB CONTENT ────────────────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:"0 auto",
                     padding:"2rem clamp(1rem,3vw,2rem) 4rem" }}>

        {/* ════ OVERVIEW ════════════════════════════════════════════════ */}
        {tab === "overview" && (
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))",
                         gap:"1.5rem" }}>
            {/* Property specs */}
            <Section title="Property Specifications" icon="⬛">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                {[
                  ["Property Type",  D.property.type],
                  ["Bedrooms",       String(D.property.bedrooms)],
                  ["Bathrooms",      String(D.property.bathrooms)],
                ["Square Footage", D.property.sqft != null ? (String(D.property.sqft) + " sq ft") : "Not Disclosed"],
                ["Acreage",        D.property.acreage ? String(D.property.acreage) + " acres" : "Not Disclosed"],
                  ["Guest Capacity", `${D.property.guestCapacity ?? "12"} guests`],
                  ["Year Built",     String(D.property.yearBuilt)],
                  ["Construction",   D.property.construction],
                ].map(([k,v]) => (
                  <div key={k} style={{ padding:"0.625rem", background:CARD,
                                          border:`1px solid ${BORDER}`, borderRadius:"4px" }}>
                    <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.2)",
                                   textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{k}</div>
                    <div style={{ fontFamily:M, fontSize:"0.48rem", fontWeight:700,
                                   color:"#f0f0f0" }}>{v}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Ownership */}
            <Section title="Ownership & Legal Structure" icon="◉">
              {[
                ["Entity Type",      D.ownership.entityType],
                ["Entity Name",      D.ownership.entityName],
                ["State",            D.ownership.state],
                ["Formed",           D.ownership.formed],
                ["Manager",          D.ownership.manager],
                ["Title Status",     D.ownership.titleStatus],
                ["Insurance",        D.ownership.insurance],
                ["Mgmt Company",     D.ownership.propertyMgmt],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                       padding:"0.5rem 0",
                                       borderBottom:`1px solid rgba(31,41,55,0.5)` }}>
                  <span style={{ fontFamily:M, fontSize:"0.38rem",
                                  color:"rgba(255,255,255,0.3)" }}>{k}</span>
                  <span style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                                  color: v.includes("CLEAR") ? GREEN : "#f0f0f0",
                                  textAlign:"right", maxWidth:"55%" }}>{v}</span>
                </div>
              ))}
            </Section>

            {/* Amenities */}
            <Section title="Asset Amenities" icon="◈">
              <div style={{ display:"flex", flexWrap:"wrap", gap:"0.375rem" }}>
                {D.property.amenities.map(a => (
                  <span key={a} style={{ padding:"3px 8px", borderRadius:"3px",
                                          background:`${GREEN}08`,
                                          border:`1px solid ${GREEN}20`,
                                          fontFamily:M, fontSize:"0.38rem",
                                          color:"rgba(255,255,255,0.5)" }}>{a}</span>
                ))}
              </div>
            </Section>

            {/* Guest profile */}
            <Section title="Guest Intelligence" icon="◆">
              <div style={{ display:"flex", alignItems:"center",
                             gap:"1rem", marginBottom:"1rem" }}>
                <div style={{ fontFamily:M, fontSize:"2.4rem", fontWeight:900,
                               color:GREEN }}>
                  {D.guestProfile.avgRating}
                </div>
                <div>
                  <div style={{ fontFamily:M, fontSize:"0.46rem", fontWeight:700,
                                 color:"#f0f0f0" }}>
                    {D.guestProfile.totalReviews} Reviews
                  </div>
                  <div style={{ fontFamily:M, fontSize:"0.36rem",
                                 color:AMBER, fontWeight:700 }}>
                    ★ SUPERHOST · {D.guestProfile.hostYears} YEARS
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.4rem" }}>
                {[
                  ["Cleanliness",    D.guestProfile.cleanliness],
                  ["Accuracy",       D.guestProfile.accuracy],
                  ["Communication",  D.guestProfile.communication],
                  ["Location",       D.guestProfile.location],
                  ["Check-In",       D.guestProfile.checkIn],
                  ["Value",          D.guestProfile.value],
                ].map(([k,v]) => (
                  <div key={k} style={{ padding:"0.4rem 0.625rem", background:CARD,
                                          border:`1px solid ${BORDER}`, borderRadius:"4px",
                                          display:"flex", justifyContent:"space-between",
                                          alignItems:"center" }}>
                    <span style={{ fontFamily:M, fontSize:"0.32rem",
                                    color:"rgba(255,255,255,0.3)" }}>{k}</span>
                    <span style={{ fontFamily:M, fontSize:"0.56rem", fontWeight:900,
                                    color:(v as number)>=4.9?GREEN:AMBER }}>
                      {(v as number).toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* ════ FINANCIALS ══════════════════════════════════════════════ */}
        {tab === "financials" && (
          <div>
            {/* Key metrics */}
            <div style={{ display:"grid",
                           gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))",
                           gap:"0.625rem", marginBottom:"2rem" }}>
              {[
                { label:"Gross Revenue (TTM)",   value:`$${F.annualGrossRevenue.toLocaleString()}`, color:GREEN },
                { label:"Net Operating Income",  value:`$${F.annualNOI.toLocaleString()}`,          color:GREEN },
                { label:"Cap Rate",              value:`${(F.capRate*100).toFixed(1)}%`,            color:GREEN },
                { label:"Cash-on-Cash Yield",    value:`${(F.cashYield*100).toFixed(1)}%`,          color:GREEN },
                { label:"Avg Nightly Rate",      value:`$${F.nightlyRateAvg}`,                      color:"#f0f0f0" },
                { label:"Peak Season Rate",      value:`$${F.nightlyRatePeak}`,                     color:"#f0f0f0" },
                { label:"Annual Occupancy",      value:`${(F.occupancyRate*100).toFixed(0)}%`,      color:BLUE },
                { label:"Debt Service Coverage", value:`${C.debtServiceCoverage}x`,                color:AMBER },
              ].map(m => <MetricCard key={m.label} {...m}/>)}
            </div>

            {/* Revenue bar chart */}
            <Section title="Monthly Revenue — Trailing 12 Months" icon="◈">
              <div style={{ display:"flex", alignItems:"flex-end", gap:"0.375rem",
                             height:120, padding:"0.5rem 0" }}>
                {F.monthlyRevenue.map((m, i) => {
                  const h = Math.round((m.rev / maxRev) * 100);
                  return (
                    <div key={i} style={{ flex:1, display:"flex",
                                           flexDirection:"column", alignItems:"center",
                                           gap:"0.25rem" }}>
                      <div style={{ fontFamily:M, fontSize:"0.28rem",
                                     color:GREEN }}>
                        ${(m.rev/1000).toFixed(0)}k
                      </div>
                      <div style={{
                        width:"100%", height:`${h}%`, minHeight:4,
                        background:`linear-gradient(180deg, ${GREEN}, ${GREEN}60)`,
                        borderRadius:"2px 2px 0 0",
                        transition:"height 0.3s ease",
                      }}/>
                      <div style={{ fontFamily:M, fontSize:"0.24rem",
                                     color:"rgba(255,255,255,0.2)",
                                     transform:"rotate(-45deg)",
                                     whiteSpace:"nowrap" }}>
                        {m.month.slice(0,3)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>

            {/* P&L breakdown */}
            <Section title="Income & Expense Summary" icon="◆">
              {[
                { label:"Gross Booking Revenue",    value:`$${F.annualGrossRevenue.toLocaleString()}`,       positive:true },
                { label:"Platform + Mgmt Fees (20%)",value:`-$${Math.round(F.annualGrossRevenue*F.mgmtFee).toLocaleString()}`, positive:false },
                { label:"Operating Expenses",        value:`-$${F.operatingExpenses.toLocaleString()}`,      positive:false },
                { label:"Net Operating Income",      value:`$${F.annualNOI.toLocaleString()}`,               positive:true, bold:true },
              ].map(row => (
                <div key={row.label} style={{
                  display:"flex", justifyContent:"space-between",
                  padding:"0.625rem 0",
                  borderBottom:`1px solid rgba(31,41,55,0.5)`,
                  borderTop: (row as any).bold ? `1px solid ${BORDER}` : "none",
                }}>
                  <span style={{ fontFamily:M, fontSize:"0.44rem",
                                  color: (row as any).bold ? "#f0f0f0" : "rgba(255,255,255,0.4)",
                                  fontWeight: (row as any).bold ? 800 : 400 }}>
                    {row.label}
                  </span>
                  <span style={{ fontFamily:M, fontSize:"0.52rem",
                                  fontWeight:800,
                                  color: row.positive ? GREEN : "#f26b6b" }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* ════ VERIFICATION ════════════════════════════════════════════ */}
        {tab === "verification" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.5rem" }}>

            {/* Verification Certificate */}
            <Section title="AAS-1 Verification Certificate" icon="◉">
              <div style={{ padding:"1rem", background:"rgba(16,185,129,0.06)",
                             border:"1px solid rgba(16,185,129,0.25)", borderRadius:"6px",
                             marginBottom:"0.875rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", marginBottom:"0.5rem" }}>
                  <span style={{ color:GREEN, fontSize:"0.9rem" }}>✓</span>
                  <span style={{ fontFamily:M, fontSize:"0.44rem", fontWeight:900, color:GREEN }}>
                    VERIFIED — AAS-1 STANDARD
                  </span>
                </div>
                <div style={{ fontFamily:M, fontSize:"0.36rem", color:"rgba(255,255,255,0.3)", lineHeight:1.7 }}>
                  Certificate: {V.certificateId}<br/>
                  Issued: {new Date(V.issuedAt).toLocaleDateString()}<br/>
                  Valid Until: {new Date(V.validUntil).toLocaleDateString()}<br/>
                  Issuer: {V.verifier}
                </div>
              </div>
              <CopyHash label="Document SHA-256 Hash"  value={V.documentHash} />
              <CopyHash label="Metadata Hash"          value={V.metaHash} />
              <CopyHash label="Anchored Transaction"   value={V.anchoredTx}
                link={"https://explorer.solana.com/tx/" + V.anchoredTx} />
            </Section>

            {/* Provenance Timeline */}
            <Section title="Provenance Timeline" icon="◈">
              <div style={{ position:"relative", paddingLeft:"1.25rem" }}>
                <div style={{ position:"absolute", left:"0.25rem", top:0, bottom:0,
                               width:1, background:"rgba(16,185,129,0.2)" }}/>
                {V.provenanceTimeline.map((ev, i) => (
                  <div key={i} style={{ position:"relative", marginBottom:"0.875rem" }}>
                    <div style={{ position:"absolute", left:"-1.15rem", top:3,
                                   width:8, height:8, borderRadius:"50%",
                                   background: ev.status === "COMPLETE" ? GREEN : AMBER,
                                   border:"2px solid #0C0E12" }}/>
                    <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.2)", marginBottom:2 }}>
                      {ev.date}
                    </div>
                    <div style={{ fontFamily:M, fontSize:"0.42rem", fontWeight:700, color:"#f0f0f0", marginBottom:2 }}>
                      {ev.event}
                    </div>
                    <div style={{ fontFamily:M, fontSize:"0.34rem", color:"rgba(255,255,255,0.3)" }}>
                      {ev.actor}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Custody Ledger */}
            <Section title="Custody Ledger — Multi-Signature" icon="◆">
              <div style={{ marginBottom:"0.875rem" }}>
                {[
                  ["Custodian",     V.custodyLedger.custodian],
                  ["Vault Type",    V.custodyLedger.vaultType],
                  ["Jurisdiction",  V.custodyLedger.jurisdiction],
                  ["Audit Cadence", V.custodyLedger.auditCadence],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                         padding:"0.4rem 0", borderBottom:"1px solid rgba(31,41,55,0.5)" }}>
                    <span style={{ fontFamily:M, fontSize:"0.36rem", color:"rgba(255,255,255,0.3)" }}>{k}</span>
                    <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700, color:"#f0f0f0",
                                    textAlign:"right", maxWidth:"55%" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>
                {V.custodyLedger.signatories.length}/{V.custodyLedger.signatories.length} TRUSTEES ATTESTED
              </div>
              {V.custodyLedger.signatories.map(s => (
                <div key={s.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                                          marginBottom:"0.4rem", padding:"0.4rem 0.625rem",
                                          background:"#0E1117", border:"1px solid #1F2937",
                                          borderRadius:"4px" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                                  background: s.status === "ACTIVE" ? GREEN : AMBER,
                                  boxShadow: "0 0 6px " + (s.status === "ACTIVE" ? GREEN : AMBER) }}/>
                  <span style={{ fontFamily:M, fontSize:"0.36rem", color:"rgba(255,255,255,0.5)", flex:1 }}>
                    {s.role}
                  </span>
                  <code style={{ fontFamily:M, fontSize:"0.32rem", color:GREEN }}>{s.hash}</code>
                </div>
              ))}
            </Section>

          </div>
        )}

        {tab === "collateral" && (
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))",
                         gap:"1.5rem" }}>
            <Section title="Collateral Profile" icon="◆">
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                {[
                  { label:"Appraisal Value",  value:`$${C.appraisalValue.toLocaleString()}`,   color:"#f0f0f0" },
                  { label:"Max LTV",           value:`${C.ltv}%`,                               color:GREEN },
                  { label:"Max Borrow",        value:`$${C.maxBorrow.toLocaleString()} USDC`,   color:GREEN },
                  { label:"Collateral Score",  value:`${C.collateralScore}/100`,                color:GREEN },
                  { label:"Liquidity Score",   value:`${C.liquidityScore}/100`,                 color:BLUE },
                  { label:"Fraud Risk",        value:`${C.fraudRisk}/100`,                      color:GREEN },
                  { label:"DSCR",              value:`${C.debtServiceCoverage}x`,               color:GREEN },
                  { label:"Lender Confidence", value:C.lenderConfidence,                        color:AMBER },
                ].map(m => <MetricCard key={m.label} {...m}/>)}
              </div>
            </Section>

            <Section title="Risk Score Breakdown" icon="◉">
              {[
                { label:"Custody Method (Digital Title Escrow)", pts:15, ok:true },
                { label:"Legal Attestation (LLC + Clear Title)",  pts:20, ok:true },
                { label:"Revenue Telemetry (< 30 days stale)",    pts:10, ok:true },
                { label:"Provenance Chain (Anchored On-Chain)",   pts:25, ok:true },
                { label:"Appraisal Currency (< 6 months)",        pts:10, ok:true },
                { label:"Secondary Market Liquidity",             pts:-5, ok:false },
                { label:"Hospitality Sector Risk",               pts:-8, ok:false },
              ].map((r, i) => (
                <div key={i} style={{ display:"grid",
                                       gridTemplateColumns:"1fr auto 50px",
                                       gap:"0.5rem", alignItems:"center",
                                       padding:"0.5rem 0",
                                       borderBottom:`1px solid rgba(31,41,55,0.5)` }}>
                  <span style={{ fontFamily:M, fontSize:"0.38rem",
                                  color:"rgba(255,255,255,0.5)" }}>{r.label}</span>
                  <span style={{ fontFamily:M, fontSize:"0.28rem", fontWeight:700,
                                  color: r.ok ? GREEN : "#f26b6b",
                                  textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    {r.ok ? "VERIFIED" : "RISK"}
                  </span>
                  <span style={{ fontFamily:M, fontSize:"0.56rem", fontWeight:900,
                                  color: r.pts > 0 ? GREEN : "#f26b6b",
                                  textAlign:"right" }}>
                    {r.pts > 0 ? `+${r.pts}` : r.pts}
                  </span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between",
                             padding:"0.625rem 0",
                             borderTop:`1px solid ${BORDER}` }}>
                <span style={{ fontFamily:M, fontSize:"0.42rem", fontWeight:800,
                                color:"rgba(255,255,255,0.5)",
                                textTransform:"uppercase", letterSpacing:"0.1em" }}>
                  TOTAL COLLATERAL HEALTH
                </span>
                <span style={{ fontFamily:M, fontSize:"0.9rem", fontWeight:900,
                                color:GREEN }}>
                  {C.collateralScore}/100
                </span>
              </div>
            </Section>

            <Section title="Tokenization Status" icon="◈">
              {[
                ["Token Standard",  D.tokenization.tokenStandard],
                ["Chain",           D.tokenization.chain],
                ["Mint Cost",       `${D.tokenization.mintCostAbra} ABRA`],
                ["Supply",          String(D.tokenization.totalSupply)],
                ["Status",          D.tokenization.status],
                ["Transferable",    D.tokenization.transferable ? "YES" : "NO"],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                       padding:"0.5rem 0",
                                       borderBottom:`1px solid rgba(31,41,55,0.5)` }}>
                  <span style={{ fontFamily:M, fontSize:"0.38rem",
                                  color:"rgba(255,255,255,0.3)" }}>{k}</span>
                  <span style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                                  color: v==="COLLATERAL_ELIGIBLE" ? GREEN : "#f0f0f0" }}>
                    {v}
                  </span>
                </div>
              ))}
              <a href={D.property.airbnbUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:"block", marginTop:"0.875rem", padding:"0.625rem",
                          borderRadius:"5px", border:`1px solid ${BORDER}`,
                          background:`${BLUE}06`, fontFamily:M, fontSize:"0.38rem",
                          fontWeight:700, color:BLUE, textAlign:"center",
                          textDecoration:"none" }}>
                VIEW AIRBNB LISTING →
              </a>
            </Section>
          </div>
        )}

      </div>
    </div>
  );
}