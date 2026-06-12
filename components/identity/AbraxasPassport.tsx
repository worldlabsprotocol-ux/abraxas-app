// FILE: components/identity/AbraxasPassport.tsx
// Abraxas Digital Passport — visual identity hub.
// Verify once. Transact everywhere.
// Shows passport card + credential stamps + trust progression.
"use client";

import { useState } from "react";

const M   = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S   = "system-ui,-apple-system,sans-serif";
const G   = "#10B981";
const A   = "#F59E0B";
const B   = "#3B82F6";
const P   = "#8B5CF6";
const R   = "#EF4444";
const W   = "#F8FAFC";
const BDR = "#1C2333";
const BG  = "#0D1117";

// All available credential stamps
const ALL_STAMPS = [
  { id:"identity",   label:"Identity Verified",        icon:"◈", color:G,  desc:"Gov ID + liveness confirmed via Veriff" },
  { id:"biometric",  label:"Biometrics Confirmed",     icon:"⬡", color:G,  desc:"Liveness match · face verification" },
  { id:"business",   label:"Business Verified",        icon:"⬛", color:B,  desc:"KYB complete · entity confirmed" },
  { id:"investor",   label:"Accredited Investor",      icon:"◆", color:P,  desc:"Meets SEC accreditation criteria" },
  { id:"owner",      label:"Asset Owner Verified",     icon:"◉", color:A,  desc:"Ownership claim attested on-chain" },
  { id:"royalty",    label:"Royalty Rights Verified",  icon:"♪", color:P,  desc:"Publishing / royalty claim confirmed" },
  { id:"property",   label:"Property Owner Verified",  icon:"⌂", color:A,  desc:"Real estate title chain verified" },
  { id:"tribal",     label:"Tribal Partner Verified",  icon:"◈", color:G,  desc:"Sovereign land / mineral rights" },
  { id:"compliance", label:"Compliance Cleared",       icon:"✓", color:G,  desc:"AML / OFAC screening passed" },
  { id:"lending",    label:"Lending Eligible",         icon:"$", color:G,  desc:"Collateral credit verified" },
] as const;

type StampId = typeof ALL_STAMPS[number]["id"];

// Demo: which stamps are earned (in real app, comes from credential API)
const EARNED_DEMO: StampId[] = ["identity","compliance"];

function Stamp({ stamp, earned }: {
  stamp: typeof ALL_STAMPS[number]; earned: boolean
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: "0.375rem",
        cursor: "default",
      }}
    >
      {/* Stamp circle */}
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        border: `2px solid ${earned ? stamp.color : "rgba(255,255,255,0.1)"}`,
        background: earned
          ? `radial-gradient(circle at 40% 40%, ${stamp.color}20, ${stamp.color}08)`
          : "rgba(255,255,255,0.02)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        boxShadow: earned ? `0 0 12px ${stamp.color}30, inset 0 0 20px ${stamp.color}08` : "none",
        transition: "all 0.2s",
        transform: hovered ? "scale(1.05)" : "scale(1)",
        opacity: earned ? 1 : 0.35,
      }}>
        <span style={{
          fontFamily: M, fontSize: "1.1rem",
          color: earned ? stamp.color : "rgba(255,255,255,0.2)",
        }}>{stamp.icon}</span>
        {/* Notch ring decoration */}
        {earned && (
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
            viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="none"
              stroke={stamp.color} strokeWidth="1" strokeOpacity="0.3"
              strokeDasharray="4 3" strokeDashoffset="0"/>
          </svg>
        )}
      </div>
      <div style={{
        fontFamily: M, fontSize: "0.5rem", fontWeight: 700,
        color: earned ? stamp.color : "rgba(255,255,255,0.2)",
        textTransform: "uppercase", letterSpacing: "0.06em",
        textAlign: "center", maxWidth: 72, lineHeight: 1.3,
      }}>
        {stamp.label}
      </div>

      {/* Tooltip on hover */}
      {hovered && earned && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%",
          transform: "translateX(-50%)", marginBottom: 8,
          background: "#0A0C10", border: `1px solid ${stamp.color}40`,
          borderRadius: 5, padding: "0.4rem 0.6rem",
          fontFamily: S, fontSize: "0.65rem",
          color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap",
          zIndex: 10, pointerEvents: "none",
          boxShadow: `0 4px 16px rgba(0,0,0,0.6)`,
        }}>
          {stamp.desc}
        </div>
      )}
    </div>
  );
}

export function AbraxasPassport({
  onGetVerified,
  walletAddress,
  earnedStamps = EARNED_DEMO,
}: {
  onGetVerified?: () => void;
  walletAddress?: string;
  earnedStamps?: StampId[];
}) {
  const earned = earnedStamps.length;
  const total  = ALL_STAMPS.length;
  const trustPct = Math.round((earned / total) * 100);
  const trustLabel =
    earned === 0 ? "UNVERIFIED"
    : earned <= 2 ? "BASIC"
    : earned <= 5 ? "VERIFIED"
    : earned <= 8 ? "TRUSTED"
    : "ELITE";

  const trustColor =
    trustLabel === "UNVERIFIED" ? "rgba(255,255,255,0.2)"
    : trustLabel === "BASIC"    ? A
    : trustLabel === "VERIFIED" ? G
    : trustLabel === "TRUSTED"  ? B
    : P;

  return (
    <div style={{ fontFamily: M }}>

      {/* ── PASSPORT CARD ──────────────────────────────────────────── */}
      <div style={{
        borderRadius: 12, overflow: "hidden",
        border: `1px solid ${G}40`,
        background: `linear-gradient(135deg, #0A1A0F 0%, #060810 60%, #0A0C10 100%)`,
        boxShadow: `0 0 40px ${G}12, 0 24px 48px rgba(0,0,0,0.6)`,
        position: "relative",
      }}>
        {/* Decorative diagonal rule */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%",
                       pointerEvents:"none" }} viewBox="0 0 800 200" preserveAspectRatio="none">
          <line x1="0" y1="200" x2="800" y2="0" stroke={G} strokeWidth="0.5" strokeOpacity="0.12"/>
          <line x1="0" y1="140" x2="800" y2="-60" stroke={G} strokeWidth="0.5" strokeOpacity="0.07"/>
        </svg>

        {/* Header bar */}
        <div style={{
          background: `${G}12`, borderBottom: `1px solid ${G}25`,
          padding: "0.625rem 1.25rem",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
            {/* Diamond logo */}
            <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
              <polygon points="20,2 38,20 20,38 2,20"
                stroke={G} strokeWidth="2" fill="none"/>
              <polygon points="20,8 32,20 20,32 8,20"
                stroke={G} strokeWidth="1.5" fill={`${G}15`}/>
              <circle cx="20" cy="20" r="3" fill={G}/>
            </svg>
            <span style={{ fontFamily: M, fontSize: "0.72rem", fontWeight: 900,
                            color: W, letterSpacing: "0.15em" }}>
              ABRAXAS PASSPORT
            </span>
          </div>
          <div style={{ display:"flex", gap:"0.375rem", alignItems:"center" }}>
            <div style={{ width:6, height:6, borderRadius:"50%",
                           background: earned > 0 ? G : "rgba(255,255,255,0.2)",
                           boxShadow: earned > 0 ? `0 0 5px ${G}` : "none" }}/>
            <span style={{ fontFamily: M, fontSize: "0.55rem", fontWeight: 700,
                            color: trustColor, letterSpacing: "0.1em",
                            textTransform: "uppercase" }}>
              {trustLabel}
            </span>
          </div>
        </div>

        {/* Main card body */}
        <div style={{ padding: "1.25rem 1.375rem",
                       display: "flex", justifyContent: "space-between",
                       alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {/* Headline */}
            <h2 style={{ fontFamily: "Georgia,'Times New Roman',serif",
                          fontSize: "clamp(1.4rem,3.5vw,2rem)",
                          fontWeight: 700, color: W, lineHeight: 1.15,
                          letterSpacing: "-0.01em", margin: "0 0 0.625rem" }}>
              Verify Once.<br/>
              <span style={{ color: G }}>Transact Everywhere.</span>
            </h2>
            <p style={{ fontFamily: S, fontSize: "0.78rem",
                         color: "rgba(255,255,255,0.45)", lineHeight: 1.7,
                         maxWidth: 420, margin: "0 0 1rem" }}>
              A reusable trust layer for ownership, identity, and real-world assets.
              Complete verification once — your Abraxas Passport is recognized across
              every integrated protocol, lender, marketplace, and registry.
            </p>

            {/* Trust bar */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                             marginBottom: 4 }}>
                <span style={{ fontFamily:M, fontSize:"0.55rem",
                                color:"rgba(255,255,255,0.3)",
                                letterSpacing:"0.1em", textTransform:"uppercase" }}>
                  TRUST LEVEL
                </span>
                <span style={{ fontFamily:M, fontSize:"0.55rem",
                                fontWeight:700, color:trustColor }}>
                  {earned}/{total} CREDENTIALS
                </span>
              </div>
              <div style={{ height:4, background:"rgba(255,255,255,0.07)",
                             borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:2,
                               background:`linear-gradient(90deg, ${G}, ${trustColor})`,
                               width:`${Math.max(trustPct, 4)}%`,
                               transition:"width 0.5s ease" }}/>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap" }}>
              <button onClick={onGetVerified} style={{
                padding:"0.625rem 1.25rem", borderRadius:5, border:"none",
                background:G, color:"#000", fontFamily:M,
                fontSize:"0.78rem", fontWeight:900, cursor:"pointer",
                letterSpacing:"0.05em", textTransform:"uppercase",
                boxShadow:`0 0 16px ${G}40`,
              }}>
                GET VERIFIED →
              </button>
              <a href="#abraxas-id" style={{
                padding:"0.625rem 1rem", borderRadius:5,
                border:`1px solid ${BDR}`, background:"transparent",
                color:"rgba(255,255,255,0.4)", fontFamily:M,
                fontSize:"0.72rem", fontWeight:700,
                textDecoration:"none", display:"inline-block",
                letterSpacing:"0.06em", textTransform:"uppercase",
              }}>
                LEARN MORE
              </a>
            </div>
          </div>

          {/* Right: wallet info + mini stamp preview */}
          <div style={{ flexShrink:0, minWidth:160 }}>
            <div style={{ padding:"0.875rem", borderRadius:8,
                           background:"rgba(255,255,255,0.03)",
                           border:`1px solid ${BDR}`, marginBottom:"0.625rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(255,255,255,0.25)",
                             letterSpacing:"0.1em", textTransform:"uppercase",
                             marginBottom:"0.375rem" }}>
                DOCUMENT NO.
              </div>
              <div style={{ fontFamily:M, fontSize:"0.65rem",
                             fontWeight:700, color:"rgba(255,255,255,0.4)",
                             letterSpacing:"0.06em", marginBottom:"0.5rem" }}>
                {walletAddress ? walletAddress.slice(0,8)+"…"+walletAddress.slice(-5) : "NOT CONNECTED"}
              </div>
              <div style={{ fontFamily:M, fontSize:"0.52rem",
                             color:"rgba(255,255,255,0.2)",
                             letterSpacing:"0.08em" }}>
                SOLANA MAINNET · W3C VC 2.0
              </div>
            </div>
            <div style={{ fontFamily:M, fontSize:"0.52rem",
                           color: earned > 0 ? G : "rgba(255,255,255,0.2)",
                           letterSpacing:"0.08em", textAlign:"right" }}>
              {earned > 0 ? `✓ ${earned} CREDENTIAL${earned>1?"S":""} ACTIVE` : "NO CREDENTIALS YET"}
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{ background:"rgba(0,0,0,0.3)",
                       borderTop:`1px solid rgba(255,255,255,0.05)`,
                       padding:"0.4rem 1.375rem",
                       display:"flex", gap:"1.5rem",
                       alignItems:"center" }}>
          {[
            "ABRAXAS PROTOCOL",
            "SOLANA MAINNET",
            "W3C VC 2.0",
            "BUILD 2025.1",
          ].map(t => (
            <span key={t} style={{ fontFamily:M, fontSize:"0.48rem",
                                    color:"rgba(255,255,255,0.12)",
                                    letterSpacing:"0.1em" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── CREDENTIAL STAMPS GRID ─────────────────────────────────── */}
      <div style={{ marginTop:"1.25rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                       alignItems:"center", marginBottom:"0.75rem" }}>
          <span style={{ fontFamily:M, fontSize:"0.58rem",
                          color:"rgba(255,255,255,0.3)",
                          letterSpacing:"0.14em", textTransform:"uppercase" }}>
            VERIFICATION STAMPS
          </span>
          <span style={{ fontFamily:M, fontSize:"0.52rem",
                          color:`${G}60`, letterSpacing:"0.08em" }}>
            {earned}/{total} EARNED
          </span>
        </div>
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",
                       gap:"0.75rem" }}>
          {ALL_STAMPS.map(stamp => (
            <Stamp
              key={stamp.id}
              stamp={stamp}
              earned={earnedStamps.includes(stamp.id)}
            />
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
      <div style={{ marginTop:"1.25rem", padding:"0.875rem 1rem",
                     borderRadius:7, background:"rgba(16,185,129,0.04)",
                     border:`1px solid rgba(16,185,129,0.15)` }}>
        <div style={{ fontFamily:M, fontSize:"0.55rem", color:G,
                       letterSpacing:"0.14em", textTransform:"uppercase",
                       marginBottom:"0.5rem" }}>
          THE PASSPORT VISION
        </div>
        <p style={{ fontFamily:S, fontSize:"0.72rem",
                     color:"rgba(255,255,255,0.4)", lineHeight:1.7, margin:0 }}>
          Today, people carry passports between countries. Tomorrow, they'll carry
          Abraxas Passports between protocols. Verify once — identity, business,
          asset ownership, accreditation — and carry that trust across every
          lender, marketplace, registry, and payment rail you ever touch.
          No re-KYC. No redundant uploads. One credential. Every ecosystem.
        </p>
      </div>
    </div>
  );
}
