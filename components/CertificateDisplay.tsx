"use client";
// FILE: components/CertificateDisplay.tsx
// Verification Certificate display — beautiful, institutional.
// Fetches from public /api/certificates/[id]/verify endpoint.
// Can be embedded on any asset detail page.

import { useState, useEffect } from "react";

const MONO = "'JetBrains Mono',monospace";

interface CertData {
  valid:             boolean;
  certificateId:     string;
  assetId:           string;
  verifierId:        string;
  verifierName:      string;
  verifierSignature: string;
  provenanceRoot:    string;
  custodyRef:        string;
  collateralScore:   number;
  fraudRiskScore:    number;
  liquidityRating:   string;
  issuedAt:          string;
  anchoredTx:        string;
  revokedAt?:        string;
  revocationReason?: string;
}

function Field({ label, value, mono=true, highlight=false }: {
  label:string; value:string; mono?:boolean; highlight?:boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isLong = value.length > 32;

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(()=>setCopied(false), 1600);
  }

  return(
    <div style={{padding:"0.625rem 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
      <div style={{fontSize:"0.36rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
        fontFamily:MONO,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:3}}>
        {label}
      </div>
      <div style={{display:"flex",alignItems:"flex-start",gap:"0.5rem"}}>
        <div style={{fontSize:mono?"0.46rem":"0.54rem",
          fontWeight:highlight?800:500,
          color:highlight?"#14F195":"rgba(255,255,255,0.6)",
          fontFamily:mono?MONO:"inherit",
          wordBreak:"break-all",flex:1,lineHeight:1.4}}>
          {value}
        </div>
        {isLong&&(
          <button onClick={copy} style={{padding:"0.15rem 0.4rem",borderRadius:"3px",
            border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",
            color:copied?"#14F195":"rgba(255,255,255,0.3)",fontSize:"0.34rem",
            cursor:"pointer",fontFamily:MONO,flexShrink:0,transition:"color 0.2s"}}>
            {copied?"✓":"Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

export function CertificateDisplay({ certificateId }: { certificateId: string }) {
  const [cert,    setCert]    = useState<CertData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(()=>{
    if(!certificateId) return;
    setLoading(true);
    fetch(`/api/certificates/${certificateId}/verify`)
      .then(r=>r.json())
      .then(d=>{ if(d.valid!==undefined) setCert(d); else setError("Certificate not found"); })
      .catch(()=>setError("Could not reach verification endpoint"))
      .finally(()=>setLoading(false));
  },[certificateId]);

  if(loading) return(
    <div style={{padding:"2rem",textAlign:"center",fontSize:"0.54rem",
      color:"rgba(255,255,255,0.2)",fontFamily:MONO}}>
      Verifying certificate…
    </div>
  );

  if(error||!cert) return(
    <div style={{padding:"1.25rem",background:"rgba(242,107,107,0.06)",
      border:"1px solid rgba(242,107,107,0.2)",borderRadius:"8px",
      fontSize:"0.54rem",color:"#f26b6b",fontFamily:MONO}}>
      {error||"Certificate unavailable"}
    </div>
  );

  const isRevoked = !!cert.revokedAt;

  return(
    <div style={{
      border:`1px solid ${isRevoked?"rgba(242,107,107,0.3)":"rgba(20,241,149,0.2)"}`,
      borderRadius:"12px",overflow:"hidden",
      background:"rgba(6,8,16,0.98)",fontFamily:MONO,
    }}>
      {/* Header */}
      <div style={{
        padding:"1.25rem",
        background:isRevoked?"rgba(242,107,107,0.06)":"rgba(20,241,149,0.04)",
        borderBottom:`1px solid ${isRevoked?"rgba(242,107,107,0.15)":"rgba(20,241,149,0.1)"}`,
      }}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:"0.5rem",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
            <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,
              background:isRevoked?"#f26b6b":"#14F195",
              boxShadow:`0 0 12px ${isRevoked?"rgba(242,107,107,0.5)":"rgba(20,241,149,0.5)"}`}}/>
            <div>
              <div style={{fontWeight:900,fontSize:"0.82rem",
                color:isRevoked?"#f26b6b":"#14F195",letterSpacing:"-0.01em"}}>
                {isRevoked?"CERTIFICATE REVOKED":"CERTIFICATE VERIFIED"}
              </div>
              <div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.25)",marginTop:2}}>
                Abraxas Authentication Standard · AAS-1 · Sui
              </div>
            </div>
          </div>
          <div style={{padding:"0.25rem 0.625rem",borderRadius:"4px",
            background:isRevoked?"rgba(242,107,107,0.1)":"rgba(20,241,149,0.08)",
            border:`1px solid ${isRevoked?"rgba(242,107,107,0.25)":"rgba(20,241,149,0.2)"}`}}>
            <span style={{fontSize:"0.36rem",fontWeight:700,
              color:isRevoked?"#f26b6b":"#14F195",letterSpacing:"0.12em"}}>
              {cert.liquidityRating.toUpperCase()} LIQUIDITY
            </span>
          </div>
        </div>
      </div>

      {/* Score strip */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,
        background:"rgba(255,255,255,0.06)"}}>
        {([
          ["Collateral Score", `${cert.collateralScore}/100`, cert.collateralScore>=80?"#14F195":cert.collateralScore>=60?"#FBBF24":"#f26b6b"],
          ["Fraud Risk Score", `${cert.fraudRiskScore}/100`,  cert.fraudRiskScore<=20?"#14F195":cert.fraudRiskScore<=50?"#FBBF24":"#f26b6b"],
        ] as [string,string,string][]).map(([l,v,c])=>(
          <div key={l} style={{padding:"0.875rem 1rem",background:"rgba(6,8,16,0.98)"}}>
            <div style={{fontSize:"0.88rem",fontWeight:900,color:c,
              fontFamily:MONO,lineHeight:1,marginBottom:3}}>{v}</div>
            <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.2)",
              textTransform:"uppercase",letterSpacing:"0.1em"}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Fields */}
      <div style={{padding:"0 1.25rem"}}>
        <Field label="Certificate ID"       value={cert.certificateId}     highlight/>
        <Field label="Issued At"            value={new Date(cert.issuedAt).toUTCString()} mono={false}/>
        <Field label="Verifier"             value={cert.verifierName}      mono={false}/>
        <Field label="Verifier ID"          value={cert.verifierId}/>
        <Field label="Verifier Signature"   value={cert.verifierSignature}/>
        <Field label="Provenance Root"      value={cert.provenanceRoot}    highlight/>
        <Field label="Custody Reference"    value={cert.custodyRef}/>
        <Field label="Sui Anchor Object"     value={cert.anchoredTx}/>
        {isRevoked&&<Field label="Revoked"  value={cert.revokedAt!}/>}
        {cert.revocationReason&&<Field label="Revocation Reason" value={cert.revocationReason}/>}
      </div>

      {/* Footer */}
      <div style={{padding:"1rem 1.25rem",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        display:"flex",justifyContent:"space-between",
        alignItems:"center",flexWrap:"wrap",gap:"0.5rem"}}>
        <div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.2)",lineHeight:1.6}}>
          This certificate is publicly verifiable by anyone via Suiscan or GET /api/sui/passport.
          The verifier signature and provenance root cannot be forged.
        </div>
        {cert.anchoredTx && !cert.anchoredTx.startsWith("DEMO") && (
          <a href={`https://solscan.io/tx/${cert.anchoredTx}`}
            target="_blank" rel="noopener noreferrer"
            style={{padding:"0.4rem 0.875rem",borderRadius:"4px",
              textDecoration:"none",border:"1px solid rgba(107,140,255,0.25)",
              background:"rgba(107,140,255,0.07)",color:"#6b8cff",
              fontSize:"0.46rem",fontWeight:700,fontFamily:MONO,whiteSpace:"nowrap"}}>
            View on Solscan →
          </a>
        )}
      </div>
    </div>
  );
}

// Standalone page wrapper
export function CertificatePage({ certId }: { certId: string }) {
  return(
    <div style={{maxWidth:620,margin:"3rem auto",padding:"0 1rem 4rem"}}>
      <div style={{marginBottom:"1.5rem"}}>
        <div style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.25)",fontFamily:MONO,
          textTransform:"uppercase",letterSpacing:"0.2em",marginBottom:"0.4rem"}}>
          Certificate Verification
        </div>
        <h1 style={{fontWeight:900,fontSize:"clamp(1.4rem,3vw,2rem)",color:"#f0f0f0",
          margin:0,letterSpacing:"-0.03em"}}>Abraxas Verification Certificate</h1>
      </div>
      <CertificateDisplay certificateId={certId}/>
    </div>
  );
}

// Default export for compatibility with both import styles
export default CertificateDisplay;
