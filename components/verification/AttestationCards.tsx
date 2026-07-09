// FILE: components/verification/AttestationCards.tsx
// Attestation trust surfaces. each verification actor made visible.
// "Abraxas verifies whether a real-world asset is financeable."
"use client";
import { useState } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const GREEN = "#10B981"; const BLUE = "#3182CE"; const AMBER = "#ED8936";
const BORDER = "#1F2937"; const CARD = "#0E1117";

export interface Attestation {
  id:           string;
  type:         "ownership" | "custody" | "appraisal" | "revenue" | "legal" | "environmental" | "risk";
  issuer:       string;
  issuerLocation?: string;
  role:         string;
  issuedAt:     string;
  validUntil?:  string;
  signatureHash:string;
  claim:        string;
  confidence:   number; // 0-100
  onChain?:     boolean;
  txLink?:      string;
}

const TYPE_META: Record<Attestation["type"], { icon:string; color:string; label:string }> = {
  ownership:    { icon:"◉", color:GREEN,  label:"OWNERSHIP" },
  custody:      { icon:"◆", color:BLUE,   label:"CUSTODY" },
  appraisal:    { icon:"◈", color:AMBER,  label:"APPRAISAL" },
  revenue:      { icon:"⬡", color:GREEN,  label:"REVENUE" },
  legal:        { icon:"⬛", color:BLUE,   label:"LEGAL" },
  environmental:{ icon:"◭", color:GREEN,  label:"ENVIRONMENTAL" },
  risk:         { icon:"◎", color:AMBER,  label:"RISK" },
};

function AttestationCard({ att }: { att: Attestation }) {
  const [copied, setCopied] = useState(false);
  const meta = TYPE_META[att.type];

  return (
    <div style={{ background:CARD, border:`1px solid ${BORDER}`,
                   borderLeft:`3px solid ${meta.color}`,
                   borderRadius:"6px", padding:"1rem" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start",
                     justifyContent:"space-between", marginBottom:"0.75rem" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.35rem",
                         marginBottom:"0.25rem" }}>
            <span style={{ color:meta.color, fontSize:"0.5rem" }}>{meta.icon}</span>
            <span style={{ fontFamily:M, fontSize:"0.28rem", fontWeight:900,
                            color:meta.color, textTransform:"uppercase",
                            letterSpacing:"0.12em" }}>
              {meta.label} ATTESTATION
            </span>
          </div>
          <div style={{ fontFamily:M, fontSize:"clamp(0.5rem,1.5vw,0.62rem)",
                         fontWeight:800, color:"#f0f0f0" }}>
            {att.issuer}
          </div>
          {att.issuerLocation && (
            <div style={{ fontFamily:M, fontSize:"0.32rem",
                           color:"rgba(255,255,255,0.25)" }}>
              {att.issuerLocation}
            </div>
          )}
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontFamily:M, fontSize:"0.56rem", fontWeight:900,
                         color: att.confidence >= 80 ? GREEN : att.confidence >= 60 ? AMBER : "#f26b6b" }}>
            {att.confidence}%
          </div>
          <div style={{ fontFamily:M, fontSize:"0.26rem",
                         color:"rgba(255,255,255,0.2)" }}>
            CONFIDENCE
          </div>
        </div>
      </div>

      {/* Claim */}
      <div style={{ padding:"0.5rem 0.625rem", background:"rgba(255,255,255,0.02)",
                     border:`1px solid rgba(31,41,55,0.7)`, borderRadius:"4px",
                     marginBottom:"0.75rem" }}>
        <div style={{ fontFamily:M, fontSize:"0.38rem",
                       color:"rgba(255,255,255,0.45)", lineHeight:1.6,
                       fontStyle:"italic" }}>
          "{att.claim}"
        </div>
      </div>

      {/* Metadata row */}
      <div style={{ display:"flex", justifyContent:"space-between",
                     alignItems:"center", flexWrap:"wrap", gap:"0.375rem" }}>
        <div>
          <div style={{ fontFamily:M, fontSize:"0.28rem",
                         color:"rgba(255,255,255,0.2)", marginBottom:2 }}>
            ISSUED {att.issuedAt}
            {att.validUntil && ` · VALID UNTIL ${att.validUntil}`}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.375rem" }}>
            <code style={{ fontFamily:M, fontSize:"0.32rem", color:GREEN }}>
              {att.signatureHash.slice(0, 22)}…
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(att.signatureHash); setCopied(true); setTimeout(()=>setCopied(false),1500); }}
              style={{ padding:"1px 5px", borderRadius:"2px",
                        border:`1px solid ${BORDER}`, background:`${GREEN}08`,
                        color:GREEN, fontSize:"0.26rem", cursor:"pointer", fontFamily:M }}>
              {copied ? "✓" : "COPY"}
            </button>
            {att.txLink && (
              <a href={att.txLink} target="_blank" rel="noopener noreferrer"
                style={{ padding:"1px 5px", borderRadius:"2px",
                          border:`1px solid ${BORDER}`, background:`${BLUE}08`,
                          color:BLUE, fontSize:"0.26rem", textDecoration:"none", fontFamily:M }}>
                CHAIN →
              </a>
            )}
          </div>
        </div>
        {att.onChain && (
          <div style={{ padding:"2px 8px", borderRadius:"3px",
                         background:`${GREEN}10`, border:`1px solid ${GREEN}25` }}>
            <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:900,
                            color:GREEN, textTransform:"uppercase", letterSpacing:"0.1em" }}>
              ON-CHAIN ◉
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  attestations: Attestation[];
  title?: string;
}

export function AttestationCards({ attestations, title = "Attestation Registry" }: Props) {
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"1rem", paddingBottom:"0.625rem",
                     borderBottom:`1px solid ${BORDER}` }}>
        <span style={{ color:GREEN, fontSize:"0.7rem" }}>◉</span>
        <span style={{ fontFamily:M, fontSize:"0.36rem", fontWeight:700,
                        color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                        letterSpacing:"0.2em" }}>
          {title}
        </span>
        <div style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:"3px",
                       background:"rgba(16,185,129,0.08)",
                       border:"1px solid rgba(16,185,129,0.2)" }}>
          <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                          color:GREEN }}>
            {attestations.length} ATTESTATIONS
          </span>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem" }}>
        {attestations.map(a => <AttestationCard key={a.id} att={a} />)}
      </div>
    </div>
  );
}
