// FILE: components/music/MusicAuditTool.tsx
// Music catalog royalty audit — finds missing ISRCs, unregistered works,
// PRO gaps, and potential unclaimed royalties for Abraxas publishing clients.
"use client";

import { useState } from "react";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const G    = "#10B981";
const A    = "#F59E0B";
const R    = "#EF4444";
const B    = "#3B82F6";
const P    = "#8B5CF6";
const BDR  = "#1C2333";
const CARD = "#0D1117";
const W    = "#F8FAFC";

type PRO  = "ASCAP" | "BMI" | "SESAC" | "SoundExchange" | "SOCAN" | "PRS" | "none";
type Gap  = { severity: "critical" | "high" | "medium"; issue: string; fix: string; estRecovery?: string; };

interface Track {
  id:          string;
  title:       string;
  isrc?:       string;  // Recording identifier
  iswc?:       string;  // Composition identifier
  pro:         PRO;
  mlcRegistered: boolean;
  splitSheetSigned: boolean;
  releaseYear?: string;
  coWriters:   string;
  distributor: string;
}

function analyzeTrack(t: Track): Gap[] {
  const gaps: Gap[] = [];
  if (!t.isrc || t.isrc.trim() === "") gaps.push({
    severity: "critical",
    issue: `"${t.title}" has no ISRC code`,
    fix: "Request ISRC from your distributor (DistroKid, TuneCore, CD Baby) before next upload",
    estRecovery: "All streaming royalties for this recording are untracked",
  });
  if (!t.iswc || t.iswc.trim() === "") gaps.push({
    severity: "critical",
    issue: `"${t.title}" has no ISWC code`,
    fix: "Register the composition with your PRO (ASCAP/BMI/SESAC) to get an ISWC assigned",
    estRecovery: "All mechanical royalties (Spotify/Apple Music) are going to unmatched pool",
  });
  if (t.pro === "none") gaps.push({
    severity: "critical",
    issue: `"${t.title}" is not registered with any PRO`,
    fix: "Join ASCAP or BMI (free) and register this composition immediately",
    estRecovery: "All performance royalties (radio, streaming, TV) are uncollected",
  });
  if (!t.mlcRegistered) gaps.push({
    severity: "high",
    issue: `"${t.title}" not registered with the MLC`,
    fix: "Create a free publisher account at themlc.com and register all works",
    estRecovery: "US mechanical streaming royalties may be in unmatched pool",
  });
  if (!t.splitSheetSigned && t.coWriters.trim() !== "") gaps.push({
    severity: "high",
    issue: `"${t.title}" has co-writers but no signed split sheet`,
    fix: "Get a split sheet signed by all co-writers with exact percentages and PRO affiliations",
    estRecovery: "PRO may hold disputed share until resolved",
  });
  if (t.releaseYear && parseInt(t.releaseYear) < 2019 && !t.isrc) gaps.push({
    severity: "medium",
    issue: `"${t.title}" is an older release that may have unclaimed royalties`,
    fix: "Audit legacy releases — older catalog often has years of accumulated unclaimed royalties",
  });
  return gaps;
}

function emptyTrack(): Track {
  return { id: Date.now().toString(), title: "", isrc: "", iswc: "", pro: "none",
           mlcRegistered: false, splitSheetSigned: false,
           releaseYear: new Date().getFullYear().toString(),
           coWriters: "", distributor: "" };
}

const SEVERITY_COLOR = { critical: R, high: A, medium: B };
const PRO_OPTIONS: PRO[] = ["ASCAP", "BMI", "SESAC", "SoundExchange", "SOCAN", "PRS", "none"];

export function MusicAuditTool({ clientName }: { clientName?: string }) {
  const [tracks,    setTracks]    = useState<Track[]>([emptyTrack()]);
  const [audited,   setAudited]   = useState(false);
  const [allGaps,   setAllGaps]   = useState<{ track: string; gaps: Gap[] }[]>([]);
  const [showForm,  setShowForm]  = useState(true);

  const lbl: React.CSSProperties = {
    fontFamily:M, fontSize:"0.58rem", fontWeight:700, color:"rgba(255,255,255,0.35)",
    textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.2rem", display:"block",
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"0.4rem 0.5rem", borderRadius:4,
    border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.02)",
    color:W, fontFamily:S, fontSize:"16px", outline:"none", boxSizing:"border-box",
  };
  const sel: React.CSSProperties = { ...inp };

  function update(id: string, field: keyof Track, value: string | boolean) {
    setTracks(ts => ts.map(t => t.id === id ? { ...t, [field]: value } : t));
  }
  function addTrack() { setTracks(ts => [...ts, emptyTrack()]); }
  function removeTrack(id: string) { setTracks(ts => ts.filter(t => t.id !== id)); }

  function runAudit() {
    const results = tracks
      .filter(t => t.title.trim())
      .map(t => ({ track: t.title, gaps: analyzeTrack(t) }));
    setAllGaps(results);
    setAudited(true);
    setShowForm(false);
  }

  const criticalCount = allGaps.flatMap(r => r.gaps).filter(g => g.severity === "critical").length;
  const highCount     = allGaps.flatMap(r => r.gaps).filter(g => g.severity === "high").length;
  const cleanTracks   = allGaps.filter(r => r.gaps.length === 0).length;
  const totalGaps     = allGaps.flatMap(r => r.gaps).length;

  return (
    <div style={{ fontFamily:M, color:W }}>
      {/* Header */}
      <div style={{ padding:"1rem 1.125rem", background:CARD, border:`1px solid ${BDR}`,
                     borderRadius:"8px 8px 0 0", borderBottom:`1px solid ${G}30`,
                     display:"flex", justifyContent:"space-between", alignItems:"center",
                     flexWrap:"wrap", gap:"0.5rem" }}>
        <div>
          <div style={{ fontSize:"0.6rem", fontWeight:700, color:G,
                         letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:2 }}>
            ABRAXAS MUSIC AUDIT ENGINE
          </div>
          <div style={{ fontFamily:S, fontSize:"clamp(0.9rem,2vw,1.1rem)",
                         fontWeight:800, color:W }}>
            {clientName ? `Catalog Audit — ${clientName}` : "Royalty Gap Analysis"}
          </div>
        </div>
        {audited && (
          <button onClick={() => { setAudited(false); setShowForm(true); }}
            style={{ padding:"0.4rem 0.875rem", borderRadius:4, border:`1px solid ${BDR}`,
                      background:"transparent", color:"rgba(255,255,255,0.4)",
                      fontFamily:M, fontSize:"0.65rem", fontWeight:700, cursor:"pointer" }}>
            ← EDIT CATALOG
          </button>
        )}
      </div>

      {/* Results banner */}
      {audited && (
        <div style={{ padding:"0.875rem 1.125rem", background:`${A}08`,
                       borderBottom:`1px solid ${BDR}` }}>
          <div style={{ display:"grid",
                         gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                         gap:"0.5rem" }}>
            {[
              ["Total Tracks",    tracks.filter(t=>t.title).length, W],
              ["Clean",           cleanTracks,                       G],
              ["Critical Issues", criticalCount,                     R],
              ["High Priority",   highCount,                         A],
              ["Total Gaps",      totalGaps,                         B],
            ].map(([l,v,c]) => (
              <div key={l as string} style={{ padding:"0.5rem 0.75rem", background:CARD,
                                               border:`1px solid ${BDR}`, borderRadius:5 }}>
                <div style={{ fontSize:"0.55rem", color:"rgba(255,255,255,0.3)",
                               textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>
                  {l as string}
                </div>
                <div style={{ fontSize:"1.25rem", fontWeight:900, color: c as string }}>
                  {v as number}
                </div>
              </div>
            ))}
          </div>
          {criticalCount > 0 && (
            <div style={{ marginTop:"0.625rem", padding:"0.5rem 0.75rem", borderRadius:4,
                           background:`${R}10`, border:`1px solid ${R}30`,
                           fontSize:"0.65rem", color:R, lineHeight:1.6 }}>
              {criticalCount} critical issue{criticalCount>1?"s":""} found — streams may be untracked and royalties going to the unmatched pool. Fix these first.
            </div>
          )}
        </div>
      )}

      <div style={{ padding:"1rem 1.125rem", background:CARD,
                     border:`1px solid ${BDR}`, borderTop:"none",
                     borderRadius: showForm ? "0 0 8px 8px" : 0 }}>

        {/* ── FORM ── */}
        {showForm && (
          <div>
            <p style={{ fontFamily:S, fontSize:"0.78rem",
                         color:"rgba(255,255,255,0.45)", lineHeight:1.65, margin:"0 0 1rem" }}>
              Enter your catalog below. The audit engine checks every track for ISRC/ISWC codes,
              PRO registration, MLC filing, and split sheet status — the four most common causes
              of unclaimed royalties.
            </p>
            {tracks.map((t, idx) => (
              <div key={t.id} style={{ padding:"0.875rem", background:"rgba(255,255,255,0.02)",
                                        border:`1px solid ${BDR}`, borderRadius:6,
                                        marginBottom:"0.625rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                               alignItems:"center", marginBottom:"0.625rem" }}>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:G }}>
                    TRACK {idx+1}
                  </span>
                  {tracks.length > 1 && (
                    <button onClick={() => removeTrack(t.id)} style={{
                      padding:"0.2rem 0.4rem", borderRadius:3, border:`1px solid ${R}30`,
                      background:"transparent", color:R, fontSize:"0.6rem", cursor:"pointer",
                    }}>✕</button>
                  )}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                               gap:"0.5rem" }}>
                  <div>
                    <label style={lbl}>Track Title *</label>
                    <input type="text" value={t.title} style={inp}
                      onChange={e => update(t.id, "title", e.target.value)}
                      placeholder="Song title"/>
                  </div>
                  <div>
                    <label style={lbl}>ISRC Code</label>
                    <input type="text" value={t.isrc ?? ""} style={inp}
                      onChange={e => update(t.id, "isrc", e.target.value)}
                      placeholder="e.g. USRC17607839"/>
                  </div>
                  <div>
                    <label style={lbl}>ISWC Code</label>
                    <input type="text" value={t.iswc ?? ""} style={inp}
                      onChange={e => update(t.id, "iswc", e.target.value)}
                      placeholder="e.g. T-034524680-1"/>
                  </div>
                  <div>
                    <label style={lbl}>PRO Registration</label>
                    <select value={t.pro} style={sel}
                      onChange={e => update(t.id, "pro", e.target.value as PRO)}>
                      {PRO_OPTIONS.map(p => (
                        <option key={p} value={p}>{p === "none" ? "Not registered" : p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Distributor</label>
                    <input type="text" value={t.distributor} style={inp}
                      onChange={e => update(t.id, "distributor", e.target.value)}
                      placeholder="DistroKid, TuneCore, CD Baby..."/>
                  </div>
                  <div>
                    <label style={lbl}>Co-Writers (if any)</label>
                    <input type="text" value={t.coWriters} style={inp}
                      onChange={e => update(t.id, "coWriters", e.target.value)}
                      placeholder="Names comma-separated"/>
                  </div>
                  <div>
                    <label style={lbl}>Release Year</label>
                    <input type="text" value={t.releaseYear ?? ""} style={inp}
                      onChange={e => update(t.id, "releaseYear", e.target.value)}
                      placeholder="2023"/>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem",
                                 justifyContent:"flex-end" }}>
                    {[
                      ["mlcRegistered",    "Registered with MLC"],
                      ["splitSheetSigned", "Split sheet signed"],
                    ].map(([field, label]) => (
                      <label key={field} style={{ display:"flex", alignItems:"center",
                                                   gap:"0.5rem", cursor:"pointer" }}>
                        <input type="checkbox"
                          checked={t[field as keyof Track] as boolean}
                          onChange={e => update(t.id, field as keyof Track, e.target.checked)}
                          style={{ accentColor:G, width:14, height:14 }}/>
                        <span style={{ fontFamily:S, fontSize:"0.72rem",
                                        color:"rgba(255,255,255,0.5)" }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.75rem" }}>
              <button onClick={addTrack} style={{
                padding:"0.5rem 1rem", borderRadius:5, border:`1px solid ${BDR}`,
                background:"transparent", color:"rgba(255,255,255,0.45)",
                fontFamily:M, fontSize:"0.65rem", fontWeight:700, cursor:"pointer",
              }}>+ ADD TRACK</button>
              <button onClick={runAudit} disabled={!tracks.some(t => t.title.trim())} style={{
                flex:2, padding:"0.55rem 1rem", borderRadius:5, border:"none",
                background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
                fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
              }}>
                RUN CATALOG AUDIT →
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {audited && (
          <div>
            {allGaps.map(({ track, gaps }) => (
              <div key={track} style={{ marginBottom:"0.875rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                               marginBottom:"0.375rem" }}>
                  <div style={{
                    width:8, height:8, borderRadius:"50%",
                    background: gaps.length === 0 ? G : gaps.some(g=>g.severity==="critical") ? R : A,
                  }}/>
                  <span style={{ fontFamily:M, fontSize:"0.72rem", fontWeight:700, color:W }}>
                    {track}
                  </span>
                  {gaps.length === 0 && (
                    <span style={{ fontFamily:M, fontSize:"0.55rem", color:G,
                                    background:`${G}12`, border:`1px solid ${G}25`,
                                    borderRadius:3, padding:"1px 6px" }}>CLEAN</span>
                  )}
                </div>
                {gaps.length > 0 && (
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem",
                                 paddingLeft:"1.125rem" }}>
                    {gaps.map((gap, i) => (
                      <div key={i} style={{
                        padding:"0.5rem 0.75rem", borderRadius:5,
                        background:`${SEVERITY_COLOR[gap.severity]}08`,
                        border:`1px solid ${SEVERITY_COLOR[gap.severity]}25`,
                        borderLeft:`3px solid ${SEVERITY_COLOR[gap.severity]}`,
                      }}>
                        <div style={{ fontSize:"0.55rem", fontWeight:700,
                                       color:SEVERITY_COLOR[gap.severity],
                                       textTransform:"uppercase", letterSpacing:"0.1em",
                                       marginBottom:2 }}>{gap.severity}</div>
                        <div style={{ fontFamily:S, fontSize:"0.72rem", color:W,
                                       marginBottom:"0.2rem" }}>{gap.issue}</div>
                        <div style={{ fontFamily:S, fontSize:"0.65rem",
                                       color:"rgba(255,255,255,0.4)", lineHeight:1.55 }}>
                          Fix: {gap.fix}
                        </div>
                        {gap.estRecovery && (
                          <div style={{ fontFamily:M, fontSize:"0.58rem", color:A,
                                         marginTop:"0.2rem" }}>⚠ {gap.estRecovery}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Action summary */}
            {totalGaps > 0 && (
              <div style={{ marginTop:"1rem", padding:"0.875rem 1rem", borderRadius:6,
                             background:`${G}07`, border:`1px solid ${G}25` }}>
                <div style={{ fontSize:"0.6rem", fontWeight:700, color:G,
                               letterSpacing:"0.12em", textTransform:"uppercase",
                               marginBottom:"0.5rem" }}>NEXT STEPS WITH ABRAXAS</div>
                <ol style={{ fontFamily:S, fontSize:"0.72rem",
                              color:"rgba(255,255,255,0.5)", lineHeight:1.8,
                              margin:0, paddingLeft:"1.125rem" }}>
                  <li>Register missing works at ASCAP.com or BMI.com (free)</li>
                  <li>Claim MLC publisher account at themlc.com (free)</li>
                  <li>Request ISRC codes from your distributor for any missing recordings</li>
                  <li>Get split sheets signed for all co-written tracks</li>
                  <li>Once metadata is clean, tokenize your catalog on Abraxas</li>
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
