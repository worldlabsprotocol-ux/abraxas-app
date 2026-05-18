"use client";
// FILE: components/VerificationLifecycle.tsx
// The single most important missing section on the site.
// Shows the complete verification lifecycle — who verifies, how, and why it matters.
// Zero fake data. Every claim is architecturally real.
"use client";

import { useState } from "react";

const MONO = "'JetBrains Mono',monospace";

const STAGES = [
  {
    n:"01", label:"Asset Submission",
    color:"#C8A96E", icon:"◈",
    description:"Owner submits asset metadata, images, and supporting documentation. All files are SHA-256 hashed and the fingerprint is anchored to Solana before any review begins. The on-chain record is immutable from this point.",
    technical:"Token-2022 metadata extension · SHA-256 document hashing · Solana anchor tx",
    trustSignal:"The metadata fingerprint cannot be altered after submission. Any document substitution is cryptographically detectable.",
    actors:["Protocol (automated)"],
    outputs:["Immutable on-chain metadata hash","ASSET_SUBMITTED event logged","Verification record created"],
  },
  {
    n:"02", label:"Authentication Partner Review",
    color:"#FBBF24", icon:"◉",
    description:"An authorized authentication partner — a grading service, certified appraiser, or institutional verifier — reviews the physical asset and documentation. Their identity and co-signature are recorded on-chain.",
    technical:"Partner registry · Signed attestations · On-chain co-signature requirement",
    trustSignal:"You know exactly who reviewed the asset. Not 'the protocol.' A named, credentialed institution with accountability.",
    actors:["CGC, PSA, BGS (collectibles)","MAI Certified Appraisers (real estate)","Licensed petroleum engineers (mineral rights)","Certified watchmakers (timepieces)"],
    outputs:["VERIFIER_ASSIGNED event","Stage-by-stage review records","Partner signature stored"],
  },
  {
    n:"03", label:"Provenance + Ownership Validation",
    color:"#FBBF24", icon:"◫",
    description:"The complete ownership chain is documented and verified. For collectibles this means graded slab serial numbers. For real estate it means a 50-year title search. For mineral rights it means geological surveys and state clearances.",
    technical:"Merkle tree provenance records · IPFS document storage · Cross-referencing state registries",
    trustSignal:"A Merkle root of the provenance chain is anchored on-chain. Any gap or forgery in the history is mathematically detectable.",
    actors:["Title companies (real estate)","State geological surveys (mineral rights)","BIA and tribal councils (tribal land)","Grading registry APIs (collectibles)"],
    outputs:["Provenance Merkle root anchored","PROVENANCE_VALIDATED event","Document hashes stored"],
  },
  {
    n:"04", label:"Custody Assignment",
    color:"#6b8cff", icon:"◆",
    description:"The physical asset is transferred to a licensed, insured, institutional custodian. Brinks, Loomis, or a certified bonded storage facility receives the item and issues a vault receipt. Custody cannot be transferred without a dual signature.",
    technical:"Custody record with vault reference · Co-signed state transition · Insurance documentation",
    trustSignal:"You can see who holds the asset, where, under what insurance, and when the last physical audit occurred. The vault reference is on-chain.",
    actors:["Brinks Company","Loomis International","Certified bonded warehouses (spirits)","State-licensed automotive storage (vehicles)"],
    outputs:["Custody record created","CUSTODY_CONFIRMED event","Vault reference on-chain","Next audit date set"],
  },
  {
    n:"05", label:"Risk + Collateral Scoring",
    color:"#a855f7", icon:"⬡",
    description:"The protocol's risk engine scores the asset across five dimensions: liquidity, volatility, custody quality, provenance depth, and market comparables. The score directly determines the LTV cap — it is not a fixed value.",
    technical:"Multi-factor scoring algorithm · Oracle price feeds · Market comparable analysis",
    trustSignal:"LTV is computed from evidence, not assigned arbitrarily. A 90% confidence asset gets a higher LTV than a 60% confidence asset of the same class.",
    actors:["Protocol risk engine (automated)","Manual override by senior reviewer","Oracle price feed providers"],
    outputs:["Collateral score (0-100)","Risk tier (A/B/C/D)","Adjusted LTV cap","RISK_SCORED event"],
  },
  {
    n:"06", label:"Verification Certificate Mint",
    color:"#9945FF", icon:"◎",
    description:"A cryptographic verification certificate is minted as a Token-2022 on Solana. It contains the verification ID, verifier signature, custody reference, provenance Merkle root, collateral score, and fraud risk score. This token IS the proof.",
    technical:"Token-2022 · Ed25519 verifier signature · Metadata URI on Arweave · Certificate hash on-chain",
    trustSignal:"The certificate is portable, auditable, and verifiable by anyone with a Solana connection. It cannot be forged without the verifier's private key.",
    actors:["Protocol (automated)","Verifier (co-signs)","Custodian (referenced)"],
    outputs:["Token-2022 certificate minted","Metadata on Arweave","VERIFICATION_APPROVED event","TOKEN_MINTED event"],
  },
  {
    n:"07", label:"Collateral Activation",
    color:"#14F195", icon:"◉",
    description:"Once the verification certificate exists on-chain, the asset becomes eligible for USDC borrowing via Loopscale. The lender can independently verify the certificate, query the custody record, and inspect the full event history before approving any loan.",
    technical:"Loopscale integration · Collateral registry · Health factor monitoring · Liquidation rails",
    trustSignal:"Lenders are not trusting Abraxas's word. They can verify the certificate on-chain, check the custodian, and inspect the audit trail independently.",
    actors:["Loopscale (lender protocol)","Protocol (collateral monitor)","Oracle (price feeds)"],
    outputs:["Borrow eligibility activated","COLLATERAL_ACTIVATED event","Health factor monitoring begins"],
  },
];

export function VerificationLifecycle() {
  const [expanded, setExpanded] = useState<number|null>(null);

  return (
    <div style={{ fontFamily:MONO }}>

      {/* Header */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{ fontSize:"0.38rem", fontWeight:700,
          color:"rgba(200,169,110,0.5)", textTransform:"uppercase",
          letterSpacing:"0.2em", marginBottom:"0.5rem" }}>
          Protocol Infrastructure
        </div>
        <h2 style={{ fontWeight:900, fontSize:"clamp(1.2rem,2.5vw,1.8rem)",
          color:"#f0f0f0", margin:"0 0 0.625rem",
          letterSpacing:"-0.03em", lineHeight:1.1 }}>
          Verification Lifecycle
        </h2>
        <p style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.38)",
          lineHeight:1.75, maxWidth:560, margin:0 }}>
          Most tokenization platforms stop at minting. Abraxas operates a seven-stage
          verification pipeline where named, credentialed partners co-sign every state
          transition — and every action is immutably anchored on Solana.
        </p>
      </div>

      {/* Why it matters */}
      <div style={{ padding:"0.875rem 1rem", marginBottom:"1.75rem",
        border:"1px solid rgba(200,169,110,0.15)",
        borderRadius:"6px", background:"rgba(200,169,110,0.04)" }}>
        <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.4)", lineHeight:1.7 }}>
          Most tokenized assets still rely on off-chain trust: "we say it's verified."
          Abraxas creates cryptographic verification records tied to real custodians,
          certified appraisers, and provenance registries — enabling assets to function
          as independently auditable on-chain collateral. Users can verify who verified
          the asset, where it's held, and when it was last audited without trusting Abraxas.
        </div>
      </div>

      {/* Stages */}
      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
        {STAGES.map((stage, i) => {
          const isExpanded = expanded === i;
          const isLast = i === STAGES.length - 1;

          return (
            <div key={stage.n} style={{ position:"relative" }}>
              {/* Connector */}
              {!isLast && (
                <div style={{ position:"absolute", left:17, top:52,
                  bottom:-1, width:1, zIndex:0,
                  background:`linear-gradient(180deg,${stage.color}30,${STAGES[i+1].color}20)` }}/>
              )}

              {/* Stage row */}
              <div onClick={() => setExpanded(isExpanded ? null : i)}
                style={{ display:"flex", gap:"0.875rem", padding:"0.75rem 0",
                  cursor:"pointer", position:"relative", zIndex:1 }}>

                {/* Stage icon */}
                <div style={{ width:34, height:34, borderRadius:"50%", flexShrink:0,
                  background:`${stage.color}12`,
                  border:`1px solid ${stage.color}40`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  marginTop:2 }}>
                  <span style={{ fontSize:"0.88rem", color:stage.color, opacity:0.8 }}>
                    {stage.icon}
                  </span>
                </div>

                {/* Stage content */}
                <div style={{ flex:1, paddingTop:4 }}>
                  <div style={{ display:"flex", alignItems:"center",
                    justifyContent:"space-between", gap:"0.5rem", marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <span style={{ fontSize:"0.32rem", fontWeight:700,
                        color:`${stage.color}60`, letterSpacing:"0.15em" }}>
                        {stage.n}
                      </span>
                      <span style={{ fontWeight:800, fontSize:"0.68rem",
                        color:"#f0f0f0" }}>{stage.label}</span>
                    </div>
                    <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.2)",
                      flexShrink:0 }}>{isExpanded ? "−" : "+"}</span>
                  </div>
                  <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.35)",
                    lineHeight:1.6 }}>{stage.description}</div>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ marginLeft:46, marginBottom:"0.875rem",
                  display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.625rem" }}>

                  {/* Technical layer */}
                  <div style={{ padding:"0.75rem",
                    background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"6px" }}>
                    <div style={{ fontSize:"0.32rem", fontWeight:700,
                      color:`${stage.color}60`, textTransform:"uppercase",
                      letterSpacing:"0.15em", marginBottom:"0.375rem" }}>
                      Technical Implementation
                    </div>
                    <div style={{ fontSize:"0.44rem",
                      color:"rgba(255,255,255,0.45)", lineHeight:1.65 }}>
                      {stage.technical}
                    </div>
                  </div>

                  {/* Trust signal */}
                  <div style={{ padding:"0.75rem",
                    background:`${stage.color}06`,
                    border:`1px solid ${stage.color}20`,
                    borderRadius:"6px" }}>
                    <div style={{ fontSize:"0.32rem", fontWeight:700,
                      color:`${stage.color}70`, textTransform:"uppercase",
                      letterSpacing:"0.15em", marginBottom:"0.375rem" }}>
                      Why You Can Trust This
                    </div>
                    <div style={{ fontSize:"0.44rem",
                      color:"rgba(255,255,255,0.55)", lineHeight:1.65 }}>
                      {stage.trustSignal}
                    </div>
                  </div>

                  {/* Actors */}
                  <div style={{ padding:"0.75rem",
                    background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"6px" }}>
                    <div style={{ fontSize:"0.32rem", fontWeight:700,
                      color:"rgba(255,255,255,0.2)", textTransform:"uppercase",
                      letterSpacing:"0.15em", marginBottom:"0.375rem" }}>
                      Authorized Parties
                    </div>
                    {stage.actors.map((a,j) => (
                      <div key={j} style={{ display:"flex", gap:"0.35rem",
                        marginBottom:j<stage.actors.length-1?"0.2rem":0 }}>
                        <span style={{ fontSize:"0.38rem",
                          color:`${stage.color}50`, flexShrink:0 }}>·</span>
                        <span style={{ fontSize:"0.44rem",
                          color:"rgba(255,255,255,0.45)" }}>{a}</span>
                      </div>
                    ))}
                  </div>

                  {/* Outputs / events */}
                  <div style={{ padding:"0.75rem",
                    background:"rgba(255,255,255,0.02)",
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"6px" }}>
                    <div style={{ fontSize:"0.32rem", fontWeight:700,
                      color:"rgba(255,255,255,0.2)", textTransform:"uppercase",
                      letterSpacing:"0.15em", marginBottom:"0.375rem" }}>
                      Protocol Outputs
                    </div>
                    {stage.outputs.map((o,j) => (
                      <div key={j} style={{ display:"flex", gap:"0.35rem",
                        marginBottom:j<stage.outputs.length-1?"0.2rem":0 }}>
                        <span style={{ fontSize:"0.38rem",
                          color:"#14F195", flexShrink:0 }}>→</span>
                        <span style={{ fontSize:"0.44rem",
                          color:"rgba(255,255,255,0.45)" }}>{o}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}