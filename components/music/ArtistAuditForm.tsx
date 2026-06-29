// FILE: components/music/ArtistAuditForm.tsx
// Self-service entry point, artists come to Abraxas, fill this out,
// get an instant gap analysis, and their request goes to Pablo's team.
"use client";

import { useState } from "react";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const G    = "#10B981";
const R    = "#EF4444";
const B    = "#3B82F6";

export function ArtistAuditForm({ theme = "light" }: { theme?: "light" | "dark" }) {
  const dark = theme === "dark";
  const CARD = dark ? "var(--surface-raised)" : "#FFFFFF";
  const W = dark ? "var(--text-primary)" : "#15151A";
  const BDR = dark ? "var(--border)" : "#E5E5E0";
  const muted = dark ? "var(--text-muted)" : "rgba(21,21,26,0.35)";
  const mutedMid = dark ? "var(--text-secondary)" : "rgba(21,21,26,0.45)";
  const inpBg = dark ? "var(--surface)" : "rgba(21,21,26,0.03)";

  const lbl: React.CSSProperties = {
    fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:muted,
    textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.25rem", display:"block",
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"0.5rem 0.625rem", borderRadius: dark ? 8 : 4,
    border:`1px solid ${BDR}`, background: inpBg,
    color: W, fontFamily:S, fontSize:"16px", outline:"none", boxSizing:"border-box",
  };
  const sel: React.CSSProperties = { ...inp };
  const [step,       setStep]       = useState<"intro"|"info"|"done">("intro");
  const [artistName, setArtistName] = useState("");
  const [email,      setEmail]      = useState("");
  const [x,          setX]          = useState("");
  const [distrib,    setDistrib]    = useState("");
  const [pro,        setPro]        = useState("none");
  const [size,       setSize]       = useState("");
  const [notes,      setNotes]      = useState("");
  const [busy,       setBusy]       = useState(false);
  const [err,        setErr]        = useState<string|null>(null);
  const [refId,      setRefId]      = useState<string|null>(null);

  async function submit() {
    if (!artistName.trim() || !email.trim()) {
      setErr("Artist name and email are required."); return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/music-audit/submit", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          artist_name:    artistName.trim(),
          contact_email:  email.trim(),
          contact_x:      x.trim() || undefined,
          distributor:    distrib || undefined,
          pro_affiliation: pro !== "none" ? pro : undefined,
          catalog_size:   size || undefined,
          notes:          notes.trim() || undefined,
          tracks:         [],   // catalog submitted separately in full audit
          critical_gaps:  0,
          high_gaps:      0,
        }),
      });
      const data = await res.json() as { ok?: boolean; request_id?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Submission failed");
      setRefId(data.request_id ?? null);
      setStep("done");
    } catch(e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth:540, fontFamily:M }}>
      {/* ── INTRO ── */}
      {step === "intro" && (
        <div style={{ padding:"1.25rem", background:CARD, border:`1px solid ${dark ? BDR : G + "35"}`,
                       borderRadius: dark ? 16 : 8 }}>
          <div style={{ fontSize:"0.6rem", fontWeight:700, color:G,
                         letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>
            ABRAXAS MUSIC AUDIT
          </div>
          <div style={{ fontFamily:"Georgia, 'Times New Roman', serif",
                         fontSize:"clamp(1.3rem,3.5vw,2rem)",
                         fontWeight:700, color:W, lineHeight:1.2,
                         letterSpacing:"-0.01em", marginBottom:"0.5rem" }}>
            Submit your catalog
          </div>
          <p style={{ fontFamily:S, fontSize:"0.78rem", color: mutedMid,
                       lineHeight:1.7, margin:"0 0 1rem" }}>
            Publishing deals often leave money uncollected. Missing ISRC codes, unregistered
            compositions, and MLC gaps can mean years of royalties sitting in an
            unclaimed pool. Our team knows where to look.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                         gap:"0.5rem", marginBottom:"1rem" }}>
            {[
              { icon:"01", label:"Catalog Scan",     desc:"Every track checked against PRO and MLC records" },
              { icon:"02", label:"Gap Analysis",      desc:"Missing ISRCs, unregistered works, split sheet issues" },
              { icon:"03", label:"Action Report",     desc:"Prioritized fix list with step-by-step instructions" },
              { icon:"04", label:"Team Support",      desc:"Our team guides you through the recovery process" },
            ].map(item => (
              <div key={item.label} style={{ padding:"0.625rem 0.75rem",
                                              background: dark ? "var(--surface)" : "rgba(21,21,26,0.02)",
                                              border:`1px solid ${BDR}`, borderRadius: dark ? 10 : 5 }}>
                <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700, color:G, letterSpacing:"0.15em", marginBottom:3 }}>{item.icon}</div>
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:W, marginBottom:1 }}>{item.label}</div>
                <div style={{ fontFamily:S, fontSize:"0.6rem", color: muted,
                               lineHeight:1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setStep("info")} style={{
            width:"100%", padding:"0.6rem", borderRadius:5, border:"none",
            background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
            fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
          }}>
            START MY FREE AUDIT →
          </button>
        </div>
      )}

      {/* ── INFO ── */}
      {step === "info" && (
        <div style={{ padding:"1.25rem", background:CARD, border:`1px solid ${BDR}`,
                       borderRadius: dark ? 16 : 8 }}>
          <div style={{ fontSize:"0.6rem", fontWeight:700, color:G,
                         letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>
            TELL US ABOUT YOUR CATALOG
          </div>
          <p style={{ fontFamily:S, fontSize:"0.72rem", color: mutedMid,
                       lineHeight:1.65, margin:"0 0 0.875rem" }}>
            Our team reviews every submission within 48 hours. If you have active publishing
            deals, we can cross-reference your catalog against PRO and MLC records to find
            anything that may be sitting unclaimed.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
            <div>
              <label style={lbl}>Artist / Stage Name *</label>
              <input type="text" value={artistName} style={inp}
                onChange={e => setArtistName(e.target.value)}
                placeholder="Your artist name"/>
            </div>
            <div>
              <label style={lbl}>Email *</label>
              <input type="email" value={email} style={inp}
                onChange={e => setEmail(e.target.value)}
                placeholder="best email to reach you"/>
            </div>
            <div>
              <label style={lbl}>X / Twitter</label>
              <input type="text" value={x} style={inp}
                onChange={e => setX(e.target.value)} placeholder="@handle"/>
            </div>
            <div>
              <label style={lbl}>Your Distributor</label>
              <select value={distrib} style={sel} onChange={e => setDistrib(e.target.value)}>
                <option value="">Select distributor</option>
                {["DistroKid","TuneCore","CD Baby","UnitedMasters","AWAL",
                  "Amuse","Stem","Symphonic","Other"].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>PRO Affiliation</label>
              <select value={pro} style={sel} onChange={e => setPro(e.target.value)}>
                <option value="none">Not registered / Not sure</option>
                {["ASCAP","BMI","SESAC","SoundExchange","SOCAN","PRS"].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Approximate catalog size</label>
              <select value={size} style={sel} onChange={e => setSize(e.target.value)}>
                <option value="">Select range</option>
                {["1–10 tracks","10–50 tracks","50–100 tracks","100+ tracks"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Anything specific you want us to look at?</label>
              <textarea value={notes} rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.6 }}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. older releases, specific platforms, co-write disputes..."/>
            </div>
          </div>
          {err && (
            <div style={{ marginTop:"0.5rem", padding:"0.4rem 0.625rem", borderRadius:4,
                           background:`${R}08`, border:`1px solid ${R}30`,
                           color:R, fontFamily:M, fontSize:"0.62rem" }}>{err}</div>
          )}
          <div style={{ display:"flex", gap:"0.5rem", marginTop:"0.875rem" }}>
            <button onClick={() => setStep("intro")} style={{
              flex:1, padding:"0.6rem", borderRadius:5, border:`1px solid ${BDR}`,
              background:"transparent", color: muted,
              fontFamily:M, fontSize:"0.68rem", fontWeight:700, cursor:"pointer",
            }}>← Back</button>
            <button onClick={submit} disabled={busy||!artistName.trim()||!email.trim()} style={{
              flex:2, padding:"0.6rem", borderRadius:5, border:"none",
              background: busy ? `${G}60` : G, color:"#000",
              fontFamily:M, fontSize:"0.78rem", fontWeight:900, cursor:"pointer",
            }}>{busy ? "SUBMITTING…" : "SUBMIT FOR REVIEW →"}</button>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {step === "done" && (
        <div style={{ padding:"1.5rem", background:CARD,
                       border:`1px solid ${dark ? BDR : G + "35"}`,
                       borderRadius: dark ? 16 : 8, textAlign:"center" }}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(1.5rem,4vw,2.5rem)", fontWeight:700, color:G, marginBottom:"0.5rem" }}>Received.</div>
          <div style={{ fontFamily:S, fontSize:"1rem", fontWeight:800, color:W,
                         marginBottom:"0.375rem" }}>Audit request received.</div>
          {refId && (
            <div style={{ fontFamily:M, fontSize:"0.62rem", color: muted,
                           marginBottom:"0.625rem" }}>Ref: {refId}</div>
          )}
          <p style={{ fontFamily:S, fontSize:"0.75rem", color: mutedMid,
                       lineHeight:1.7, margin:"0 0 1rem" }}>
            Our team will review your catalog within 48 hours and reach out with
            a full gap analysis report. If we find critical issues, we will contact
            you within 24 hours.
          </p>
          <div style={{ padding:"0.75rem", borderRadius:5, background:`${B}08`,
                         border:`1px solid ${B}25`, fontFamily:S, fontSize:"0.7rem",
                         color: muted, lineHeight:1.65, textAlign:"left" }}>
            <div style={{ fontFamily:M, fontSize:"0.58rem", color:B,
                           textTransform:"uppercase", letterSpacing:"0.1em",
                           marginBottom:"0.375rem" }}>WHILE YOU WAIT</div>
            Log into your PRO (ASCAP/BMI/SESAC) and verify your works list is complete.
            Also log into themlc.com and confirm your compositions are registered with
            correct ISWCs and split information.
          </div>
        </div>
      )}
    </div>
  );
}
