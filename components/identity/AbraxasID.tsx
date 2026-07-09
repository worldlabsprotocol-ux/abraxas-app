// FILE: components/identity/AbraxasID.tsx
// Abraxas Unified Identity Credential. verify once, use everywhere.
// Issues a W3C Verifiable Credential (VC) as an on-chain attestation.
// Other protocols accept the Abraxas credential without re-KYC.
"use client";

import { useState } from "react";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const P    = "#8B5CF6";
const BDR  = "#1C2333";
const CARD = "#0D1117";
const W    = "#F8FAFC";
const R    = "#EF4444";

// The protocols that accept an Abraxas credential instead of requiring re-KYC
const PARTNER_PROTOCOLS = [
  { name: "Utila",          category: "FX / Off-ramp",     status: "coming",  flag: "🇨🇦" },
  { name: "Civic Pass",     category: "DeFi Access",       status: "planned",  flag: "🛡" },
  { name: "Polygon ID",     category: "Cross-chain",       status: "planned",  flag: "🔷" },
  { name: "Aftermath",        category: "Sui DeFi",          status: "planned",  flag: "◎" },
  { name: "Credix",         category: "RWA Credit",        status: "planned",  flag: "🏦" },
];

type VerificationStep = "identity" | "document" | "liveness" | "credential" | "done";

interface VerificationState {
  step:            VerificationStep;
  worldIdVerified: boolean;
  documentType:    string;
  legalName:       string;
  jurisdiction:    string;
  walletAddress:   string;
  credentialId?:   string;
  issuedAt?:       string;
}

const STEP_ORDER: VerificationStep[] = ["identity","document","liveness","credential","done"];
const STEP_LABELS: Record<VerificationStep, string> = {
  identity:   "World ID",
  document:   "Document",
  liveness:   "Liveness",
  credential: "Issue",
  done:       "Done",
};

export function AbraxasID({ walletAddress }: { walletAddress?: string }) {
  const [state, setState] = useState<VerificationState>({
    step:            "identity",
    worldIdVerified: false,
    documentType:    "passport",
    legalName:       "",
    jurisdiction:    "",
    walletAddress:   walletAddress ?? "",
  });
  const [busy, setBusy] = useState(false);

  const curIdx = STEP_ORDER.indexOf(state.step);

  async function advance() {
    setBusy(true);
    await new Promise(r => setTimeout(r, 800)); // simulate async
    const next = STEP_ORDER[curIdx + 1];
    if (!next) { setBusy(false); return; }
    if (next === "credential") {
      // Issue the credential. in production this calls your API
      // which creates a W3C VC and mints a soul-bound token
      const id = "ABRA-ID-" + Math.random().toString(36).slice(2,8).toUpperCase();
      setState(s => ({ ...s, step: next, credentialId: id, issuedAt: new Date().toISOString() }));
    } else if (next === "done") {
      setState(s => ({ ...s, step: next }));
    } else {
      setState(s => ({ ...s, step: next }));
    }
    setBusy(false);
  }

  const lbl: React.CSSProperties = {
    fontFamily:M, fontSize:"0.6rem", fontWeight:700, color:"rgba(255,255,255,0.35)",
    textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.25rem", display:"block",
  };
  const inp: React.CSSProperties = {
    width:"100%", padding:"0.5rem 0.625rem", borderRadius:4,
    border:`1px solid ${BDR}`, background:"rgba(255,255,255,0.03)",
    color:W, fontFamily:S, fontSize:"16px", outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{ fontFamily:M, color:W }}>
      {/* Header */}
      <div style={{ padding:"1rem 1.125rem", background:CARD,
                     border:`1px solid ${G}35`, borderRadius:"8px 8px 0 0",
                     borderBottom:`1px solid ${BDR}` }}>
        <div style={{ fontSize:"0.6rem", fontWeight:700, color:G,
                       letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:2 }}>
          ABRAXAS IDENTITY · VERIFY ONCE · USE EVERYWHERE
        </div>
        <div style={{ fontFamily:S, fontSize:"clamp(0.9rem,2vw,1.1rem)",
                       fontWeight:800, color:W, marginBottom:"0.375rem" }}>
          Universal Verification Credential
        </div>
        <p style={{ fontFamily:S, fontSize:"0.72rem",
                     color:"rgba(255,255,255,0.4)", lineHeight:1.65, margin:0 }}>
          Complete Abraxas identity verification once. Receive a W3C Verifiable Credential
          that partner protocols accept without requiring you to KYC again. no matter the
          platform or currency you are converting to.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ padding:"0.75rem 1.125rem", background:"#08090F",
                     borderBottom:`1px solid ${BDR}`,
                     display:"flex", gap:"0.375rem" }}>
        {STEP_ORDER.map((s, i) => {
          const done   = i < curIdx;
          const active = i === curIdx;
          return (
            <div key={s} style={{ flex:1 }}>
              <div style={{ height:2, borderRadius:1, marginBottom:3,
                             background: active ? G : done ? `${G}50` : BDR }}/>
              <span style={{ fontSize:"0.52rem", fontWeight:700,
                              color: active ? G : done ? `${G}70` : "rgba(255,255,255,0.2)",
                              textTransform:"uppercase", letterSpacing:"0.06em" }}>
                {done ? "✓ " : ""}{STEP_LABELS[s]}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ padding:"1rem 1.125rem", background:CARD,
                     border:`1px solid ${BDR}`, borderTop:"none",
                     borderRadius:"0 0 8px 8px" }}>

        {/* ── STEP: WORLD ID ── */}
        {state.step === "identity" && (
          <div>
            <div style={{ fontSize:"0.68rem", fontWeight:700, color:W, marginBottom:"0.375rem" }}>
              Step 1: Prove unique humanity
            </div>
            <p style={{ fontFamily:S, fontSize:"0.75rem",
                         color:"rgba(255,255,255,0.4)", lineHeight:1.65, margin:"0 0 1rem" }}>
              World ID provides zero-knowledge proof that you are a unique human.
              No personal data leaves your device.
            </p>
            <div style={{ padding:"0.875rem", borderRadius:6, background:`${G}07`,
                           border:`1px solid ${G}25`, marginBottom:"1rem",
                           display:"flex", alignItems:"center", gap:"0.875rem" }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#10B981" strokeWidth="1.5"/>
                <ellipse cx="12" cy="12" rx="4" ry="10" stroke="#10B981" strokeWidth="1.5"/>
                <path d="M2 12h20" stroke="#10B981" strokeWidth="1.5"/>
              </svg>
              <div>
                <div style={{ fontFamily:M, fontSize:"0.65rem", fontWeight:700, color:G }}>
                  World ID. Proof of Personhood
                </div>
                <div style={{ fontFamily:S, fontSize:"0.68rem",
                               color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                  Verify via World App or device biometrics
                </div>
              </div>
            </div>
            <button onClick={() => { setState(s=>({...s,worldIdVerified:true})); advance(); }}
              disabled={busy} style={{
                width:"100%", padding:"0.6rem", borderRadius:5, border:"none",
                background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
                fontWeight:900, cursor:"pointer",
              }}>
              {busy ? "VERIFYING…" : "VERIFY WITH WORLD ID →"}
            </button>
          </div>
        )}

        {/* ── STEP: DOCUMENT ── */}
        {state.step === "document" && (
          <div>
            <div style={{ fontSize:"0.68rem", fontWeight:700, color:W, marginBottom:"0.375rem" }}>
              Step 2: Identity document
            </div>
            <p style={{ fontFamily:S, fontSize:"0.75rem",
                         color:"rgba(255,255,255,0.4)", lineHeight:1.65, margin:"0 0 0.875rem" }}>
              Government-issued ID is required once. The credential issued after this step
              is accepted by all partner protocols so you never upload this again.
            </p>
            <div style={{ marginBottom:"0.625rem" }}>
              <label style={lbl}>Document Type</label>
              <select value={state.documentType} style={inp}
                onChange={e => setState(s=>({...s,documentType:e.target.value}))}>
                {["Passport","Driver License","State ID","Real ID","National ID"].map(d => (
                  <option key={d} value={d.toLowerCase().replace(" ","_")}>{d}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom:"0.625rem" }}>
              <label style={lbl}>Legal Name (as on document)</label>
              <input type="text" value={state.legalName} style={inp}
                onChange={e => setState(s=>({...s,legalName:e.target.value}))}
                placeholder="First Middle Last"/>
            </div>
            <div style={{ marginBottom:"0.875rem" }}>
              <label style={lbl}>Country / Jurisdiction</label>
              <input type="text" value={state.jurisdiction} style={inp}
                onChange={e => setState(s=>({...s,jurisdiction:e.target.value}))}
                placeholder="e.g. United States. California"/>
            </div>
            <div style={{ padding:"0.625rem 0.875rem", borderRadius:4, marginBottom:"0.875rem",
                           background:`${A}08`, border:`1px solid ${A}25`,
                           fontFamily:S, fontSize:"0.68rem",
                           color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
              🔒 Documents are verified then discarded. Only a cryptographic attestation is stored -
              not your document image. Abraxas is not a breach target.
            </div>
            <button onClick={advance} disabled={busy || !state.legalName || !state.jurisdiction}
              style={{ width:"100%", padding:"0.6rem", borderRadius:5, border:"none",
                        background: G, color:"#000", fontFamily:M, fontSize:"0.78rem",
                        fontWeight:900, cursor:"pointer" }}>
              {busy ? "VERIFYING…" : "SUBMIT DOCUMENT →"}
            </button>
          </div>
        )}

        {/* ── STEP: LIVENESS ── */}
        {state.step === "liveness" && (
          <div>
            <div style={{ fontSize:"0.68rem", fontWeight:700, color:W, marginBottom:"0.375rem" }}>
              Step 3: Liveness check
            </div>
            <p style={{ fontFamily:S, fontSize:"0.75rem",
                         color:"rgba(255,255,255,0.4)", lineHeight:1.65, margin:"0 0 1rem" }}>
              A brief selfie check confirms you are present and match your document.
              This is how Abraxas guarantees no synthetic identity can hold a credential.
            </p>
            <div style={{ padding:"2rem", borderRadius:6, textAlign:"center",
                           background:"rgba(255,255,255,0.02)",
                           border:`1px dashed ${BDR}`, marginBottom:"1rem" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>📷</div>
              <div style={{ fontFamily:S, fontSize:"0.78rem", color:W, fontWeight:700,
                             marginBottom:"0.25rem" }}>Camera access required</div>
              <div style={{ fontFamily:S, fontSize:"0.65rem",
                             color:"rgba(255,255,255,0.35)" }}>
                In production this integrates Veriff or Persona liveness SDK
              </div>
            </div>
            <button onClick={advance} disabled={busy} style={{
              width:"100%", padding:"0.6rem", borderRadius:5, border:"none",
              background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
              fontWeight:900, cursor:"pointer",
            }}>
              {busy ? "PROCESSING…" : "COMPLETE LIVENESS CHECK →"}
            </button>
          </div>
        )}

        {/* ── STEP: ISSUE CREDENTIAL ── */}
        {state.step === "credential" && (
          <div>
            <div style={{ fontSize:"0.68rem", fontWeight:700, color:G, marginBottom:"0.5rem" }}>
              Issuing your credential…
            </div>
            <div style={{ padding:"1rem", borderRadius:6, background:`${G}08`,
                           border:`1px solid ${G}30`, marginBottom:"1rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.58rem",
                             color:"rgba(255,255,255,0.3)", textTransform:"uppercase",
                             letterSpacing:"0.12em", marginBottom:"0.75rem" }}>
                W3C VERIFIABLE CREDENTIAL · ABRAXAS IDENTITY V1
              </div>
              {[
                ["Credential ID",  state.credentialId ?? "-"],
                ["Holder Name",    state.legalName || "-"],
                ["Jurisdiction",   state.jurisdiction || "-"],
                ["World ID",       "Verified ✓"],
                ["Document",       state.documentType.replace("_"," ").toUpperCase()],
                ["Issued",         state.issuedAt ? new Date(state.issuedAt).toLocaleDateString() : "-"],
                ["Standard",       "W3C VC Data Model v2.0"],
                ["Chain",          "Sui (Passport object)"],
              ].map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                       padding:"0.3rem 0",
                                       borderBottom:`1px solid ${BDR}40`, gap:"0.5rem" }}>
                  <span style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.3)" }}>{k}</span>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:W,
                                  textAlign:"right" }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={advance} disabled={busy} style={{
              width:"100%", padding:"0.6rem", borderRadius:5, border:"none",
              background:G, color:"#000", fontFamily:M, fontSize:"0.78rem",
              fontWeight:900, cursor:"pointer",
            }}>
              {busy ? "MINTING…" : "MINT CREDENTIAL ON SOLANA →"}
            </button>
          </div>
        )}

        {/* ── DONE ── */}
        {state.step === "done" && (
          <div>
            <div style={{ textAlign:"center", padding:"1rem 0 0.75rem" }}>
              <div style={{ fontSize:"2.5rem", color:G, marginBottom:"0.5rem" }}>✓</div>
              <div style={{ fontFamily:S, fontSize:"1rem", fontWeight:800, color:W,
                             marginBottom:"0.25rem" }}>Abraxas ID issued.</div>
              <div style={{ fontFamily:M, fontSize:"0.65rem", color:G,
                             marginBottom:"1rem" }}>{state.credentialId}</div>
            </div>

            <div style={{ marginBottom:"1rem" }}>
              <div style={{ fontFamily:M, fontSize:"0.6rem", color:"rgba(255,255,255,0.3)",
                             textTransform:"uppercase", letterSpacing:"0.1em",
                             marginBottom:"0.5rem" }}>
                PROTOCOLS ACCEPTING YOUR CREDENTIAL (no re-KYC required)
              </div>
              {PARTNER_PROTOCOLS.map(p => (
                <div key={p.name} style={{
                  padding:"0.5rem 0.75rem", borderRadius:5, marginBottom:"0.25rem",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                  background: p.status === "coming" ? `${G}08` : "rgba(255,255,255,0.02)",
                  border:`1px solid ${p.status === "coming" ? G+"30" : BDR}`,
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
                    <span style={{ fontSize:"1rem" }}>{p.flag}</span>
                    <div>
                      <div style={{ fontFamily:M, fontSize:"0.65rem", fontWeight:700, color:W }}>
                        {p.name}
                      </div>
                      <div style={{ fontFamily:S, fontSize:"0.6rem",
                                     color:"rgba(255,255,255,0.35)" }}>{p.category}</div>
                    </div>
                  </div>
                  <span style={{
                    fontFamily:M, fontSize:"0.55rem", fontWeight:700, borderRadius:3,
                    padding:"2px 7px", letterSpacing:"0.06em",
                    color:    p.status === "coming" ? G  : "rgba(255,255,255,0.25)",
                    background: p.status === "coming" ? `${G}15` : "rgba(255,255,255,0.04)",
                    border:`1px solid ${p.status === "coming" ? G+"30" : "rgba(255,255,255,0.08)"}`,
                  }}>
                    {p.status === "coming" ? "INTEGRATION ACTIVE" : "COMING SOON"}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ padding:"0.75rem", borderRadius:5, background:`${B}08`,
                           border:`1px solid ${B}25`,
                           fontFamily:S, fontSize:"0.7rem",
                           color:"rgba(255,255,255,0.45)", lineHeight:1.65 }}>
              Your Abraxas ID credential is anchored to your Sui Passport. It cannot be
              transferred, sold, or forged. Partner protocols verify it cryptographically
              in milliseconds. If regulations require re-verification, the credential auto-refreshes
              per W3C VC Refresh specification.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
