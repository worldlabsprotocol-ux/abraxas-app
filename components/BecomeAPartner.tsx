// FILE: components/BecomeAPartner.tsx
// Partner application modal. appraisers, attorneys, title companies, auditors.
// Saves to Supabase + emails Pablo on submit. No CLI needed.
"use client";

import { useState } from "react";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S   = "system-ui,-apple-system,sans-serif";
const G   = "#10B981";
const BDR = "#1C2333";
const W   = "#F8FAFC";
const R   = "#EF4444";
const CARD = "#0D1117";

type PartnerType = "appraiser" | "attorney" | "title" | "auditor" | "other";

const TYPES: { id: PartnerType; label: string; desc: string }[] = [
  { id: "appraiser", label: "Appraiser",    desc: "Asset valuation & appraisal services" },
  { id: "attorney",  label: "Attorney",     desc: "Real estate, corporate & compliance law" },
  { id: "title",     label: "Title Company", desc: "Title search, insurance & closing" },
  { id: "auditor",   label: "Auditor",      desc: "Financial audit & compliance review" },
  { id: "other",     label: "Other",        desc: "Other verification or advisory services" },
];

export function BecomeAPartner({ trigger }: { trigger?: React.ReactNode }) {
  const [open,    setOpen]    = useState(false);
  const [step,    setStep]    = useState<"type"|"info"|"done">("type");
  const [pType,   setPType]   = useState<PartnerType>("appraiser");
  const [firm,    setFirm]    = useState("");
  const [contact, setContact] = useState("");
  const [email,   setEmail]   = useState("");
  const [x,       setX]       = useState("");
  const [juris,   setJuris]   = useState("");
  const [license, setLicense] = useState("");
  const [website, setWebsite] = useState("");
  const [notes,   setNotes]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState<string|null>(null);

  const lbl: React.CSSProperties = {
    fontFamily:M, fontSize:"0.6rem", fontWeight:700,
    color:"rgba(255,255,255,0.35)", textTransform:"uppercase",
    letterSpacing:"0.12em", marginBottom:"0.25rem", display:"block",
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"0.5rem 0.625rem", borderRadius:4,
    border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.03)",
    color:W, fontFamily:S, fontSize:"16px", outline:"none",
    boxSizing:"border-box",
  };

  function close() {
    setOpen(false); setStep("type"); setFirm(""); setContact("");
    setEmail(""); setX(""); setJuris(""); setLicense(""); setWebsite("");
    setNotes(""); setErr(null); setBusy(false);
  }

  async function submit() {
    if (!firm.trim() || !contact.trim() || !email.trim() || !juris.trim()) {
      setErr("Firm name, contact name, email, and jurisdiction are required."); return;
    }
    setBusy(true); setErr(null);
    try {
      await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firm_name: firm.trim(), contact_name: contact.trim(),
          contact_email: email.trim(), contact_x: x.trim() || undefined,
          partner_type: pType, jurisdiction: juris.trim(),
          license_number: license.trim() || undefined,
          website: website.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      setStep("done");
    } catch(e: unknown) {
      setErr(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor:"pointer" }}>
        {trigger ?? (
          <button style={{
            padding:"0.5rem 1.125rem", borderRadius:5, cursor:"pointer",
            border:`1px solid ${G}`, background:`${G}15`,
            color:G, fontFamily:M, fontSize:"0.72rem", fontWeight:900,
            letterSpacing:"0.08em", textTransform:"uppercase",
          }}>
            BECOME A PARTNER →
          </button>
        )}
      </span>

      {open && (
        <div onClick={close} style={{
          position:"fixed", inset:0, zIndex:2000,
          background:"rgba(2,4,8,0.9)", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:"1.5rem 1rem", overflowY:"auto",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:CARD, border:`1px solid ${G}35`, borderRadius:10,
            width:"100%", maxWidth:500, boxShadow:`0 0 40px ${G}15`,
          }}>
            {/* Header */}
            <div style={{ padding:"0.875rem 1.125rem", borderBottom:`1px solid ${BDR}`,
                           background:"#0A0D13", borderRadius:"10px 10px 0 0",
                           display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:G,
                               letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:2 }}>
                  ABRAXAS VERIFICATION NETWORK
                </div>
                <div style={{ fontFamily:S, fontSize:"1rem", fontWeight:800, color:W }}>
                  Become a Verified Partner
                </div>
              </div>
              <button onClick={close} style={{ padding:"0.3rem 0.5rem", borderRadius:4,
                                               border:`1px solid ${BDR}`, background:"transparent",
                                               color:"rgba(255,255,255,0.4)", fontFamily:M,
                                               fontSize:"0.72rem", cursor:"pointer" }}>✕</button>
            </div>

            <div style={{ padding:"1rem 1.125rem" }}>

              {/* ── STEP: TYPE ── */}
              {step === "type" && (
                <div>
                  <p style={{ fontFamily:S, fontSize:"0.8rem", color:"rgba(255,255,255,0.5)",
                               lineHeight:1.65, margin:"0 0 0.875rem" }}>
                    Abraxas partners are the trust layer behind every verified asset.
                    Select your role in the verification network.
                  </p>
                  <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem", marginBottom:"1rem" }}>
                    {TYPES.map(t => (
                      <button key={t.id} onClick={() => setPType(t.id)} style={{
                        padding:"0.625rem 0.875rem", borderRadius:5, textAlign:"left",
                        cursor:"pointer", border:`1px solid ${pType===t.id ? G : BDR}`,
                        borderLeft:`3px solid ${pType===t.id ? G : BDR}`,
                        background: pType===t.id ? `${G}10` : "rgba(255,255,255,0.02)",
                      }}>
                        <div style={{ fontFamily:M, fontSize:"0.68rem", fontWeight:900,
                                       color: pType===t.id ? G : W, marginBottom:2 }}>{t.label}</div>
                        <div style={{ fontFamily:S, fontSize:"0.72rem",
                                       color:"rgba(255,255,255,0.4)" }}>{t.desc}</div>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep("info")} style={{
                    width:"100%", padding:"0.6rem", borderRadius:5, border:"none",
                    background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
                    fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
                  }}>CONTINUE AS {TYPES.find(t=>t.id===pType)?.label.toUpperCase()} →</button>
                </div>
              )}

              {/* ── STEP: INFO ── */}
              {step === "info" && (
                <div>
                  <p style={{ fontFamily:S, fontSize:"0.78rem", color:"rgba(255,255,255,0.45)",
                               margin:"0 0 0.875rem" }}>
                    We review every application personally. Approved partners are listed in the
                    Abraxas verification network and receive referrals for every asset in their jurisdiction.
                  </p>
                  {[
                    ["Firm / Practice Name *",    firm,    setFirm,    "text",  "e.g. Smith & Associates Appraisers"],
                    ["Your Name *",               contact, setContact, "text",  "First and last name"],
                    ["Email *",                   email,   setEmail,   "email", "professional@firm.com"],
                    ["X / Twitter",               x,       setX,       "text",  "@handle"],
                    ["Jurisdiction / State *",    juris,   setJuris,   "text",  "e.g. Wyoming, Georgia, Texas"],
                    ["License Number",            license, setLicense, "text",  "Optional but speeds up review"],
                    ["Website",                   website, setWebsite, "url",   "https://yourfirm.com"],
                  ].map(([l,v,set,type,ph]) => (
                    <div key={l as string} style={{ marginBottom:"0.625rem" }}>
                      <label style={lbl}>{l as string}</label>
                      <input type={type as string} value={v as string}
                        onChange={e => (set as (v:string)=>void)(e.target.value)}
                        placeholder={ph as string} style={inp} autoComplete="off"/>
                    </div>
                  ))}
                  <div style={{ marginBottom:"0.875rem" }}>
                    <label style={lbl}>Tell us about your practice (optional)</label>
                    <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                      placeholder="Years of experience, specialty, current clients..."
                      rows={3} style={{ ...inp, resize:"vertical", lineHeight:1.6 }}/>
                  </div>
                  {err && (
                    <div style={{ padding:"0.4rem 0.625rem", borderRadius:4, marginBottom:"0.625rem",
                                   background:`${R}08`, border:`1px solid ${R}30`,
                                   color:R, fontFamily:M, fontSize:"0.62rem" }}>{err}</div>
                  )}
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button onClick={() => setStep("type")} style={{
                      flex:1, padding:"0.6rem", borderRadius:5, border:`1px solid ${BDR}`,
                      background:"transparent", color:"rgba(255,255,255,0.4)",
                      fontFamily:M, fontSize:"0.68rem", fontWeight:700, cursor:"pointer",
                    }}>← Back</button>
                    <button onClick={submit} disabled={busy} style={{
                      flex:2, padding:"0.6rem", borderRadius:5, border:"none",
                      background: busy ? `${G}60` : G, color:"#000",
                      fontFamily:M, fontSize:"0.78rem", fontWeight:900,
                      cursor: busy ? "wait" : "pointer",
                    }}>{busy ? "SUBMITTING…" : "APPLY NOW →"}</button>
                  </div>
                </div>
              )}

              {/* ── STEP: DONE ── */}
              {step === "done" && (
                <div style={{ textAlign:"center", padding:"1rem 0" }}>
                  <div style={{ fontSize:"2.5rem", color:G, marginBottom:"0.5rem" }}>✓</div>
                  <div style={{ fontFamily:S, fontSize:"1rem", fontWeight:800, color:W,
                                 marginBottom:"0.375rem" }}>Application received.</div>
                  <p style={{ fontFamily:S, fontSize:"0.78rem",
                               color:"rgba(255,255,255,0.45)", lineHeight:1.7, margin:"0 0 1rem" }}>
                    We review every application personally within 48 hours.
                    Approved partners are listed in the Abraxas verification network
                    and introduced to clients in their jurisdiction.
                  </p>
                  <button onClick={close} style={{
                    padding:"0.6rem 1.5rem", borderRadius:5, border:"none",
                    background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
                    fontWeight:900, cursor:"pointer",
                  }}>CLOSE</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
