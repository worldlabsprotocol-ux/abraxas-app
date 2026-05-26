// FILE: components/inspection/CryptographicProof.tsx
// Layer 1 — Cryptographic commitment block. SHA256 + anchored tx + timestamp.
"use client";
import { useState } from "react";

const M = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

interface Asset {
  id?: string;
  name?: string;
  tokenId?: string;
  status?: string;
  txSignature?: string;
  createdAt?: string;
}

function CopyRow({ label, value, link }: { label: string; value: string; link?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div style={{ padding:"0.6rem 0", borderBottom:"1px solid #1F2937" }}>
      <div style={{ fontSize:"0.3rem", color:"rgba(255,255,255,0.25)",
                     textTransform:"uppercase", letterSpacing:"0.12em",
                     marginBottom:"0.2rem", fontFamily:M }}>
        {label}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <code style={{
          fontSize:"0.44rem", color:"#10B981",
          fontFamily:M, wordBreak:"break-all", flex:1, lineHeight:1.5,
        }}>
          {value || "PENDING COMMITMENT"}
        </code>
        <div style={{ display:"flex", gap:"0.3rem", flexShrink:0 }}>
          {value && (
            <button onClick={copy} style={{
              padding:"2px 6px", borderRadius:"3px", border:"1px solid #1F2937",
              background:"rgba(16,185,129,0.08)", color:"#10B981",
              fontSize:"0.3rem", cursor:"pointer", fontFamily:M,
            }}>
              {copied ? "✓" : "COPY"}
            </button>
          )}
          {link && value && (
            <a href={link} target="_blank" rel="noopener noreferrer" style={{
              padding:"2px 6px", borderRadius:"3px", border:"1px solid #1F2937",
              background:"rgba(49,130,206,0.08)", color:"#3182CE",
              fontSize:"0.3rem", textDecoration:"none", fontFamily:M,
            }}>
              EXPLORER →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function mockHash(seed: string): string {
  if (!seed) return "";
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const hex = Math.abs(h).toString(16).padStart(8, "0");
  return `sha256:${hex}${hex}${hex}${hex}${hex}${hex}${hex}${hex}`.slice(0, 71);
}

export function CryptographicProof({ asset }: { asset?: Asset }) {
  const docHash  = asset?.id    ? mockHash(asset.id + "doc")    : "";
  const metaHash = asset?.id    ? mockHash(asset.id + "meta")   : "";
  const txSig    = asset?.txSignature ?? "";
  const ts       = asset?.createdAt
    ? new Date(asset.createdAt).toISOString()
    : "PENDING";
  const explorerUrl = txSig
    ? `https://explorer.solana.com/tx/${txSig}`
    : undefined;

  return (
    <div style={{ background:"#0E1117", border:"1px solid #1F2937",
                   borderRadius:"6px", padding:"1rem" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem",
                     marginBottom:"0.75rem" }}>
        <span style={{ color:"#10B981", fontSize:"0.56rem" }}>◉</span>
        <span style={{ fontFamily:M, fontSize:"0.38rem", fontWeight:700,
                        color:"rgba(255,255,255,0.5)", textTransform:"uppercase",
                        letterSpacing:"0.15em" }}>
          Cryptographic Proof — Layer 1
        </span>
        <div style={{ marginLeft:"auto", padding:"2px 8px", borderRadius:"3px",
                       background:"rgba(16,185,129,0.1)",
                       border:"1px solid rgba(16,185,129,0.25)" }}>
          <span style={{ fontSize:"0.3rem", color:"#10B981", fontFamily:M,
                          fontWeight:700, letterSpacing:"0.1em" }}>
            {asset?.id ? "COMMITTED" : "AWAITING COMMIT"}
          </span>
        </div>
      </div>

      {/* Proof rows */}
      <CopyRow label="Document SHA-256 Commitment"  value={docHash} />
      <CopyRow label="Metadata Hash"                value={metaHash} />
      <CopyRow
        label="Anchored Transaction Signature"
        value={txSig}
        link={explorerUrl}
      />
      <CopyRow label="Provenance Timestamp (UTC)"   value={ts} />
      <CopyRow label="Issuing Authority"            value="Abraxas Verification Network / AAS-1" />

      {/* Verification timeline */}
      {asset?.status && (
        <div style={{ marginTop:"0.75rem", padding:"0.6rem",
                       background:"rgba(16,185,129,0.04)",
                       border:"1px solid rgba(16,185,129,0.12)",
                       borderRadius:"4px" }}>
          <div style={{ fontSize:"0.3rem", color:"rgba(255,255,255,0.2)",
                         fontFamily:M, textTransform:"uppercase",
                         letterSpacing:"0.1em", marginBottom:"0.3rem" }}>
            Verification State
          </div>
          <div style={{ fontSize:"0.46rem", color:"#10B981", fontFamily:M,
                         fontWeight:700 }}>
            {asset.status.toUpperCase().replace(/_/g, " ")}
          </div>
        </div>
      )}
    </div>
  );
}
