// FILE: components/identity/AbraxasPassport.tsx
// Abraxas Digital Passport. live credential lookup via useAbraxasID hook.
// Stamps are driven by real Supabase credential data when Veriff is active.
// Falls back gracefully to demo state when wallet is not connected.
"use client";

import { useState, useEffect } from "react";
import { useAbraxasID }        from "@/lib/credentials/useAbraxasID";
import { useReclaimSocialStamp } from "@/lib/useReclaimSocialStamp";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S   = "system-ui,-apple-system,sans-serif";
const G   = "#10B981";
const A   = "#F59E0B";
const B   = "#3B82F6";
const P   = "#8B5CF6";
const W   = "#15151A";
const BDR = "#E5E5E0";
const BG  = "#FFFFFF";

const ALL_STAMPS = [
  { id:"identity",   label:"Identity Verified",        icon:"◈", color:G,  desc:"Gov ID + liveness confirmed" },
  { id:"biometric",  label:"Biometrics Confirmed",     icon:"⬡", color:G,  desc:"Liveness match · face verification" },
  { id:"business",   label:"Business Verified",        icon:"⬛", color:B,  desc:"KYB complete · entity confirmed" },
  { id:"investor",   label:"Accredited Investor",      icon:"◆", color:P,  desc:"Meets SEC accreditation criteria" },
  { id:"owner",      label:"Asset Owner Verified",     icon:"◉", color:A,  desc:"Ownership claim attested on-chain" },
  { id:"royalty",    label:"Royalty Rights Verified",  icon:"♪", color:P,  desc:"Publishing / royalty claim confirmed" },
  { id:"property",   label:"Property Owner Verified",  icon:"⌂", color:A,  desc:"Real estate title chain verified" },
  { id:"tribal",     label:"Tribal Partner Verified",  icon:"◈", color:G,  desc:"Sovereign land / mineral rights" },
  { id:"compliance", label:"Compliance Cleared",       icon:"✓", color:G,  desc:"AML / OFAC screening passed" },
  { id:"lending",    label:"Lending Eligible",         icon:"$", color:G,  desc:"Collateral credit verified" },
  { id:"social",     label:"Social Verified",          icon:"@", color:B,  desc:"LinkedIn, X, GitHub, or Gmail cryptographically proven via Reclaim" },
] as const;

type StampId = typeof ALL_STAMPS[number]["id"];

// Map credential level → earned stamps
function stampsFromCredential(level: string | undefined): StampId[] {
  if (!level) return [];
  if (level === "BASIC")    return ["identity","compliance"];
  if (level === "STANDARD") return ["identity","compliance","biometric"];
  if (level === "ENHANCED") return ["identity","compliance","biometric","owner","business"];
  if (level === "ELITE")    return ["identity","compliance","biometric","owner","business","investor","lending"];
  return ["identity","compliance"];
}

function Stamp({ stamp, earned }: { stamp: typeof ALL_STAMPS[number]; earned: boolean }) {
  const [tip, setTip] = useState(false);
  return (
    <div onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)}
      style={{ display:"flex", flexDirection:"column", alignItems:"center",
                gap:"0.375rem", cursor:"default", position:"relative" }}>
      <div style={{ width:64, height:64, borderRadius:"50%",
                     border:`2px solid ${earned ? stamp.color : "rgba(21,21,26,0.12)"}`,
                     background: earned
                       ? `${stamp.color}20`
                       : "rgba(21,21,26,0.03)",
                     display:"flex", alignItems:"center", justifyContent:"center",
                     position:"relative",
                     boxShadow: earned ? `0 0 12px ${stamp.color}30` : "none",
                     transition:"all 0.2s", opacity: earned ? 1 : 0.5,
                     transform: tip && earned ? "scale(1.08)" : "scale(1)" }}>
        <span style={{ fontFamily:M, fontSize:"1.1rem",
                        color: earned ? stamp.color : "rgba(21,21,26,0.25)" }}>
          {stamp.icon}
        </span>
        {earned && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="none"
              stroke={stamp.color} strokeWidth="1" strokeOpacity="0.3"
              strokeDasharray="4 3"/>
          </svg>
        )}
      </div>
      <div style={{ fontFamily:M, fontSize:"0.5rem", fontWeight:700,
                     color: earned ? stamp.color : "rgba(21,21,26,0.25)",
                     textTransform:"uppercase", letterSpacing:"0.06em",
                     textAlign:"center", maxWidth:72, lineHeight:1.3 }}>
        {stamp.label}
      </div>
      {tip && earned && (
        <div style={{ position:"absolute", bottom:"110%", left:"50%",
                       transform:"translateX(-50%)", zIndex:20,
                       background:"#FAFAF8", border:`1px solid ${stamp.color}40`,
                       borderRadius:5, padding:"0.375rem 0.625rem",
                       fontFamily:S, fontSize:"0.62rem", color:"rgba(21,21,26,0.6)",
                       whiteSpace:"nowrap", pointerEvents:"none",
                       boxShadow:"0 4px 16px rgba(0,0,0,0.7)" }}>
          {stamp.desc}
        </div>
      )}
    </div>
  );
}

export function AbraxasPassport({
  onGetVerified,
  walletAddress,
  earnedStamps: propStamps,
}: {
  onGetVerified?: () => void;
  walletAddress?: string;
  earnedStamps?: StampId[];
}) {
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null);
  const [launching, setLaunching]       = useState(false);

  // Read wallet from localStorage credential if not passed as prop
  useEffect(() => {
    try {
      const stored = localStorage.getItem("abraxas_credential_v1");
      if (stored) {
        const c = JSON.parse(stored) as { wallet?: string };
        setWalletPubkey(c.wallet ?? null);
      }
    } catch {}
  }, []);

  const { credential, status } = useAbraxasID();
  const hasSocialStamp = useReclaimSocialStamp(walletAddress ?? walletPubkey);

  // walletStr declared before any function that uses it
  const walletStr = walletAddress ?? walletPubkey;

  // Derive earned stamps from live credential or prop override, plus
  // the real Reclaim social stamp check, merged in regardless of which
  // path above is active
  const baseEarned: StampId[] = propStamps
    ?? stampsFromCredential(credential?.level)
    ?? (status === "verified" ? ["identity", "compliance"] : []);
  const earned: StampId[] = hasSocialStamp && !baseEarned.includes("social")
    ? [...baseEarned, "social"]
    : baseEarned;

  const total       = ALL_STAMPS.length;
  const earnedCount = earned.length;
  const trustPct    = Math.round((earnedCount / total) * 100);
  const trustLabel  =
    earnedCount === 0 ? "UNVERIFIED"
    : earnedCount <= 2 ? "BASIC"
    : earnedCount <= 5 ? "VERIFIED"
    : earnedCount <= 8 ? "TRUSTED"
    : "ELITE";
  const trustColor  =
    trustLabel === "UNVERIFIED" ? "rgba(21,21,26,0.25)"
    : trustLabel === "BASIC"    ? A
    : trustLabel === "VERIFIED" ? G
    : trustLabel === "TRUSTED"  ? B : G;

  async function handleGetVerified() {
    setLaunching(true);
    try {
      const res = await fetch("/api/idv/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletStr ?? "anon", level: "STANDARD" }),
      });
      const data = await res.json() as { session_url?: string };
      if (data.session_url) {
        window.open(data.session_url, "_blank");
      } else {
        onGetVerified?.();
      }
    } catch {
      onGetVerified?.();
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div style={{ fontFamily:M }}>
      {/* Passport card */}
      <div style={{ borderRadius:12, overflow:"hidden",
                     border:`1px solid ${G}40`,
                     background:"#FFFFFF",
                     boxShadow:`0 0 24px ${G}10, 0 8px 24px rgba(0,0,0,0.08)`,
                     position:"relative" }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                       pointerEvents:"none" }} viewBox="0 0 800 200" preserveAspectRatio="none">
          <line x1="0" y1="200" x2="800" y2="0" stroke={G} strokeWidth="0.5" strokeOpacity="0.12"/>
        </svg>
        {/* Header */}
        <div style={{ background:`${G}12`, borderBottom:`1px solid ${G}25`,
                       padding:"0.625rem 1.25rem",
                       display:"flex", alignItems:"center",
                       justifyContent:"space-between", flexWrap:"wrap", gap:"0.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
            <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 38,20 20,38 2,20" stroke={G} strokeWidth="2" fill="none"/>
              <polygon points="20,8 32,20 20,32 8,20" stroke={G} strokeWidth="1.5" fill={`${G}15`}/>
              <circle cx="20" cy="20" r="3" fill={G}/>
            </svg>
            <span style={{ fontFamily:M, fontSize:"0.72rem", fontWeight:900,
                            color:G, letterSpacing:"0.15em" }}>ABRAXAS PASSPORT</span>
          </div>
          <div style={{ display:"flex", gap:"0.375rem", alignItems:"center" }}>
            {status === "checking" && (
              <span style={{ fontFamily:M, fontSize:"0.55rem",
                              color:"rgba(21,21,26,0.3)" }}>CHECKING…</span>
            )}
            <div style={{ width:6, height:6, borderRadius:"50%",
                           background: status === "verified" ? G : "rgba(21,21,26,0.18)",
                           boxShadow: status === "verified" ? `0 0 5px ${G}` : "none" }}/>
            <span style={{ fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                            color:trustColor, letterSpacing:"0.1em",
                            textTransform:"uppercase" }}>{trustLabel}</span>
          </div>
        </div>
        {/* Body */}
        <div style={{ padding:"1.25rem 1.375rem",
                       display:"flex", justifyContent:"space-between",
                       alignItems:"flex-start", flexWrap:"wrap", gap:"1rem" }}>
          <div style={{ flex:1, minWidth:200 }}>
            <h2 style={{ fontFamily:"Georgia,serif",
                          fontSize:"clamp(1.4rem,3.5vw,2rem)",
                          fontWeight:700, color:W, lineHeight:1.15,
                          letterSpacing:"-0.01em", margin:"0 0 0.625rem" }}>
              Verify Once.<br/>
              <span style={{ color:G }}>Transact Everywhere.</span>
            </h2>
            <p style={{ fontFamily:S, fontSize:"0.78rem",
                         color:"rgba(21,21,26,0.45)", lineHeight:1.7,
                         maxWidth:420, margin:"0 0 1rem" }}>
              One verification. Every integrated protocol, lender, marketplace,
              and registry accepts it, recognized everywhere onchain.
            </p>
            {/* Trust bar */}
            <div style={{ marginBottom:"1rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontFamily:M, fontSize:"0.55rem",
                                color:"rgba(21,21,26,0.3)", letterSpacing:"0.1em",
                                textTransform:"uppercase" }}>TRUST LEVEL</span>
                <span style={{ fontFamily:M, fontSize:"0.55rem",
                                fontWeight:700, color:trustColor }}>
                  {earnedCount}/{total} CREDENTIALS
                </span>
              </div>
              <div style={{ height:4, background:"rgba(21,21,26,0.08)",
                             borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:2,
                               background:`${G}`,
                               width:`${Math.max(trustPct,4)}%`,
                               transition:"width 0.5s ease" }}/>
              </div>
            </div>
            {/* CTAs */}
            <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
              {status === "verified" ? (
                <div style={{ padding:"0.625rem 1.25rem", borderRadius:5,
                               background:`${G}15`, border:`1px solid ${G}40`,
                               fontFamily:M, fontSize:"0.75rem", fontWeight:900,
                               color:G, letterSpacing:"0.05em" }}>
                  ✓ PASSPORT ACTIVE
                </div>
              ) : (
                <button onClick={handleGetVerified} disabled={launching}
                  style={{ padding:"0.625rem 1.25rem", borderRadius:5, border:"none",
                            background:G, color:"#000", fontFamily:M,
                            fontSize:"0.78rem", fontWeight:900, cursor:"pointer",
                            letterSpacing:"0.05em", textTransform:"uppercase",
                            boxShadow:`0 0 16px ${G}40`,
                            opacity: launching ? 0.7 : 1 }}>
                  {launching ? "LAUNCHING…" : "GET VERIFIED →"}
                </button>
              )}
              <a href="/identity" style={{ padding:"0.625rem 1rem", borderRadius:5,
                  border:`1px solid ${BDR}`, background:"transparent",
                  color:"rgba(21,21,26,0.4)", fontFamily:M, fontSize:"0.72rem",
                  fontWeight:700, textDecoration:"none", display:"inline-block",
                  letterSpacing:"0.06em", textTransform:"uppercase" }}>
                LEARN MORE
              </a>
            </div>
          </div>
          {/* Right: wallet info */}
          <div style={{ flexShrink:0, minWidth:160 }}>
            <div style={{ padding:"0.875rem", borderRadius:8,
                           background:"rgba(21,21,26,0.03)",
                           border:`1px solid ${BDR}`, marginBottom:"0.625rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(21,21,26,0.25)", letterSpacing:"0.1em",
                             textTransform:"uppercase", marginBottom:"0.375rem" }}>
                DOCUMENT NO.
              </div>
              <div style={{ fontFamily:M, fontSize:"0.65rem", fontWeight:700,
                             color:"rgba(21,21,26,0.4)", letterSpacing:"0.06em",
                             marginBottom:"0.5rem" }}>
                {walletStr ? walletStr.slice(0,8)+"…"+walletStr.slice(-5) : "NOT CONNECTED"}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(21,21,26,0.2)" }}>
                SOLANA MAINNET · VERIFIED CREDENTIAL
              </div>
              <div style={{ fontFamily:S, fontSize:"0.6rem",
                             color:"rgba(21,21,26,0.3)", marginTop:"0.4rem",
                             lineHeight:1.5 }}>
                No documents stored on-chain, only cryptographic proof.
              </div>
            </div>
            <button onClick={() => {
                const credential = {
                  protocol: "abraxas",
                  wallet: walletStr ?? null,
                  credentials_active: earnedCount,
                  stamps: earned,
                  level: trustLabel,
                  issued: new Date().toISOString(),
                };
                navigator.clipboard.writeText(JSON.stringify(credential, null, 2));
              }}
              style={{ width:"100%", padding:"0.45rem", borderRadius:6,
                        border:`1px solid ${BDR}`, background:"transparent",
                        color:"rgba(21,21,26,0.45)", fontFamily:M,
                        fontSize:"0.56rem", fontWeight:700, cursor:"pointer",
                        marginBottom:"0.625rem", letterSpacing:"0.04em" }}>
              COPY CREDENTIAL JSON
            </button>
            <div style={{ fontFamily:M, fontSize:"0.52rem",
                           color: earnedCount > 0 ? G : "rgba(21,21,26,0.25)",
                           letterSpacing:"0.08em", textAlign:"right" }}>
              {earnedCount > 0
                ? `✓ ${earnedCount} CREDENTIAL${earnedCount>1?"S":""} ACTIVE`
                : "NO CREDENTIALS YET"}
            </div>
          </div>
        </div>
        {/* Bottom strip */}
        <div style={{ background:"rgba(21,21,26,0.04)", borderTop:`1px solid ${BDR}`,
                       padding:"0.4rem 1.375rem", display:"flex", gap:"1.5rem" }}>
          {["ABRAXAS PROTOCOL","SOLANA MAINNET","VERIFIED CREDENTIAL","BUILD 2026.1"].map(t => (
            <span key={t} style={{ fontFamily:M, fontSize:"0.48rem",
                                    color:"rgba(21,21,26,0.3)",
                                    letterSpacing:"0.1em" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Stamps grid */}
      <div style={{ marginTop:"1.25rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                       alignItems:"center", marginBottom:"0.75rem" }}>
          <span style={{ fontFamily:M, fontSize:"0.58rem",
                          color:"rgba(21,21,26,0.3)",
                          letterSpacing:"0.14em", textTransform:"uppercase" }}>
            VERIFICATION STAMPS
          </span>
          <span style={{ fontFamily:M, fontSize:"0.52rem",
                          color:`${G}60`, letterSpacing:"0.08em" }}>
            {earnedCount}/{total} EARNED
          </span>
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",
                       gap:"0.75rem" }}>
          {ALL_STAMPS.map(s => (
            <Stamp key={s.id} stamp={s} earned={earned.includes(s.id)}/>
          ))}
        </div>
      </div>

      {/* Vision note */}
      <div style={{ marginTop:"1.25rem", padding:"0.875rem 1rem", borderRadius:7,
                     background:"rgba(16,185,129,0.04)",
                     border:"1px solid rgba(16,185,129,0.15)" }}>
        <div style={{ fontFamily:M, fontSize:"0.55rem", color:G,
                       letterSpacing:"0.14em", textTransform:"uppercase",
                       marginBottom:"0.5rem" }}>
          THE PASSPORT VISION
        </div>
        <p style={{ fontFamily:S, fontSize:"0.72rem",
                     color:"rgba(21,21,26,0.4)", lineHeight:1.7, margin:0 }}>
          Today, people carry passports between countries. Tomorrow, they carry
          Abraxas Passports between protocols. Verify once. identity, business,
          asset ownership, accreditation. and carry that trust across every lender,
          marketplace, registry, and payment rail you ever touch. No re-KYC.
          No redundant uploads. One credential. Every ecosystem.
        </p>
      </div>
    </div>
  );
}
