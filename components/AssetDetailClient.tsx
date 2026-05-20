// FILE: components/AssetDetailClient.tsx
// Client component for asset detail — all real data wired.
// Uses CertificateDisplay, LiveEventFeed, BorrowPanel.
// All imports at top.
"use client";

import { useState }             from "react";
import { CertificateDisplay }   from "@/components/CertificateDisplay";
import { LiveEventFeed }        from "@/components/LiveEventFeed";
import { BorrowPanel }          from "@/components/BorrowPanel";

const MONO = "'JetBrains Mono',monospace";

const STATUS_META: Record<string,{label:string;color:string}> = {
  submitted:           {label:"Submitted",       color:"#C8A96E"},
  under_review:        {label:"Under Review",    color:"#FBBF24"},
  partner_required:    {label:"Partner Required",color:"#FBBF24"},
  additional_documents:{label:"Docs Required",   color:"#FBBF24"},
  provenance_review:   {label:"Provenance Check",color:"#FBBF24"},
  custody_pending:     {label:"Custody Pending", color:"#FBBF24"},
  risk_scoring:        {label:"Risk Scoring",    color:"#a855f7"},
  approved:            {label:"Verified",        color:"#14F195"},
  collateral_eligible: {label:"Borrow Ready",   color:"#14F195"},
  borrowed:            {label:"Active Loan",     color:"#6b8cff"},
  rejected:            {label:"Rejected",        color:"#f26b6b"},
  suspended:           {label:"Suspended",       color:"#f26b6b"},
  expired:             {label:"Expired",         color:"rgba(255,255,255,0.2)"},
};

const PIPELINE = ["Submit","Documents","Identity","Appraisal","Custody","Risk","Verified","Borrow Ready"];

function fmt(n: number) {
  return n >= 1_000_000 ? `$${(n/1_000_000).toFixed(2)}M`
       : n >= 1_000     ? `$${(n/1_000).toFixed(1)}K`
       :                  `$${n.toFixed(0)}`;
}

type Tab = "overview" | "timeline" | "certificate";

export function AssetDetailClient({ data }: { data: Record<string,unknown> }) {
  const [tab, setTab] = useState<Tab>("overview");

  const asset      = data.asset      as Record<string,unknown>;
  const custody    = data.custody    as Record<string,unknown> | null;
  const latestScore= data.latestScore as Record<string,unknown> | null;
  const energyData = data.energyData  as Record<string,unknown> | null;
  const fraudFlags = data.fraudFlags  as unknown[] ?? [];

  const st       = STATUS_META[String(asset.verification_status ?? "submitted")] ?? STATUS_META["submitted"];
  const score    = Number(asset.collateral_score ?? 0);
  const ltv      = Number(asset.ltv ?? 55);
  const value    = Number(asset.declared_value_usd ?? 0);
  const certId   = String(data.certificate_id ?? asset.certificate_id ?? "");
  const pipeStep = (() => {
    const map: Record<string,number> = {
      submitted:1, under_review:2, partner_required:2,
      additional_documents:2, provenance_review:3,
      custody_pending:4, risk_scoring:5,
      approved:7, collateral_eligible:8,
    };
    return map[String(asset.verification_status)] ?? 1;
  })();

  return (
    <div style={{ minHeight:"100vh", background:"#060810", color:"#f0f0f0" }}>

      {/* Header */}
      <header style={{ height:48, padding:"0 1.5rem",
                       display:"flex", alignItems:"center", justifyContent:"space-between",
                       borderBottom:"1px solid rgba(255,255,255,0.06)",
                       background:"rgba(6,8,16,0.98)", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem" }}>
          <a href="/" style={{ fontSize:"0.88rem", fontWeight:900, color:"#C8A96E",
                               fontFamily:MONO, letterSpacing:"0.1em", textDecoration:"none" }}>
            ABRAXAS
          </a>
          <span style={{ fontSize:"0.32rem", color:"rgba(255,255,255,0.18)",
                         fontFamily:MONO, letterSpacing:"0.25em", textTransform:"uppercase" }}>
            ASSET DETAIL
          </span>
        </div>
        <a href="/" style={{ padding:"0.3rem 0.625rem", borderRadius:"4px",
                             border:"1px solid rgba(255,255,255,0.08)",
                             color:"rgba(255,255,255,0.35)", fontSize:"0.46rem",
                             textDecoration:"none", fontFamily:MONO }}>← Portfolio</a>
      </header>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"2rem 1rem 5rem" }}>

        {/* Hero row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto",
                      gap:"1.5rem", alignItems:"flex-start", marginBottom:"2rem" }}>
          <div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:5,
                          padding:"0.15rem 0.5rem", borderRadius:"3px",
                          border:`1px solid ${st.color}25`,
                          background:`${st.color}08`, marginBottom:"0.75rem" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:st.color }}/>
              <span style={{ fontSize:"0.4rem", fontWeight:700, color:st.color,
                             fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.1em" }}>
                {st.label}
              </span>
            </div>
            <h1 style={{ fontWeight:900, fontSize:"clamp(1.5rem,3.5vw,2.5rem)",
                         color:"#f0f0f0", margin:"0 0 0.3rem", letterSpacing:"-0.04em", lineHeight:1 }}>
              {String(asset.title ?? "Unnamed Asset")}
            </h1>
            <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,0.3)",
                          fontFamily:MONO }}>{String(asset.category ?? "")}</div>
          </div>

          {/* Score ring */}
          {score > 0 && (
            <div style={{ textAlign:"center" }}>
              <svg width={72} height={72} style={{ transform:"rotate(-90deg)" }}>
                <circle cx={36} cy={36} r={30} fill="none"
                        stroke="rgba(255,255,255,0.07)" strokeWidth={4}/>
                <circle cx={36} cy={36} r={30} fill="none"
                        stroke={score>=80?"#14F195":score>=60?"#FBBF24":"#f26b6b"}
                        strokeWidth={4}
                        strokeDasharray={2*Math.PI*30}
                        strokeDashoffset={2*Math.PI*30*(1-score/100)}
                        strokeLinecap="round"/>
              </svg>
              <div style={{ marginTop:-56, marginBottom:42,
                            fontSize:"1.1rem", fontWeight:900,
                            color: score>=80?"#14F195":score>=60?"#FBBF24":"#f26b6b",
                            fontFamily:MONO, lineHeight:1 }}>
                {score}
              </div>
              <div style={{ fontSize:"0.34rem", color:"rgba(255,255,255,0.2)",
                            fontFamily:MONO, textTransform:"uppercase",
                            letterSpacing:"0.1em" }}>Score</div>
            </div>
          )}
        </div>

        {/* Pipeline bar */}
        <div style={{ marginBottom:"2rem" }}>
          <div style={{ display:"flex", gap:2, marginBottom:"0.3rem" }}>
            {PIPELINE.map((_,i) => (
              <div key={i} style={{ flex:1, height:3, borderRadius:2,
                                    background:i<pipeStep ? "#14F195"
                                             : i===pipeStep-1 ? "#FBBF24"
                                             : "rgba(255,255,255,0.07)",
                                    transition:"background 0.4s" }}/>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
                           fontFamily:MONO }}>
              {PIPELINE[pipeStep-1] ?? "Not started"}
            </span>
            <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.18)",
                           fontFamily:MONO }}>{pipeStep}/{PIPELINE.length}</span>
          </div>
        </div>

        {/* Main two-col layout */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:"1.5rem",
                      alignItems:"start" }}>

          {/* Left: tabs */}
          <div>
            {/* Tab nav */}
            <div style={{ display:"flex", gap:2, marginBottom:"1.25rem",
                          border:"1px solid rgba(255,255,255,0.07)", borderRadius:"7px",
                          padding:"3px", background:"rgba(255,255,255,0.02)" }}>
              {(["overview","timeline","certificate"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex:1, padding:"0.5rem", borderRadius:"5px",
                  border:"none", cursor:"pointer",
                  fontFamily:MONO, fontSize:"0.48rem", fontWeight:tab===t?800:400,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  background:tab===t?"rgba(255,255,255,0.06)":"transparent",
                  color:tab===t?"#f0f0f0":"rgba(255,255,255,0.3)",
                  transition:"all 0.15s",
                }}>{t}</button>
              ))}
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                {/* Key metrics */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1,
                              border:"1px solid rgba(255,255,255,0.08)", borderRadius:"8px",
                              overflow:"hidden", background:"rgba(255,255,255,0.04)" }}>
                  {([
                    ["Declared Value", fmt(value)],
                    ["LTV Cap",        `${ltv}%`],
                    ["Max Borrow",     score>0 ? `${fmt(Math.round(value*ltv/100))} USDC` : "Pending"],
                    ["Risk Tier",      String(latestScore?.risk_tier ?? "—")],
                    ["Events",         String(data.eventCount ?? 0)],
                    ["Provenance",     String(data.provenanceCount ?? 0)+" records"],
                  ] as [string,string][]).map(([k,v]) => (
                    <div key={k} style={{ padding:"0.875rem",
                                          background:"rgba(6,8,16,0.9)" }}>
                      <div style={{ fontSize:"0.36rem", fontWeight:700, fontFamily:MONO,
                                    textTransform:"uppercase", letterSpacing:"0.12em",
                                    color:"rgba(255,255,255,0.2)", marginBottom:4 }}>{k}</div>
                      <div style={{ fontSize:"0.72rem", fontWeight:800,
                                    color:"#f0f0f0", fontFamily:MONO }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Custody */}
                {custody && (
                  <div style={{ padding:"1rem 1.25rem",
                                border:"1px solid rgba(107,140,255,0.15)",
                                borderRadius:"8px", background:"rgba(107,140,255,0.03)" }}>
                    <div style={{ fontSize:"0.4rem", fontWeight:700, fontFamily:MONO,
                                  textTransform:"uppercase", letterSpacing:"0.15em",
                                  color:"rgba(107,140,255,0.5)", marginBottom:"0.625rem" }}>
                      Custody Record
                    </div>
                    {([
                      ["Custodian",       String(custody.custodian_name ?? "")],
                      ["Facility",        String(custody.facility_location ?? "")],
                      ["Vault Ref",       String(custody.vault_ref ?? "")],
                      ["Status",          String(custody.status ?? "")],
                      ["Last Audit",      custody.last_audit_at ? new Date(String(custody.last_audit_at)).toLocaleDateString() : "Pending"],
                      ["Next Audit Due",  custody.next_audit_due ? new Date(String(custody.next_audit_due)).toLocaleDateString() : "—"],
                    ] as [string,string][]).map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                            padding:"0.3rem 0",
                                            borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.25)",
                                       fontFamily:MONO, textTransform:"uppercase",
                                       letterSpacing:"0.1em" }}>{k}</span>
                        <span style={{ fontSize:"0.46rem", fontWeight:600,
                                       color:"rgba(255,255,255,0.6)", fontFamily:MONO }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Energy data */}
                {energyData && (
                  <div style={{ padding:"1rem 1.25rem",
                                border:"1px solid rgba(212,175,55,0.15)",
                                borderRadius:"8px", background:"rgba(212,175,55,0.03)" }}>
                    <div style={{ fontSize:"0.4rem", fontWeight:700, fontFamily:MONO,
                                  textTransform:"uppercase", letterSpacing:"0.15em",
                                  color:"rgba(212,175,55,0.5)", marginBottom:"0.625rem" }}>
                      Energy / Mineral Rights Data
                    </div>
                    {([
                      ["Interest Type",  String(energyData.interest_type ?? "")],
                      ["Reserve Category", String(energyData.reserve_category ?? "—")],
                      ["Working Interest", energyData.working_interest_pct ? `${(Number(energyData.working_interest_pct)*100).toFixed(1)}%` : "—"],
                      ["Title Status",   String(energyData.title_status ?? "pending")],
                      ["Net Acres",      energyData.net_acres ? String(energyData.net_acres) : "—"],
                    ] as [string,string][]).map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                            padding:"0.3rem 0",
                                            borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:"0.4rem", color:"rgba(255,255,255,0.25)",
                                       fontFamily:MONO, textTransform:"uppercase",
                                       letterSpacing:"0.1em" }}>{k}</span>
                        <span style={{ fontSize:"0.46rem", fontWeight:600,
                                       color:"rgba(255,255,255,0.6)", fontFamily:MONO }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fraud flags */}
                {fraudFlags.length > 0 && (
                  <div style={{ padding:"1rem 1.25rem",
                                border:"1px solid rgba(242,107,107,0.2)",
                                borderRadius:"8px", background:"rgba(242,107,107,0.04)" }}>
                    <div style={{ fontSize:"0.4rem", fontWeight:700, fontFamily:MONO,
                                  textTransform:"uppercase", letterSpacing:"0.15em",
                                  color:"rgba(242,107,107,0.6)", marginBottom:"0.5rem" }}>
                      Active Flags ({fraudFlags.length})
                    </div>
                    {(fraudFlags as Record<string,unknown>[]).map((flag,i) => (
                      <div key={i} style={{ fontSize:"0.48rem",
                                            color:"rgba(242,107,107,0.7)", lineHeight:1.6 }}>
                        ⚠ {String(flag.description ?? flag.flag_type)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {tab === "timeline" && (
              <LiveEventFeed assetId={String(asset.id ?? "")} />
            )}

            {/* Certificate */}
            {tab === "certificate" && (
              certId
                ? <CertificateDisplay certificateId={certId} />
                : (
                  <div style={{ padding:"2rem", textAlign:"center",
                                border:"1px solid rgba(255,255,255,0.07)",
                                borderRadius:"8px", fontSize:"0.58rem",
                                color:"rgba(255,255,255,0.2)" }}>
                    Certificate minted after full verification completes.
                  </div>
                )
            )}
          </div>

          {/* Right: borrow panel */}
          <BorrowPanel
            assetId={String(asset.id ?? "")}
            ltv={ltv}
            collateralScore={score || null}
            estimatedUsdValue={value}
            verificationStatus={String(asset.verification_status ?? "submitted")}
          />
        </div>
      </div>
    </div>
  );
}