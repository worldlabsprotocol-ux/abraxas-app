// FILE: app/admin/page.tsx. v2 PROTOCOL ARCHITECTURE
// Full operational verification center with partner assignment,
// stage advancement, document tracking, and audit trail.
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useAbraStore }        from "@/lib/abraxasStore";
import { STATUS_LABEL,
         STATUS_COLOR,
         STATUS_STEP }         from "@/lib/abraxasStore";
import {
  ASSET_CLASS_REGISTRY,
  PARTNER_REGISTRY,
  getPartnersByType,
}                              from "@/lib/protocol";
import type { VerificationRecord } from "@/lib/protocol/verificationEngine";

const MONO      = "'JetBrains Mono',monospace";

function fmtUsd(n:number) {
  return n>=1e6?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n}`;
}
function shortKey(k:string) { return k?`${k.slice(0,8)}...${k.slice(-4)}`:"-"; }
function ts(n:number) {
  return n ? new Date(n).toISOString().replace("T"," ").slice(0,19)+" UTC" : "-";
}

// ── Stage advancement modal ───────────────────────────────────────────────────
function AdvanceModal({
  assetId, currentStage, assetClass, onClose, onAdvanced,
}:{
  assetId:string; currentStage:number; assetClass:string;
  onClose:()=>void; onAdvanced:()=>void;
}) {
  const [partnerId, setPartnerId] = useState("");
  const [result,    setResult]    = useState<"pass"|"fail">("pass");
  const [note,      setNote]      = useState("");
  const [docs,      setDocs]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const def = ASSET_CLASS_REGISTRY[assetClass as keyof typeof ASSET_CLASS_REGISTRY];
  const stage = def?.verificationStages[currentStage-1];
  const partners = stage ? getPartnersByType(stage.partnerType) : [];

  async function submit() {
    if (!note.trim()) { setError("Review note required."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/verification/${assetId}/advance`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          partnerId:         partnerId || "ADMIN_MANUAL",
          partnerName:       PARTNER_REGISTRY.find(p=>p.id===partnerId)?.name ?? "Admin Manual",
          stageResult:       result,
          notes:             note,
          documentsProvided: docs.split(",").map(d=>d.trim()).filter(Boolean),
          critical:          result==="fail",
        }),
      });
      if (!res.ok) throw new Error("API error");
      onAdvanced();
    } catch { setError("Failed to advance stage. Check Supabase connection."); }
    finally  { setLoading(false); }
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500,
      background:"rgba(0,0,0,0.8)", display:"flex",
      alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div style={{ width:"100%", maxWidth:480,
        background:"#0d1017", borderRadius:"10px",
        border:"1px solid rgba(255,255,255,0.1)",
        overflow:"hidden" }}>
        <div style={{ padding:"0.875rem 1rem",
          borderBottom:"1px solid rgba(255,255,255,0.06)",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontWeight:700, fontSize:"0.64rem", color:"#f0f0f0", fontFamily:MONO }}>
            Advance Stage {currentStage}. {stage?.name ?? "Unknown"}
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none",
            cursor:"pointer", color:"rgba(255,255,255,0.3)", fontSize:"1rem" }}>×</button>
        </div>
        <div style={{ padding:"1rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>

          {/* Partner selector */}
          <div>
            <div style={{ fontSize:"0.38rem", fontWeight:700,
              color:"rgba(255,255,255,0.25)", fontFamily:MONO,
              textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.3rem" }}>
              Authorized Partner
            </div>
            <select value={partnerId} onChange={e=>setPartnerId(e.target.value)}
              style={{ width:"100%", padding:"0.55rem 0.75rem",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"5px", color:"#f0f0f0",
                fontSize:"0.52rem", fontFamily:MONO, outline:"none" }}>
              <option value="">Select partner or manual</option>
              {partners.map(p=>(
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="ADMIN_MANUAL">Admin Manual Review</option>
            </select>
          </div>

          {/* Pass / Fail */}
          <div>
            <div style={{ fontSize:"0.38rem", fontWeight:700,
              color:"rgba(255,255,255,0.25)", fontFamily:MONO,
              textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.3rem" }}>
              Stage Result
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1,
              background:"rgba(255,255,255,0.06)", borderRadius:"5px", overflow:"hidden" }}>
              {(["pass","fail"] as const).map(r=>(
                <button key={r} onClick={()=>setResult(r)} style={{
                  padding:"0.55rem", border:"none", cursor:"pointer",
                  fontFamily:MONO, fontSize:"0.5rem", fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  background: result===r
                    ? r==="pass"?"rgba(20,241,149,0.15)":"rgba(242,107,107,0.12)"
                    : "rgba(6,8,16,0.98)",
                  color: result===r
                    ? r==="pass"?"#14F195":"#f26b6b"
                    : "rgba(255,255,255,0.3)",
                  borderBottom: result===r
                    ? `2px solid ${r==="pass"?"#14F195":"#f26b6b"}`
                    : "2px solid transparent",
                }}>{r==="pass"?"Pass Stage":"Fail / Request Docs"}</button>
              ))}
            </div>
          </div>

          {/* Documents received */}
          <div>
            <div style={{ fontSize:"0.38rem", fontWeight:700,
              color:"rgba(255,255,255,0.25)", fontFamily:MONO,
              textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.3rem" }}>
              Documents Received (comma separated)
            </div>
            <input value={docs} onChange={e=>setDocs(e.target.value)}
              placeholder={stage?.documents.join(", ")}
              style={{ width:"100%", padding:"0.55rem 0.75rem",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"5px", color:"#f0f0f0",
                fontSize:"0.48rem", fontFamily:MONO, outline:"none",
                boxSizing:"border-box" }} />
          </div>

          {/* Review note */}
          <div>
            <div style={{ fontSize:"0.38rem", fontWeight:700,
              color:"rgba(255,255,255,0.25)", fontFamily:MONO,
              textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.3rem" }}>
              Review Note (required) *
            </div>
            <textarea value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Describe findings, conditions, or reasons for pass/fail..."
              style={{ width:"100%", padding:"0.55rem 0.75rem",
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:"5px", color:"#f0f0f0", fontSize:"0.5rem",
                fontFamily:"inherit", resize:"vertical", minHeight:80,
                outline:"none", boxSizing:"border-box" }} />
          </div>

          {error && (
            <div style={{ padding:"0.4rem 0.625rem",
              background:"rgba(242,107,107,0.08)",
              border:"1px solid rgba(242,107,107,0.2)",
              borderRadius:"4px", fontSize:"0.46rem", color:"#f26b6b" }}>
              {error}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            <button onClick={onClose} style={{
              padding:"0.65rem", borderRadius:"6px",
              border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer",
              fontWeight:700, fontSize:"0.52rem", fontFamily:MONO,
              background:"transparent", color:"rgba(255,255,255,0.4)" }}>
              Cancel
            </button>
            <button onClick={submit} disabled={loading||!note.trim()} style={{
              padding:"0.65rem", borderRadius:"6px", border:"none",
              cursor: loading||!note.trim() ? "not-allowed" : "pointer",
              fontWeight:700, fontSize:"0.52rem", fontFamily:MONO,
              background: loading||!note.trim()
                ? "rgba(255,255,255,0.07)"
                : result==="pass" ? "#14F195" : "#f26b6b",
              color: loading||!note.trim() ? "rgba(255,255,255,0.2)" : "#000" }}>
              {loading?"Submitting...":result==="pass"?"Advance Stage":"Reject / Request Docs"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [mounted,   setMounted]   = useState(false);
  const [tab,       setTab]       = useState<"queue"|"all"|"partners"|"logs">("queue");
  const [selected,  setSelected]  = useState<string|null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [refresh,   setRefresh]   = useState(0);

  const assets      = useAbraStore(s=>s.assets);
  const updateStatus= useAbraStore(s=>s.updateAssetStatus);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const queue    = assets.filter(a=>["created","pending_documents","pending_identity",
    "pending_appraisal","pending_custody","pending_verification"].includes(a.status));
  const complete = assets.filter(a=>["verified","collateral_eligible","borrowed","listed"].includes(a.status));
  const selected_asset = assets.find(a=>a.id===selected);
  const def = selected_asset
    ? ASSET_CLASS_REGISTRY[selected_asset.assetClass as keyof typeof ASSET_CLASS_REGISTRY]
    : null;

  const viewList = tab==="queue" ? queue : tab==="all" ? assets : [];

  return (
    <div style={{ minHeight:"100vh", background:"#060810", color:"#f0f0f0" }}>

      {/* Advance modal */}
      {advancing && selected_asset && (
        <AdvanceModal
          assetId={selected_asset.id}
          currentStage={STATUS_STEP[selected_asset.status]??1}
          assetClass={selected_asset.assetClass}
          onClose={()=>setAdvancing(false)}
          onAdvanced={()=>{ setAdvancing(false); setRefresh(r=>r+1); }}
        />
      )}

      {/* Header */}
      <header style={{ height:52, padding:"0 1.5rem",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        position:"sticky", top:0, zIndex:100,
        background:"rgba(6,8,16,0.98)", backdropFilter:"blur(12px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
          <a href="/" style={{ fontWeight:900, fontSize:"0.9rem", color:"#C8A96E",
            fontFamily:MONO, letterSpacing:"0.1em", textDecoration:"none" }}>ABRAXAS</a>
          <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
            fontFamily:MONO, letterSpacing:"0.2em", textTransform:"uppercase" }}>
            Verification Operations
          </span>
        </div>
        <a href="/" style={{ padding:"0.3rem 0.625rem", borderRadius:"4px",
          border:"1px solid rgba(255,255,255,0.08)",
          color:"rgba(255,255,255,0.35)", fontSize:"0.46rem",
          textDecoration:"none", fontFamily:MONO }}>← App</a>
      </header>

      <div style={{ maxWidth:1100, margin:"0 auto", padding:"1.5rem 1rem 5rem" }}>

        {/* Stats */}
        <div style={{ display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",
          gap:1, background:"rgba(255,255,255,0.06)",
          border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px", overflow:"hidden", marginBottom:"1.5rem" }}>
          {([
            ["Pending Review",   queue.length.toString(),    "#FBBF24"],
            ["Verified",        complete.length.toString(),  "#14F195"],
            ["Total Assets",    assets.length.toString(),    "#f0f0f0"],
            ["Active Partners", PARTNER_REGISTRY.filter(p=>p.active).length.toString(),"#C8A96E"],
            ["Tribal Assets",   assets.filter(a=>["Mineral Rights","Tribal Land Asset","Real Estate Parcel"].includes(a.assetClass)).length.toString(),"#C8A96E"],
          ] as [string,string,string][]).map(([l,v,c])=>(
            <div key={l} style={{ padding:"0.875rem 1rem",
              background:"rgba(6,8,16,0.99)" }}>
              <div style={{ fontSize:"1rem", fontWeight:900, color:c,
                fontFamily:MONO, lineHeight:1, marginBottom:4 }}>{v}</div>
              <div style={{ fontSize:"0.36rem", color:"rgba(255,255,255,0.25)",
                fontFamily:MONO, textTransform:"uppercase",
                letterSpacing:"0.1em" }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:1, marginBottom:"1rem",
          background:"rgba(255,255,255,0.05)", borderRadius:"6px",
          overflow:"hidden", border:"1px solid rgba(255,255,255,0.06)" }}>
          {([
            ["queue",    `Queue (${queue.length})`],
            ["all",      `All Assets (${assets.length})`],
            ["partners", `Partners (${PARTNER_REGISTRY.filter(p=>p.active).length})`],
            ["logs",     "Audit Log"],
          ] as [string,string][]).map(([id,label])=>(
            <button key={id} onClick={()=>{setTab(id as typeof tab);setSelected(null);}}
              style={{ flex:1, padding:"0.6rem", border:"none", cursor:"pointer",
                fontFamily:MONO, fontSize:"0.46rem", fontWeight:700,
                letterSpacing:"0.06em", textTransform:"uppercase",
                background: tab===id?"rgba(124,58,237,0.15)":"transparent",
                color: tab===id?"#a78bfa":"rgba(255,255,255,0.3)",
                borderBottom: tab===id?"2px solid #7c3aed":"2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Partners tab */}
        {tab==="partners"&&(
          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            {PARTNER_REGISTRY.map(p=>(
              <div key={p.id} style={{ padding:"0.875rem 1rem",
                border:"1px solid rgba(255,255,255,0.06)",
                borderRadius:"7px", background:"rgba(255,255,255,0.01)" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"flex-start", gap:"1rem", flexWrap:"wrap" }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:"0.62rem",
                      color:"#f0f0f0", marginBottom:3 }}>{p.name}</div>
                    <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.25)",
                      fontFamily:MONO, marginBottom:4 }}>
                      {p.type.replace(/_/g," ")} · {p.jurisdictions.join(", ")}
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"0.25rem" }}>
                      {p.assetClasses.map(ac=>(
                        <span key={ac} style={{ fontSize:"0.32rem",
                          color:"rgba(200,169,110,0.6)",
                          fontFamily:MONO, padding:"0.1rem 0.375rem",
                          borderRadius:"3px",
                          background:"rgba(200,169,110,0.07)",
                          border:"1px solid rgba(200,169,110,0.15)" }}>{ac}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4,
                    padding:"0.2rem 0.5rem", borderRadius:"3px",
                    background: p.active?"rgba(20,241,149,0.07)":"rgba(255,255,255,0.04)",
                    border:`1px solid ${p.active?"rgba(20,241,149,0.2)":"rgba(255,255,255,0.08)"}`,
                    flexShrink:0 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%",
                      background: p.active?"#14F195":"rgba(255,255,255,0.2)" }}/>
                    <span style={{ fontSize:"0.34rem", fontWeight:700,
                      color: p.active?"#14F195":"rgba(255,255,255,0.3)",
                      fontFamily:MONO }}>
                      {p.active?"Active":"Inactive"}
                    </span>
                  </div>
                </div>
                {p.notes&&<div style={{ marginTop:"0.4rem", fontSize:"0.42rem",
                  color:"rgba(255,255,255,0.25)", fontStyle:"italic" }}>{p.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Queue / All. two column */}
        {(tab==="queue"||tab==="all")&&(
          <div style={{ display:"grid",
            gridTemplateColumns: selected_asset?"1fr 1fr":"1fr", gap:"1rem" }}>

            {/* Asset list */}
            <div style={{ border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:"8px", overflow:"hidden" }}>
              <div style={{ display:"grid",
                gridTemplateColumns:"2fr 1fr 1fr 1fr",
                padding:"0.45rem 1rem", gap:"0.5rem",
                borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                {["Asset","Value","ABRA","Status"].map(h=>(
                  <div key={h} style={{ fontSize:"0.34rem", fontWeight:700,
                    color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                    textTransform:"uppercase", letterSpacing:"0.14em" }}>{h}</div>
                ))}
              </div>
              {viewList.length===0?(
                <div style={{ padding:"2.5rem", textAlign:"center",
                  fontSize:"0.54rem", color:"rgba(255,255,255,0.18)" }}>
                  {tab==="queue"?"No pending assets":"No assets on record"}
                </div>
              ):viewList.map(a=>{
                const stColor = STATUS_COLOR[a.status]??"#C8A96E";
                const isTribal = ["Mineral Rights","Tribal Land Asset","Real Estate Parcel"].includes(a.assetClass);
                return(
                  <div key={a.id} onClick={()=>setSelected(sel=>sel===a.id?null:a.id)}
                    style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr",
                      padding:"0.75rem 1rem", gap:"0.5rem", alignItems:"center",
                      cursor:"pointer",
                      background: selected===a.id?"rgba(124,58,237,0.08)":"transparent",
                      borderBottom:"1px solid rgba(255,255,255,0.04)",
                      transition:"background 0.1s" }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:"0.6rem", color:"#f0f0f0",
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                        display:"flex", alignItems:"center", gap:"0.3rem" }}>
                        {isTribal&&<span style={{ fontSize:"0.38rem",
                          color:"#C8A96E" }}>⚖</span>}
                        {a.name}
                      </div>
                      <div style={{ fontSize:"0.34rem",
                        color:"rgba(255,255,255,0.25)", fontFamily:MONO, marginTop:2 }}>
                        {a.assetClass}
                      </div>
                    </div>
                    <div style={{ fontSize:"0.54rem", fontWeight:700,
                      color:"#f0f0f0", fontFamily:MONO }}>
                      {a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"Pending"}
                    </div>
                    <div style={{ fontSize:"0.5rem", color:"#C8A96E", fontFamily:MONO }}>
                      {a.mintCostAbra}
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:5, height:5, borderRadius:"50%",
                        background:stColor, flexShrink:0 }}/>
                      <span style={{ fontSize:"0.34rem", fontWeight:600,
                        color:stColor, fontFamily:MONO, textTransform:"uppercase",
                        letterSpacing:"0.06em" }}>
                        {STATUS_LABEL[a.status]??a.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail panel */}
            {selected_asset&&(
              <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                {/* Asset info */}
                <div style={{ padding:"1rem",
                  border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:"8px" }}>
                  <div style={{ fontSize:"0.34rem", fontWeight:700,
                    color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                    textTransform:"uppercase", letterSpacing:"0.15em",
                    marginBottom:"0.5rem" }}>Asset Review</div>
                  <div style={{ fontWeight:900, fontSize:"0.88rem",
                    color:"#f0f0f0", marginBottom:"0.5rem" }}>
                    {selected_asset.name}
                  </div>

                  {def&&(
                    <div style={{ padding:"0.5rem 0.625rem",
                      background:"rgba(255,255,255,0.02)",
                      border:"1px solid rgba(255,255,255,0.06)",
                      borderRadius:"5px", marginBottom:"0.75rem" }}>
                      <div style={{ fontSize:"0.34rem", fontWeight:700,
                        color:`${def.color}60`, fontFamily:MONO,
                        textTransform:"uppercase", marginBottom:3 }}>
                        {def.name} · {def.category} · {def.ltv}% LTV
                      </div>
                      <div style={{ fontSize:"0.42rem",
                        color:"rgba(255,255,255,0.35)", lineHeight:1.55 }}>
                        {def.verificationStages.length} verification stages · {def.requiredDocuments.length} required documents
                      </div>
                    </div>
                  )}

                  {([
                    ["Declared Value", selected_asset.estimatedUsd>0?fmtUsd(selected_asset.estimatedUsd):"Not provided"],
                    ["LTV Cap",        `${selected_asset.ltv}%`],
                    ["ABRA Spent",     `${selected_asset.mintCostAbra}`],
                    ["Wallet",         shortKey(selected_asset.ownerWallet)],
                    ["Token ID",       shortKey(selected_asset.tokenId||"pending")],
                    ["Tx",             shortKey(selected_asset.txSignature||"pending")],
                  ] as [string,string][]).map(([k,v])=>(
                    <div key={k} style={{ display:"flex",
                      justifyContent:"space-between", padding:"0.3rem 0",
                      borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize:"0.4rem",
                        color:"rgba(255,255,255,0.25)", fontFamily:MONO,
                        textTransform:"uppercase", letterSpacing:"0.1em" }}>{k}</span>
                      <span style={{ fontSize:"0.42rem", fontWeight:600,
                        color:"rgba(255,255,255,0.6)", fontFamily:MONO }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Stage advancement */}
                <div style={{ padding:"1rem",
                  border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:"8px" }}>
                  <div style={{ fontSize:"0.34rem", fontWeight:700,
                    color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                    textTransform:"uppercase", letterSpacing:"0.15em",
                    marginBottom:"0.75rem" }}>Verification Actions</div>

                  {def&&(
                    <div style={{ marginBottom:"0.75rem" }}>
                      <div style={{ fontSize:"0.36rem",
                        color:"rgba(255,255,255,0.25)", marginBottom:"0.4rem" }}>
                        Current stage: {STATUS_STEP[selected_asset.status]??1} of {def.verificationStages.length}
                      </div>
                      <div style={{ height:2,
                        background:"rgba(255,255,255,0.07)",
                        borderRadius:1, marginBottom:"0.25rem" }}>
                        <div style={{ height:"100%", borderRadius:1,
                          background:"linear-gradient(90deg,#7c3aed,#14F195)",
                          width:`${((STATUS_STEP[selected_asset.status]??1)/def.verificationStages.length)*100}%`,
                          transition:"width 0.4s ease" }}/>
                      </div>
                    </div>
                  )}

                  <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                    <button onClick={()=>setAdvancing(true)} style={{
                      padding:"0.7rem", borderRadius:"6px",
                      cursor:"pointer", fontWeight:700, fontSize:"0.56rem",
                      fontFamily:MONO, background:"rgba(20,241,149,0.12)",
                      color:"#14F195",
                      border:"1px solid rgba(20,241,149,0.25)" }}>
                      Advance Verification Stage
                    </button>
                    <button onClick={()=>updateStatus(selected_asset.id,"rejected")}
                      style={{ padding:"0.6rem", borderRadius:"6px",
                        border:"1px solid rgba(242,107,107,0.2)",
                        cursor:"pointer", fontWeight:700, fontSize:"0.52rem",
                        fontFamily:MONO, background:"rgba(242,107,107,0.07)",
                        color:"#f26b6b" }}>
                      Reject Asset
                    </button>
                  </div>
                </div>

                {/* Required documents for current asset class */}
                {def&&(
                  <div style={{ padding:"1rem",
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"8px" }}>
                    <div style={{ fontSize:"0.34rem", fontWeight:700,
                      color:"rgba(255,255,255,0.2)", fontFamily:MONO,
                      textTransform:"uppercase", letterSpacing:"0.15em",
                      marginBottom:"0.625rem" }}>
                      Required Documentation
                    </div>
                    {def.requiredDocuments.map((doc,i)=>(
                      <div key={i} style={{ display:"flex", gap:"0.5rem",
                        padding:"0.3rem 0",
                        borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontSize:"0.4rem",
                          color:"rgba(255,255,255,0.18)", fontFamily:MONO,
                          flexShrink:0 }}>{String(i+1).padStart(2,"0")}</span>
                        <span style={{ fontSize:"0.46rem",
                          color:"rgba(255,255,255,0.45)", lineHeight:1.5 }}>{doc}</span>
                      </div>
                    ))}
                    {def.regulatoryNotes&&(
                      <div style={{ marginTop:"0.625rem", padding:"0.5rem 0.625rem",
                        background:"rgba(200,169,110,0.05)",
                        border:"1px solid rgba(200,169,110,0.15)",
                        borderRadius:"5px",
                        fontSize:"0.4rem", color:"rgba(200,169,110,0.55)",
                        lineHeight:1.65 }}>
                        {def.regulatoryNotes.slice(0,280)}
                        {def.regulatoryNotes.length>280?"…":""}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Audit log tab */}
        {tab==="logs"&&(
          <div style={{ border:"1px solid rgba(255,255,255,0.06)",
            borderRadius:"8px", overflow:"hidden" }}>
            {assets.length===0?(
              <div style={{ padding:"2rem", textAlign:"center",
                fontSize:"0.54rem", color:"rgba(255,255,255,0.18)" }}>
                No events to display
              </div>
            ):assets.map(a=>(
              <div key={a.id} style={{ padding:"0.625rem 1rem",
                borderBottom:"1px solid rgba(255,255,255,0.04)",
                display:"grid", gridTemplateColumns:"1fr 3fr",
                gap:"0.75rem", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:"0.44rem", fontWeight:700,
                    color:"#f0f0f0" }}>{a.name}</div>
                  <div style={{ fontSize:"0.34rem",
                    color:"rgba(255,255,255,0.25)", fontFamily:MONO }}>
                    {a.assetClass} · {shortKey(a.ownerWallet)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:"0.38rem",
                    color:"rgba(20,241,149,0.6)", fontFamily:MONO,
                    marginBottom:2 }}>SUBMISSION_RECEIVED</div>
                  <div style={{ fontSize:"0.38rem",
                    color:"rgba(255,255,255,0.3)" }}>
                    ABRA: {a.mintCostAbra} · Tx: {shortKey(a.txSignature||"-")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}