// FILE: components/CieloBooking.tsx
// USDC crypto booking form for Cielo Sunrise. bypasses Airbnb fees.
// Guests submit dates + wallet, Pablo confirms manually and receives full payment.
"use client";

import { useState } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S = "system-ui,-apple-system,sans-serif";
const G = "#10B981";
const A = "#F59E0B";
const BDR = "#1C2333";
const W = "#F8FAFC";
const R = "#EF4444";
const CARD = "#0D1117";
const TREASURY = "circuit.skr";

// Nightly rates in USDC
const RATES = { weeknight: 299, weekend: 349, week: 1799 };

export function CieloBooking() {
  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState<"dates"|"contact"|"confirm"|"done">("dates");
  const [checkIn,   setCheckIn]   = useState("");
  const [checkOut,  setCheckOut]  = useState("");
  const [guests,    setGuests]    = useState("2");
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [wallet,    setWallet]    = useState("");
  const [notes,     setNotes]     = useState("");
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState<string|null>(null);
  const [refId,     setRefId]     = useState<string|null>(null);

  function nightCount(): number {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

  function estimateUSDC(): number {
    const nights = nightCount();
    if (nights === 0) return 0;
    if (nights >= 7) return Math.round(nights / 7) * RATES.week;
    return nights * RATES.weeknight;
  }

  async function submit() {
    if (!name.trim() || !email.trim() || !checkIn || !checkOut) {
      setErr("Name, email, and dates are required."); return;
    }
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/bookings/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property:   "Cielo Sunrise. AAS-1",
          check_in:   checkIn,
          check_out:  checkOut,
          guests:     parseInt(guests),
          guest_name: name.trim(),
          email:      email.trim(),
          wallet:     wallet.trim() || null,
          notes:      notes.trim() || null,
          nights:     nightCount(),
          est_usdc:   estimateUSDC(),
        }),
      });
      const data = await res.json() as { ok?: boolean; booking_id?: string };
      setRefId(data.booking_id ?? null);
      setStep("done");
    } catch(e: unknown) {
      setErr(e instanceof Error ? e.message : "Submission failed");
    } finally { setBusy(false); }
  }

  const lbl: React.CSSProperties = {
    fontFamily:M, fontSize:"0.6rem", fontWeight:700,
    color:"rgba(255,255,255,0.35)", textTransform:"uppercase",
    letterSpacing:"0.12em", marginBottom:"0.25rem", display:"block",
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"0.5rem 0.625rem", borderRadius:4,
    border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.03)",
    color:W, fontFamily:S, fontSize:"16px", outline:"none", boxSizing:"border-box",
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding:"0.55rem 1.125rem", borderRadius:5, border:"none",
        background:`${A}15`, borderWidth:1, borderStyle:"solid", borderColor:`${A}40`,
        color:A, fontFamily:M, fontSize:"0.72rem", fontWeight:900,
        cursor:"pointer", letterSpacing:"0.08em", textTransform:"uppercase",
      }}>
        BOOK WITH USDC →
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position:"fixed", inset:0, zIndex:2000,
          background:"rgba(2,4,8,0.9)", backdropFilter:"blur(8px)",
          display:"flex", alignItems:"flex-start", justifyContent:"center",
          padding:"1.5rem 1rem", overflowY:"auto",
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:CARD, border:`1px solid ${A}35`, borderRadius:10,
            width:"100%", maxWidth:480, boxShadow:`0 0 40px ${A}15`,
          }}>
            {/* Header */}
            <div style={{ padding:"0.875rem 1.125rem", background:"#0A0D13",
                           borderBottom:`1px solid ${BDR}`, borderRadius:"10px 10px 0 0",
                           display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                               color:A, letterSpacing:"0.15em", textTransform:"uppercase",
                               marginBottom:2 }}>
                  CIELO SUNRISE · AAS-1
                </div>
                <div style={{ fontFamily:S, fontSize:"0.95rem", fontWeight:800, color:W }}>
                  Book with Crypto
                </div>
                <div style={{ fontFamily:S, fontSize:"0.68rem",
                               color:"rgba(255,255,255,0.35)", marginTop:1 }}>
                  Mineral Bluff, Georgia · 12 guests · 4 beds
                </div>
              </div>
              <button onClick={() => setOpen(false)} style={{
                padding:"0.3rem 0.5rem", borderRadius:4, border:`1px solid ${BDR}`,
                background:"transparent", color:"rgba(255,255,255,0.4)",
                fontFamily:M, fontSize:"0.72rem", cursor:"pointer",
              }}>✕</button>
            </div>

            <div style={{ padding:"1rem 1.125rem" }}>

              {/* ── DATES ── */}
              {step === "dates" && (
                <div>
                  <p style={{ fontFamily:S, fontSize:"0.75rem",
                               color:"rgba(255,255,255,0.45)", lineHeight:1.65,
                               margin:"0 0 0.875rem" }}>
                    Skip the platform fees. Pay in USDC directly to the owner.
                    Submit your dates and we will confirm availability within 24 hours.
                  </p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr",
                                 gap:"0.5rem", marginBottom:"0.625rem" }}>
                    <div>
                      <label style={lbl}>Check-in *</label>
                      <input type="date" value={checkIn} style={inp}
                        onChange={e => setCheckIn(e.target.value)}/>
                    </div>
                    <div>
                      <label style={lbl}>Check-out *</label>
                      <input type="date" value={checkOut} style={inp}
                        onChange={e => setCheckOut(e.target.value)}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:"0.875rem" }}>
                    <label style={lbl}>Guests</label>
                    <select value={guests} style={inp}
                      onChange={e => setGuests(e.target.value)}>
                      {["1","2","3","4","5","6","7","8","9","10","11","12"].map(n => (
                        <option key={n} value={n}>{n} guest{parseInt(n)>1?"s":""}</option>
                      ))}
                    </select>
                  </div>
                  {nightCount() > 0 && (
                    <div style={{ padding:"0.75rem", borderRadius:6,
                                   background:`${A}08`, border:`1px solid ${A}25`,
                                   marginBottom:"0.875rem" }}>
                      <div style={{ fontFamily:M, fontSize:"0.58rem", color:A,
                                     letterSpacing:"0.1em", textTransform:"uppercase",
                                     marginBottom:3 }}>ESTIMATE</div>
                      <div style={{ fontFamily:M, fontSize:"1.1rem",
                                     fontWeight:900, color:W }}>
                        ~{estimateUSDC().toLocaleString()} USDC
                      </div>
                      <div style={{ fontFamily:S, fontSize:"0.65rem",
                                     color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                        {nightCount()} nights · {nightCount() >= 7 ? "weekly rate applied" : `~$${RATES.weeknight}/night`}
                      </div>
                    </div>
                  )}
                  <button onClick={() => setStep("contact")}
                    disabled={!checkIn || !checkOut || nightCount() === 0}
                    style={{ width:"100%", padding:"0.6rem", borderRadius:5,
                              border:"none", background: !checkIn||!checkOut ? `${G}50`:G,
                              color:"#000", fontFamily:M, fontSize:"0.78rem",
                              fontWeight:900, cursor:"pointer" }}>
                    CONTINUE →
                  </button>
                </div>
              )}

              {/* ── CONTACT ── */}
              {step === "contact" && (
                <div>
                  <p style={{ fontFamily:S, fontSize:"0.75rem",
                               color:"rgba(255,255,255,0.45)", lineHeight:1.65,
                               margin:"0 0 0.875rem" }}>
                    We will reach out within 24 hours to confirm dates and
                    send the USDC payment address.
                  </p>
                  {[
                    ["Your Name *",   name,   setName,   "text",  "Full name"],
                    ["Email *",       email,  setEmail,  "email", "you@example.com"],
                    ["Solana Wallet", wallet, setWallet, "text",  "Optional. for USDC payment"],
                  ].map(([l,v,set,type,ph]) => (
                    <div key={l as string} style={{ marginBottom:"0.625rem" }}>
                      <label style={lbl}>{l as string}</label>
                      <input type={type as string} value={v as string}
                        onChange={e => (set as (v:string)=>void)(e.target.value)}
                        placeholder={ph as string} style={inp}/>
                    </div>
                  ))}
                  <div style={{ marginBottom:"0.875rem" }}>
                    <label style={lbl}>Special requests</label>
                    <textarea value={notes} rows={2}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Early check-in, accessibility needs, etc."
                      style={{ ...inp, resize:"vertical", lineHeight:1.6 }}/>
                  </div>
                  {err && (
                    <div style={{ padding:"0.4rem 0.625rem", borderRadius:4,
                                   background:`${R}08`, border:`1px solid ${R}30`,
                                   color:R, fontFamily:M, fontSize:"0.62rem",
                                   marginBottom:"0.5rem" }}>{err}</div>
                  )}
                  <div style={{ display:"flex", gap:"0.5rem" }}>
                    <button onClick={() => setStep("dates")} style={{
                      flex:1, padding:"0.6rem", borderRadius:5,
                      border:`1px solid ${BDR}`, background:"transparent",
                      color:"rgba(255,255,255,0.4)", fontFamily:M, fontSize:"0.68rem",
                      fontWeight:700, cursor:"pointer",
                    }}>← Back</button>
                    <button onClick={submit} disabled={busy} style={{
                      flex:2, padding:"0.6rem", borderRadius:5, border:"none",
                      background: busy ? `${G}60` : G, color:"#000",
                      fontFamily:M, fontSize:"0.78rem", fontWeight:900,
                      cursor:"pointer",
                    }}>{busy ? "SUBMITTING…" : "REQUEST BOOKING →"}</button>
                  </div>
                </div>
              )}

              {/* ── DONE ── */}
              {step === "done" && (
                <div style={{ textAlign:"center", padding:"0.75rem 0" }}>
                  <div style={{ fontFamily:"Georgia,serif", fontSize:"2rem",
                                 fontWeight:700, color:G, marginBottom:"0.5rem" }}>
                    Request received.
                  </div>
                  {refId && (
                    <div style={{ fontFamily:M, fontSize:"0.6rem",
                                   color:"rgba(255,255,255,0.25)", marginBottom:"0.75rem" }}>
                      Ref: {refId}
                    </div>
                  )}
                  <p style={{ fontFamily:S, fontSize:"0.75rem",
                               color:"rgba(255,255,255,0.45)", lineHeight:1.7,
                               margin:"0 0 1rem" }}>
                    We will confirm your dates and send payment instructions
                    within 24 hours. Payment goes directly to the owner wallet
                    at <strong style={{ color:G }}>{TREASURY}</strong>. no platform fees.
                  </p>
                  <button onClick={() => { setOpen(false); setStep("dates"); }} style={{
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
