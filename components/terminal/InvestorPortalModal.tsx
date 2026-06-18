"use client";
// FILE: components/terminal/InvestorPortalModal.tsx
// Generic, config-driven investment modal. Works for any asset by passing
// an assetId that matches a key in investorConfigs.ts.
// Routes USDC interest submissions to /api/invest/submit, same pattern
// as the Wyoming LLC flow routes to circuit.skr.

import { useState } from "react";
import { M, S, G, W, BDR, CARD } from "./tokens";
import { INVEST_CONFIGS } from "./investorConfigs";

interface InvestorPortalModalProps {
  assetId: string | null;
  onClose: () => void;
}

export function InvestorPortalModal({ assetId, onClose }: InvestorPortalModalProps) {
  const [email,   setEmail]   = useState("");
  const [amount,  setAmount]  = useState("");
  const [option,  setOption]  = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  if (!assetId) return null;
  const config = INVEST_CONFIGS[assetId];
  if (!config) return null;

  async function submitInterest() {
    if (!email || !option || !config) return;
    setSending(true);
    try {
      await fetch("/api/invest/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: config.id,
          asset_name: config.name,
          investment_option: option,
          email,
          amount_interest: amount || null,
        }),
      });
      setSent(true);
    } catch {
      setSent(true); // fail open. don't block the user on a network hiccup
    } finally {
      setSending(false);
    }
  }

  function handleClose() {
    setEmail(""); setAmount(""); setOption(null); setSent(false);
    onClose();
  }

  return (
    <div onClick={handleClose}
      style={{ position:"fixed", inset:0, zIndex:2000,
                background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)",
                display:"flex", alignItems:"center", justifyContent:"center",
                padding:"1rem", overflowY:"auto" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:"#0A0C10", borderRadius:10,
                  border:`1px solid ${config.color}40`,
                  maxWidth:560, width:"100%", maxHeight:"90vh",
                  overflowY:"auto", boxShadow:`0 0 60px ${config.color}15` }}>

        {/* Header */}
        <div style={{ padding:"1.25rem 1.5rem",
                       borderBottom:`1px solid ${BDR}`,
                       background:`linear-gradient(135deg,${config.color}10,rgba(0,0,0,0))`,
                       display:"flex", justifyContent:"space-between",
                       alignItems:"flex-start" }}>
          <div>
            <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                           color:config.color, letterSpacing:"0.14em",
                           textTransform:"uppercase", marginBottom:"0.375rem" }}>
              INVESTOR PORTAL
            </div>
            <div style={{ fontFamily:"Georgia,serif", fontSize:"1.3rem",
                           fontWeight:700, color:W }}>
              {config.name}
            </div>
            <div style={{ fontFamily:S, fontSize:"0.75rem",
                           color:"rgba(255,255,255,0.4)", marginTop:2 }}>
              {config.subtitle}
            </div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"0.3rem",
                           marginTop:"0.5rem", padding:"0.2rem 0.5rem",
                           borderRadius:3, background:`${G}10`,
                           border:`1px solid ${G}30` }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:G }} />
              <span style={{ fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                              color:G, letterSpacing:"0.06em" }}>
                PAID IN USDC · SOLANA
              </span>
            </div>
          </div>
          <button onClick={handleClose}
            style={{ background:"transparent", border:"none",
                      color:"rgba(255,255,255,0.4)", fontSize:"1.5rem",
                      cursor:"pointer", lineHeight:1, padding:0 }}>
            ×
          </button>
        </div>

        {sent ? (
          <div style={{ padding:"2.5rem 1.5rem", textAlign:"center" }}>
            <div style={{ width:48, height:48, borderRadius:"50%",
                           background:`${config.color}15`,
                           border:`1.5px solid ${config.color}40`,
                           display:"flex", alignItems:"center", justifyContent:"center",
                           margin:"0 auto 1rem", fontSize:"1.4rem", color:config.color }}>
              ✓
            </div>
            <div style={{ fontFamily:S, fontSize:"1rem", fontWeight:700,
                           color:W, marginBottom:"0.5rem" }}>
              Interest submitted.
            </div>
            <div style={{ fontFamily:S, fontSize:"0.78rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.6,
                           maxWidth:380, margin:"0 auto 1.5rem" }}>
              Our team will follow up by email with next steps for this
              investment structure, including verification requirements
              and USDC routing details.
            </div>
            <button onClick={handleClose}
              style={{ padding:"0.625rem 1.5rem", borderRadius:6, border:"none",
                        background:config.color, color:"#000", fontFamily:M,
                        fontSize:"0.75rem", fontWeight:900, cursor:"pointer",
                        textTransform:"uppercase", letterSpacing:"0.06em" }}>
              CLOSE
            </button>
          </div>
        ) : (
          <div style={{ padding:"1.25rem 1.5rem" }}>

            {/* Stats grid */}
            <div style={{ display:"grid",
                           gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",
                           gap:"1px", background:BDR, borderRadius:6,
                           overflow:"hidden", marginBottom:"1.125rem" }}>
              {config.stats.map(s => (
                <div key={s.label} style={{ background:CARD, padding:"0.625rem 0.75rem" }}>
                  <div style={{ fontFamily:M, fontSize:"0.46rem",
                                 color:"rgba(255,255,255,0.3)",
                                 textTransform:"uppercase",
                                 letterSpacing:"0.1em", marginBottom:2 }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily:M, fontSize:"0.78rem",
                                 fontWeight:700, color:config.color }}>
                    {s.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Verification confidence breakdown. multiple independent
                checks shown explicitly, not a single opaque score */}
            {config.confidenceChecks && (
              <div style={{ padding:"0.875rem", borderRadius:8,
                             background:"rgba(255,255,255,0.02)",
                             border:`1px solid ${BDR}`,
                             marginBottom:"1.125rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between",
                               alignItems:"baseline", marginBottom:"0.625rem" }}>
                  <span style={{ fontFamily:S, fontSize:"0.74rem",
                                  fontWeight:600, color:W }}>
                    Verification confidence
                  </span>
                  <span style={{ fontFamily:S, fontSize:"0.66rem",
                                  color:"rgba(255,255,255,0.35)" }}>
                    {config.confidenceChecks.filter(c => c.status === "confirmed").length}
                    {" "}of {config.confidenceChecks.length} confirmed
                  </span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                  {config.confidenceChecks.map(c => (
                    <div key={c.source} style={{ display:"flex",
                                                  alignItems:"center", gap:"0.5rem" }}>
                      <div style={{ width:6, height:6, borderRadius:"50%",
                                     background: c.status === "confirmed" ? config.color : "rgba(255,255,255,0.15)",
                                     flexShrink:0 }} />
                      <span style={{ fontFamily:S, fontSize:"0.72rem",
                                      color: c.status === "confirmed" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
                                      flex:1 }}>
                        {c.source}
                      </span>
                      <span style={{ fontFamily:S, fontSize:"0.62rem", fontWeight:600,
                                      color: c.status === "confirmed" ? config.color : "rgba(255,255,255,0.3)" }}>
                        {c.status === "confirmed" ? "Confirmed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.historicalNote && (
              <div style={{ padding:"0.75rem 0.875rem", borderRadius:6,
                             background:`${config.color}06`,
                             border:`1px solid ${config.color}18`,
                             marginBottom:"1.125rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                               color:config.color, letterSpacing:"0.1em",
                               textTransform:"uppercase", marginBottom:"0.375rem" }}>
                  APPRECIATION HISTORY
                </div>
                <div style={{ fontFamily:S, fontSize:"0.72rem",
                               color:"rgba(255,255,255,0.5)", lineHeight:1.65 }}>
                  {config.historicalNote}
                </div>
              </div>
            )}

            {/* Investment options */}
            <div style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                           color:`${config.color}90`, letterSpacing:"0.12em",
                           textTransform:"uppercase", marginBottom:"0.625rem" }}>
              CHOOSE A STRUCTURE
            </div>
            <div style={{ display:"flex", flexDirection:"column",
                           gap:"0.5rem", marginBottom:"1.25rem" }}>
              {config.options.map(opt => (
                <div key={opt.title}
                  onClick={() => setOption(opt.title)}
                  style={{ padding:"0.75rem 0.875rem", borderRadius:6,
                            cursor:"pointer",
                            background: option === opt.title
                              ? `${opt.color}10` : "rgba(255,255,255,0.02)",
                            border: option === opt.title
                              ? `1.5px solid ${opt.color}` : "1px solid rgba(255,255,255,0.07)",
                            transition:"all 0.15s" }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                                 alignItems:"center", marginBottom:"0.3rem" }}>
                    <span style={{ fontFamily:M, fontSize:"0.7rem",
                                    fontWeight:700, color:W }}>
                      {opt.title}
                    </span>
                    <span style={{ fontFamily:M, fontSize:"0.44rem", fontWeight:700,
                                    color:opt.color, background:`${opt.color}12`,
                                    border:`1px solid ${opt.color}25`, borderRadius:2,
                                    padding:"1px 5px", letterSpacing:"0.06em" }}>
                      {opt.badge}
                    </span>
                  </div>
                  <div style={{ fontFamily:S, fontSize:"0.68rem",
                                 color:"rgba(255,255,255,0.45)",
                                 lineHeight:1.55, marginBottom:"0.3rem" }}>
                    {opt.desc}
                  </div>
                  <div style={{ fontFamily:M, fontSize:"0.5rem",
                                 color:`${opt.color}80`, letterSpacing:"0.04em" }}>
                    {opt.note}
                  </div>
                </div>
              ))}
            </div>

            {/* Contact form */}
            {option && (
              <div style={{ paddingTop:"0.875rem",
                             borderTop:`1px solid ${BDR}` }}>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                  inputMode="email"
                  style={{ width:"100%", padding:"0.625rem 0.75rem",
                            borderRadius:5, border:`1px solid ${BDR}`,
                            background:"rgba(255,255,255,0.03)",
                            color:W, fontFamily:S, fontSize:"16px",
                            marginBottom:"0.5rem", boxSizing:"border-box" }}
                />
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Approximate investment amount (optional)"
                  style={{ width:"100%", padding:"0.625rem 0.75rem",
                            borderRadius:5, border:`1px solid ${BDR}`,
                            background:"rgba(255,255,255,0.03)",
                            color:W, fontFamily:S, fontSize:"16px",
                            marginBottom:"0.875rem", boxSizing:"border-box" }}
                />
                <button
                  onClick={submitInterest}
                  disabled={!email || sending}
                  style={{ width:"100%", padding:"0.75rem", borderRadius:6,
                            border:"none",
                            background: email ? config.color : "rgba(255,255,255,0.1)",
                            color: email ? "#000" : "rgba(255,255,255,0.3)",
                            fontFamily:M, fontSize:"0.8rem", fontWeight:900,
                            cursor: email ? "pointer" : "default",
                            textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {sending ? "SUBMITTING…" : "SUBMIT INVESTMENT INTEREST →"}
                </button>
                <div style={{ fontFamily:S, fontSize:"0.6rem",
                               color:"rgba(255,255,255,0.25)",
                               textAlign:"center", marginTop:"0.5rem" }}>
                  No payment is collected here. Our team follows up with
                  verification and USDC routing details.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
