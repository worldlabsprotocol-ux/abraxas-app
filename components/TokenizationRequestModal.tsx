// FILE: components/TokenizationRequestModal.tsx
// Multi-step tokenization request + USDC payment flow.
// Steps: tier → info → payment → confirm → success
// Supabase with localStorage fallback — never breaks the demo.
"use client";

import { useState } from "react";
import { wyomingRequestStore } from "@/lib/vos/wyomingRequestStore";
import { notificationService } from "@/lib/notifications";
import { WorldIDVerify } from "@/components/WorldIDVerify";
import { tokenizationRequests } from "@/lib/supabase/client";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const CARD = "#0D1117";
const CARD2 = "#0A0D13";
const BDR  = "#1C2333";
const G    = "#10B981";
const GB   = "#20DCA5";
const A    = "#F59E0B";
const B    = "#3B82F6";
const P    = "#8B5CF6";
const R    = "#EF4444";
const W    = "#F8FAFC";
const TREASURY = "circuit.skr";
const TREASURY_LABEL = "ABRAXAS SECURE TREASURY";

type Tier = "starter" | "growth" | "enterprise";
type Step = "tier" | "info" | "payment" | "confirm" | "success";

interface TierDef { id: Tier; name: string; price: number; color: string; tagline: string; features: string[]; }

const TIERS: TierDef[] = [
  { id:"starter",    name:"STARTER",    price:1499, color:B, tagline:"Single LLC + tokenization",
    features:["Wyoming LLC Formation","Operating Agreement","On-chain Token (Token-2022)","V5 Basic Verification"] },
  { id:"growth",     name:"GROWTH",     price:2999, color:P, tagline:"Built for active operators",
    features:["Everything in Starter","Multi-sig Governance","On-chain Cap Table","Lending Eligible (60% LTV)"] },
  { id:"enterprise", name:"ENTERPRISE", price:4999, color:G, tagline:"Full institutional-grade",
    features:["Everything in Growth","Full Compliance Package","Priority Verification (24h)","Dedicated Verifier"] },
];

const byId = (id: Tier) => TIERS.find(t => t.id === id)!;

export function TokenizationRequestModal({ open, onClose, initialTier }: {
  open: boolean; onClose(): void; initialTier?: Tier | null;
}) {
  const [step,  setStep]  = useState<Step>(initialTier ? "info" : "tier");
  const [tier,  setTier]  = useState<Tier>(initialTier ?? "growth");
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [x,     setX]     = useState("");
  const [wallet,setWallet]= useState("");
  const [reqId, setReqId] = useState<string|null>(null);
  const [src,   setSrc]   = useState<"supabase"|"local"|null>(null);
  const [txSig, setTxSig] = useState("");
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState<string|null>(null);
  const [copied,setCopied]= useState(false);
  const [worldIdHash, setWorldIdHash] = useState<string|null>(null);

  if (!open) return null;

  const sel = byId(tier);

  function close() {
    setStep(initialTier ? "info" : "tier");
    setTier(initialTier ?? "growth");
    setName(""); setEmail(""); setX(""); setWallet("");
    setReqId(null); setSrc(null); setTxSig(""); setErr(null); setBusy(false);
    onClose();
  }

  async function submitInfo() {
    if (!name.trim()) { setErr("Business name is required."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await tokenizationRequests.insert({
        business_name:  name.trim(),
        contact_email:  email.trim() || null,
        contact_x:      x.trim() || null,
        sending_wallet: wallet.trim() || null,
        tier, amount_usdc: sel.price, status: "pending_payment",
      });
      setReqId(r.id); setSrc(r.source);

      // Persist locally for dashboard visibility + create notification
      const wyReq = wyomingRequestStore.create({
        companyName:        name.trim(),
        estimatedValuation: wallet.trim() ? wallet.trim() : sel.price.toString(),
        walletAddress:      wallet.trim() || undefined,
        description:        undefined,
        jurisdiction:       "Wyoming, USA",
        tier,
        assetId:            r.id,       // reuse request ID as asset ref until V5 asset is created
        supabaseId:         r.source === "supabase" ? r.id : undefined,
      });
      notificationService.createNotification({
        type:  "wyoming_request",
        title: `New Request: ${name.trim()}`,
        body:  `${sel.name} · $${sel.price.toLocaleString()} USDC`,
        data:  { wyId: wyReq.id, tier, companyName: name.trim() },
      });

      setStep("payment");
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed. Please try again.";
      setErr(msg);
    } finally { setBusy(false); }
  }

  async function confirmPayment() {
    if (!reqId) return;
    setBusy(true); setErr(null);
    try {
      if (txSig.trim()) await tokenizationRequests.confirmPayment(reqId, txSig.trim());
      else              await tokenizationRequests.markPaymentSent(reqId);
      setStep("success");
    } catch(e: unknown) {
      setErr(e instanceof Error ? e.message : "Confirmation failed.");
    } finally { setBusy(false); }
  }

  async function copyText(t: string) {
    try { await navigator.clipboard.writeText(t); setCopied(true); setTimeout(()=>setCopied(false),1500); } catch{}
  }

  // ── Shared styles ───────────────────────────────────────────────────────────
  const input: React.CSSProperties = {
    width:"100%", padding:"0.625rem 0.75rem", borderRadius:5,
    border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.03)",
    color:W, fontFamily:S, fontSize:"16px", outline:"none", boxSizing:"border-box",
  };
  const lbl: React.CSSProperties = {
    fontFamily:M, fontSize:"0.65rem", fontWeight:700,
    color:"rgba(255,255,255,0.4)", textTransform:"uppercase",
    letterSpacing:"0.12em", marginBottom:"0.3rem", display:"block",
  };

  // ── Step indicator ──────────────────────────────────────────────────────────
  const STEPS: Step[] = ["tier","info","payment","confirm","success"];
  const LABELS = ["Tier","Info","Pay","Confirm","Done"];
  const curIdx = STEPS.indexOf(step);

  function Stepper() {
    return (
      <div style={{ display:"flex", gap:"0.375rem", marginBottom:"1.125rem" }}>
        {STEPS.map((s,i) => {
          const done = i < curIdx; const active = i === curIdx;
          return (
            <div key={s} style={{ flex:1 }}>
              <div style={{ height:2, borderRadius:1, marginBottom:3,
                             background: active ? G : done ? `${G}50` : BDR }}/>
              <span style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                              color: active ? G : done ? `${G}70` : "rgba(255,255,255,0.2)",
                              textTransform:"uppercase", letterSpacing:"0.08em" }}>
                {LABELS[i]}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Buttons ─────────────────────────────────────────────────────────────────
  function PrimaryBtn({ onClick, disabled, children }: { onClick():void; disabled?:boolean; children:React.ReactNode }) {
    return (
      <button onClick={onClick} disabled={disabled} style={{
        flex:2, padding:"0.75rem 1rem", borderRadius:5, border:"none",
        background: disabled ? `${G}50` : G, color:"#000",
        fontFamily:M, fontSize:"0.875rem", fontWeight:900,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing:"0.04em", textTransform:"uppercase",
      }}>{children}</button>
    );
  }
  function SecondaryBtn({ onClick, children }: { onClick():void; children:React.ReactNode }) {
    return (
      <button onClick={onClick} style={{
        flex:1, padding:"0.75rem 1rem", borderRadius:5,
        border:`1px solid ${BDR}`, background:"transparent",
        color:"rgba(255,255,255,0.45)", fontFamily:M, fontSize:"0.8rem",
        fontWeight:700, cursor:"pointer", letterSpacing:"0.06em",
        textTransform:"uppercase",
      }}>{children}</button>
    );
  }

  return (
    <div onClick={close} style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(2,4,8,0.88)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      padding:"1.5rem 1rem", overflowY:"auto",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:CARD, border:`1px solid ${G}35`, borderRadius:10,
        width:"100%", maxWidth:540, boxShadow:`0 0 48px ${G}18`,
      }}>
        {/* Header */}
        <div style={{ padding:"1rem 1.25rem", borderBottom:`1px solid ${BDR}`,
                       background:CARD2, borderRadius:"10px 10px 0 0",
                       display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:M, fontSize:"0.65rem", fontWeight:700, color:G,
                           letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:3 }}>
              TOKENIZATION REQUEST
            </div>
            <div style={{ fontFamily:S, fontSize:"clamp(0.9rem,2vw,1.1rem)",
                           fontWeight:800, color:W }}>
              {step==="success" ? "Submission received." : "Launch your business on-chain."}
            </div>
          </div>
          <button onClick={close} style={{ padding:"0.35rem 0.625rem", borderRadius:4,
                                            border:`1px solid ${BDR}`, background:"transparent",
                                            color:"rgba(255,255,255,0.4)", fontFamily:M,
                                            fontSize:"0.75rem", fontWeight:700, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ padding:"1rem 1.25rem" }}>
          {step !== "success" && <Stepper/>}

          {/* ── TIER ─────────────────────────────────────────────── */}
          {step === "tier" && (
            <div>
              <p style={{ fontFamily:S, fontSize:"0.875rem", fontWeight:700, color:W,
                           margin:"0 0 0.75rem" }}>Select your tier.</p>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem", marginBottom:"1rem" }}>
                {TIERS.map(t => (
                  <button key={t.id} onClick={()=>setTier(t.id)} style={{
                    padding:"0.875rem 1rem", borderRadius:6, textAlign:"left",
                    cursor:"pointer", transition:"all 0.15s",
                    border:`1px solid ${tier===t.id ? t.color : BDR}`,
                    borderLeft:`3px solid ${t.color}`,
                    background: tier===t.id ? `${t.color}10` : CARD2,
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between",
                                   alignItems:"baseline", marginBottom:2 }}>
                      <span style={{ fontFamily:M, fontSize:"0.72rem", fontWeight:900,
                                      color:t.color, letterSpacing:"0.1em" }}>{t.name}</span>
                      <span style={{ fontFamily:M, fontSize:"1rem", fontWeight:900, color:W }}>
                        ${t.price.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontFamily:S, fontSize:"0.78rem",
                                   color:"rgba(255,255,255,0.45)" }}>{t.tagline}</div>
                  </button>
                ))}
              </div>
              <PrimaryBtn onClick={()=>setStep("info")}>
                CONTINUE WITH {sel.name} · ${sel.price.toLocaleString()} →
              </PrimaryBtn>
            </div>
          )}

          {/* ── INFO ─────────────────────────────────────────────── */}
          {step === "info" && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline",
                             marginBottom:"0.75rem" }}>
                <p style={{ fontFamily:S, fontSize:"0.875rem", fontWeight:700, color:W, margin:0 }}>
                  Tell us about your business.
                </p>
                <button onClick={()=>setStep("tier")} style={{ fontFamily:M, fontSize:"0.62rem",
                                                                  color:`${G}90`, background:"transparent",
                                                                  border:"none", cursor:"pointer",
                                                                  textDecoration:"underline" }}>
                  Change tier
                </button>
              </div>

              {/* Tier pill */}
              <div style={{ padding:"0.5rem 0.75rem", background:`${sel.color}10`,
                             border:`1px solid ${sel.color}25`, borderRadius:5,
                             display:"flex", justifyContent:"space-between",
                             alignItems:"center", marginBottom:"0.875rem" }}>
                <span style={{ fontFamily:M, fontSize:"0.62rem", fontWeight:900,
                                color:sel.color, letterSpacing:"0.1em" }}>{sel.name}</span>
                <span style={{ fontFamily:M, fontSize:"0.875rem", fontWeight:900, color:W }}>
                  ${sel.price.toLocaleString()}
                </span>
              </div>

              <div style={{ marginBottom:"0.75rem" }}>
                <label style={lbl}>Business / Project Name *</label>
                <input type="text" value={name} onChange={e=>setName(e.target.value)}
                  placeholder="e.g. Acme Holdings LLC" style={input} autoComplete="off"/>
              </div>
              <div style={{ marginBottom:"0.75rem" }}>
                <label style={lbl}>Email (for updates)</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" style={input} inputMode="email"/>
              </div>
              <div style={{ marginBottom:"0.75rem" }}>
                <label style={lbl}>X / Twitter Handle</label>
                <input type="text" value={x} onChange={e=>setX(e.target.value)}
                  placeholder="@handle" style={input} autoComplete="off"/>
              </div>
              <div style={{ marginBottom:"1rem" }}>
                <label style={lbl}>Sending Wallet (Solana — optional)</label>
                <input type="text" value={wallet} onChange={e=>setWallet(e.target.value)}
                  placeholder="Tokens sent here after minting" style={input} autoComplete="off"/>
              </div>

              {err && (
                <div style={{ padding:"0.5rem 0.75rem", borderRadius:4, marginBottom:"0.75rem",
                               background:`${R}10`, border:`1px solid ${R}40`,
                               color:R, fontFamily:M, fontSize:"0.72rem" }}>
                  {err}
                </div>
              )}
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <SecondaryBtn onClick={()=>initialTier?close():setStep("tier")}>
                  {initialTier ? "Cancel" : "← Back"}
                </SecondaryBtn>
                <PrimaryBtn onClick={submitInfo} disabled={busy||!name.trim()}>
                  {busy ? "SAVING…" : "CONTINUE →"}
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* ── PAYMENT ──────────────────────────────────────────── */}
          {step === "payment" && (
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                             flexWrap:"wrap", gap:"0.5rem", marginBottom:"0.5rem" }}>
                <p style={{ fontFamily:S, fontSize:"0.875rem", fontWeight:700, color:W, margin:0 }}>
                  Send USDC to complete.
                </p>
                <WorldIDVerify
                  mode="compact"
                  signal={reqId ?? "abraxas"}
                  onVerified={(hash) => setWorldIdHash(hash)}
                />
              </div>
              <p style={{ fontFamily:S, fontSize:"0.78rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.7,
                           margin:"0 0 1rem" }}>
                Send the exact amount on Solana. We activate your tokenization within 24 hours of receipt.
              </p>

              {/* Amount */}
              <div style={{ padding:"1rem", borderRadius:7, marginBottom:"0.625rem",
                             background:`${G}08`, border:`2px solid ${G}35` }}>
                <div style={{ fontFamily:M, fontSize:"0.62rem", color:G,
                               letterSpacing:"0.12em", textTransform:"uppercase",
                               marginBottom:4 }}>AMOUNT DUE</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:"0.5rem",
                               marginBottom:"0.5rem" }}>
                  <span style={{ fontFamily:M, fontSize:"1.75rem", fontWeight:900, color:W }}>
                    {sel.price.toLocaleString()}
                  </span>
                  <span style={{ fontFamily:M, fontSize:"0.8rem", fontWeight:700, color:G }}>USDC</span>
                </div>
                <div style={{ display:"flex", gap:"0.375rem", flexWrap:"wrap" }}>
                  {[["SOLANA",G],[`TIER · ${sel.name}`,sel.color],["USDC (SPL)",B]].map(([t,c])=>(
                    <span key={t} style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                                            color:c as string, background:`${c as string}12`,
                                            border:`1px solid ${c as string}25`,
                                            borderRadius:3, padding:"2px 7px",
                                            letterSpacing:"0.06em" }}>{t as string}</span>
                  ))}
                </div>
              </div>

              {/* Treasury wallet */}
              <div style={{ padding:"0.875rem 1rem", borderRadius:7, marginBottom:"0.75rem",
                             background:CARD2, border:`1px solid ${BDR}`,
                             borderLeft:`3px solid ${GB}` }}>
                <div style={{ fontFamily:M, fontSize:"0.58rem",
                               color:"rgba(255,255,255,0.3)", letterSpacing:"0.12em",
                               textTransform:"uppercase", marginBottom:4 }}>
                  {TREASURY_LABEL}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.625rem",
                               marginBottom:"0.375rem", flexWrap:"wrap" }}>
                  <span style={{ fontFamily:M, fontSize:"1rem", fontWeight:900,
                                  color:GB, wordBreak:"break-all" }}>
                    {TREASURY}
                  </span>
                  <button onClick={()=>copyText(TREASURY)} style={{
                    padding:"0.3rem 0.625rem", borderRadius:4, cursor:"pointer",
                    border:`1px solid ${copied?G:BDR}`,
                    background: copied?`${G}15`:"transparent",
                    color: copied?G:"rgba(255,255,255,0.55)",
                    fontFamily:M, fontSize:"0.62rem", fontWeight:700,
                    letterSpacing:"0.06em", textTransform:"uppercase",
                  }}>{copied?"✓ COPIED":"COPY"}</button>
                </div>
                <div style={{ fontFamily:S, fontSize:"0.72rem",
                               color:"rgba(255,255,255,0.35)", lineHeight:1.6 }}>
                  Solana Name Service domain. Resolves automatically in most wallets.
                </div>
              </div>

              {/* Instructions */}
              <div style={{ padding:"0.75rem 0.875rem", borderRadius:6, marginBottom:"0.875rem",
                             background:`${A}07`, border:`1px solid ${A}25` }}>
                <div style={{ fontFamily:M, fontSize:"0.6rem", color:A, letterSpacing:"0.1em",
                               textTransform:"uppercase", marginBottom:4 }}>INSTRUCTIONS</div>
                <ol style={{ fontFamily:S, fontSize:"0.75rem",
                              color:"rgba(255,255,255,0.5)", lineHeight:1.8,
                              margin:0, paddingLeft:"1.125rem" }}>
                  <li>Open Phantom / Solflare / Backpack</li>
                  <li>Send <strong>${sel.price.toLocaleString()} USDC</strong> to <strong>{TREASURY}</strong></li>
                  <li>Copy the tx signature from your wallet history</li>
                  <li>Return here and continue</li>
                </ol>
              </div>

              {reqId && (
                <div style={{ fontFamily:M, fontSize:"0.58rem", color:"rgba(255,255,255,0.2)",
                               marginBottom:"0.75rem", wordBreak:"break-all" }}>
                  Request: {reqId}{src==="local" ? " · (local)" : ""}
                </div>
              )}
              <button onClick={()=>setStep("confirm")} style={{
                width:"100%", padding:"0.75rem", borderRadius:5, border:"none",
                background:G, color:"#000", fontFamily:M, fontSize:"0.9rem",
                fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
                textTransform:"uppercase",
              }}>I&apos;VE SENT THE PAYMENT →</button>
            </div>
          )}

          {/* ── CONFIRM ──────────────────────────────────────────── */}
          {step === "confirm" && (
            <div>
              <p style={{ fontFamily:S, fontSize:"0.875rem", fontWeight:700, color:W,
                           margin:"0 0 0.375rem" }}>Confirm payment.</p>
              <p style={{ fontFamily:S, fontSize:"0.78rem", color:"rgba(255,255,255,0.4)",
                           lineHeight:1.7, margin:"0 0 1rem" }}>
                Paste your Solana transaction signature (optional — we can reconcile without it).
              </p>
              <div style={{ marginBottom:"0.875rem" }}>
                <label style={lbl}>Transaction Signature (optional)</label>
                <input type="text" value={txSig} onChange={e=>setTxSig(e.target.value)}
                  placeholder="Base58 tx sig from your wallet"
                  style={{...input, fontFamily:M, fontSize:"0.72rem"}} autoComplete="off"/>
              </div>
              {err && (
                <div style={{ padding:"0.5rem 0.75rem", borderRadius:4, marginBottom:"0.75rem",
                               background:`${R}10`, border:`1px solid ${R}40`,
                               color:R, fontFamily:M, fontSize:"0.72rem" }}>{err}</div>
              )}
              <div style={{ display:"flex", gap:"0.5rem" }}>
                <SecondaryBtn onClick={()=>setStep("payment")}>← Back</SecondaryBtn>
                <PrimaryBtn onClick={confirmPayment} disabled={busy}>
                  {busy ? "CONFIRMING…" : "COMPLETE ✓"}
                </PrimaryBtn>
              </div>
            </div>
          )}

          {/* ── SUCCESS ──────────────────────────────────────────── */}
          {step === "success" && (
            <div>
              <div style={{ padding:"1.25rem", borderRadius:8, marginBottom:"1rem",
                             background:`${G}10`, border:`2px solid ${G}35`,
                             textAlign:"center" }}>
                <div style={{ fontSize:"2.5rem", color:G, marginBottom:"0.375rem" }}>✓</div>
                <div style={{ fontFamily:S, fontSize:"1.1rem", fontWeight:800, color:W,
                               marginBottom:"0.375rem" }}>Payment recorded.</div>
                <div style={{ fontFamily:S, fontSize:"0.78rem",
                               color:"rgba(255,255,255,0.45)", lineHeight:1.7 }}>
                  Verification activates within 24 hours of payment confirmation.
                </div>
              </div>

              {/* Receipt */}
              <div style={{ padding:"0.875rem", background:CARD2,
                             border:`1px solid ${BDR}`, borderRadius:6, marginBottom:"0.875rem" }}>
                <div style={{ fontFamily:M, fontSize:"0.58rem", color:"rgba(255,255,255,0.3)",
                               textTransform:"uppercase", letterSpacing:"0.12em",
                               marginBottom:6 }}>RECEIPT</div>
                {[["Business",name],["Tier",sel.name],
                  ["Amount",`$${sel.price.toLocaleString()} USDC`],
                  ["Request",reqId??"-"],
                  ["TX",txSig?`${txSig.slice(0,10)}…`:"Pending review"],
                  ["Status","PAID · Activating"]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                         padding:"0.3rem 0",
                                         borderBottom:`1px solid ${BDR}40`, gap:"0.5rem" }}>
                    <span style={{ fontFamily:M, fontSize:"0.62rem",
                                    color:"rgba(255,255,255,0.35)" }}>{k}</span>
                    <span style={{ fontFamily:M, fontSize:"0.7rem", fontWeight:700,
                                    color:W, textAlign:"right", wordBreak:"break-all",
                                    maxWidth:"60%" }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Next steps */}
              <div style={{ padding:"0.75rem", borderRadius:6, marginBottom:"0.875rem",
                             background:`${B}07`, border:`1px solid ${B}25` }}>
                <div style={{ fontFamily:M, fontSize:"0.6rem", color:B,
                               letterSpacing:"0.1em", textTransform:"uppercase",
                               marginBottom:4 }}>WHAT HAPPENS NEXT</div>
                <ol style={{ fontFamily:S, fontSize:"0.75rem",
                              color:"rgba(255,255,255,0.5)", lineHeight:1.8,
                              margin:0, paddingLeft:"1.125rem" }}>
                  <li>Treasury confirms USDC receipt</li>
                  <li>Asset created in V5 pipeline (SUBMITTED state)</li>
                  <li>Email/X notification with dashboard link</li>
                  <li>Track progress through all 10 verification stages</li>
                </ol>
              </div>

              <button onClick={close} style={{
                width:"100%", padding:"0.75rem", borderRadius:5, border:"none",
                background:G, color:"#000", fontFamily:M, fontSize:"0.9rem",
                fontWeight:900, cursor:"pointer", letterSpacing:"0.04em",
                textTransform:"uppercase",
              }}>CLOSE</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
