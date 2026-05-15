// FILE: components/IssuanceEngine.tsx
// MINIMAL 7-step mint flow. Zustand store only. No Supabase. No vault routing.
// Step: upload → metadata → valuation → wallet → fee → processing → queue
"use client";
"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAbraStore, type AssetClass } from "@/lib/abraxasStore";
import { useConnection }               from "@solana/wallet-adapter-react";
import { deductAbraForMint, simulateMintDeduction } from "@/lib/services/mintService";

type Step = "upload"|"metadata"|"valuation"|"wallet"|"fee"|"processing"|"queue";

const CLASSES: Record<AssetClass,{color:string;partner:string;ltv:number;fee:number;icon:string}> = {
  "Watches":        {color:"#6b8cff",partner:"Courtyard",       ltv:65,fee:150,icon:"◎"},
  "Spirits":        {color:"#FF8C00",partner:"Baxus",           ltv:55,fee:100,icon:"◈"},
  "Cards (PSA/BGS)":{color:"#FBBF24",partner:"Collector Crypt", ltv:55,fee:80, icon:"⬡"},
  "Comics (CGC)":   {color:"#a855f7",partner:"Metropolis",      ltv:65,fee:120,icon:"◫"},
  "Racehorses":     {color:"#22c55e",partner:"Jockey Club",     ltv:55,fee:200,icon:"◉"},
  "Metals":         {color:"#D4AF37",partner:"LBMA",            ltv:80,fee:60, icon:"◆"},
  "Art":            {color:"#f26b6b",partner:"Verified Custodian",ltv:50,fee:180,icon:"◭"},
  "Other":          {color:"#C8A96E",partner:"Manual Review",   ltv:45,fee:250,icon:"⬢"},
};

const S_STYLE = {
  input: {
    width:"100%", padding:"0.5rem 0.7rem", borderRadius:"7px", boxSizing:"border-box" as const,
    background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
    color:"#f0f0f0", fontSize:"0.58rem", fontFamily:"'JetBrains Mono',monospace", outline:"none",
  },
  label: {
    display:"block" as const, fontSize:"0.42rem", fontWeight:700 as const,
    color:"rgba(255,255,255,0.4)", marginBottom:"0.2rem",
    fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase" as const,
  },
  back: {
    padding:"0.7rem 1.1rem", borderRadius:"8px", border:"1px solid rgba(255,255,255,0.07)",
    background:"transparent", color:"rgba(255,255,255,0.3)", fontSize:"0.62rem",
    cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
  },
};

function StepDots({ step }: { step:Step }) {
  const STEPS:Step[] = ["upload","metadata","valuation","wallet","fee","processing","queue"];
  const idx = STEPS.indexOf(step);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, marginBottom:"1.5rem" }}>
      {STEPS.map((s,i) => {
        const done=i<idx, active=i===idx;
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", flex:i<STEPS.length-1?"1":"0" }}>
            <div style={{ width:16, height:16, borderRadius:"50%", flexShrink:0,
                          border:`2px solid ${done||active?"#14F195":"rgba(255,255,255,0.1)"}`,
                          background: done?"#14F195":"rgba(6,8,16,0.99)",
                          display:"flex", alignItems:"center", justifyContent:"center" }}>
              {done && <div style={{ width:5, height:5, borderRadius:"50%", background:"#000" }}/>}
            </div>
            {i<STEPS.length-1 && (
              <div style={{ flex:1, height:1,
                            background:done?"rgba(20,241,149,0.4)":"rgba(255,255,255,0.06)" }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function IssuanceEngine({ onSuccess }: { onSuccess?: () => void }) {
  const [mounted, setMounted]       = useState(false);
  const [step, setStep]             = useState<Step>("upload");
  const [assetClass, setAssetClass] = useState<AssetClass>("Watches");
  const [file, setFile]             = useState<File|null>(null);
  const [preview, setPreview]       = useState<string|undefined>(undefined);
  const [meta, setMeta]             = useState({ name:"", grade:"", year:"", description:"" });
  const [val, setVal]               = useState({ estimatedUsd:"" });
  const [mintedId, setMintedId]     = useState<string|null>(null);
  const [txSig, setTxSig]           = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { connection }   = useConnection();
  const walletCtx    = useWallet();
  const modalCtx     = useWalletModal();
  const connected    = mounted ? walletCtx.connected  : false;
  const publicKey    = mounted ? walletCtx.publicKey  : null;
  const setVisible   = mounted ? modalCtx.setVisible  : () => {};
  const abraBalance  = useAbraStore(s => s.abraBalance);
  const mintAsset    = useAbraStore(s => s.mintAsset);

  useEffect(() => { setMounted(true); }, []);

  const cfg      = CLASSES[assetClass];
  const fee      = cfg.fee + 10;
  const estUsd   = parseFloat(val.estimatedUsd) || 0;
  const borrowMax= Math.round(estUsd * cfg.ltv / 100);
  const canAfford= abraBalance >= fee;

  function handleFile(f: File) {
    setFile(f);
    const r = new FileReader();
    r.onload = e => setPreview(e.target?.result as string);
    r.readAsDataURL(f);
  }

  async function executeMint() {
    setStep("processing");
    const wallet = publicKey?.toBase58() ?? "demo-wallet";

    // Real on-chain ABRA deduction if wallet supports signing
    let deductResult;
    if (connected && publicKey && walletCtx.signTransaction) {
      deductResult = await deductAbraForMint({
        connection,
        userWallet: publicKey,
        amountAbra: fee,
        signAndSendTransaction: async (tx) => {
          const signed = await walletCtx.signTransaction!(tx);
          return connection.sendRawTransaction(signed.serialize());
        },
      });
    } else {
      deductResult = simulateMintDeduction(fee); // demo / devnet
    }

    if (!deductResult.success) {
      setStep("fee");
      alert(deductResult.error ?? "ABRA deduction failed.");
      return;
    }

    const result = mintAsset({
      name:          meta.name || "Unnamed Asset",
      description:   meta.description || "",
      assetClass,
      mintCostAbra:  fee,
      imagePreview:  preview,
      estimatedUsd:  estUsd,
      ltv:           cfg.ltv,
      custodyPartner:cfg.partner,
      grade:         meta.grade || undefined,
      year:          meta.year  || undefined,
    }, wallet);

    if (!result) { setStep("fee"); return; }
    setMintedId(result.id);
    setTxSig(deductResult.txSignature ?? result.txSignature);
    setStep("queue");
  }

  const W = { padding:"1.25rem", maxWidth:560 };

  // ── UPLOAD ─────────────────────────────────────────────────────────────────
  if (step==="upload") return (
    <div style={W}>
      <StepDots step="upload"/>
      <p style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)", fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase", margin:"0 0 0.25rem", letterSpacing:"0.18em" }}>
        Step 1 · Upload Asset
      </p>
      <h2 style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0", margin:"0 0 1rem" }}>
        Submit Your Asset
      </h2>
      {/* Class picker */}
      <div style={{ marginBottom:"1rem" }}>
        <div style={S_STYLE.label}>Asset Class</div>
        <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap" }}>
          {(Object.keys(CLASSES) as AssetClass[]).map(a => (
            <button key={a} onClick={() => setAssetClass(a)} style={{
              padding:"0.35rem 0.7rem", borderRadius:"6px", cursor:"pointer",
              border:`1px solid ${assetClass===a?CLASSES[a].color+"60":"rgba(255,255,255,0.08)"}`,
              background: assetClass===a?`${CLASSES[a].color}12`:"rgba(255,255,255,0.02)",
              color: assetClass===a?CLASSES[a].color:"rgba(255,255,255,0.4)",
              fontSize:"0.54rem", fontWeight:assetClass===a?700:400,
              fontFamily:"'JetBrains Mono',monospace",
            }}>{a}</button>
          ))}
        </div>
      </div>
      {/* Drop zone */}
      <div onClick={() => fileRef.current?.click()} style={{
        border:`2px dashed ${cfg.color}30`, borderRadius:"12px", padding:"2rem",
        textAlign:"center", cursor:"pointer", background:`${cfg.color}04`, marginBottom:"1rem",
      }}>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
               onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }}/>
        {preview
          ? <img src={preview} alt="" style={{ maxHeight:160, maxWidth:"100%", borderRadius:6 }}/>
          : <><div style={{ fontSize:"2rem", color:`${cfg.color}60`, marginBottom:"0.5rem" }}>{cfg.icon}</div>
             <div style={{ fontSize:"0.6rem", color:"rgba(255,255,255,0.5)" }}>Click or drop image</div>
             <div style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.25)", marginTop:"0.2rem" }}>JPG, PNG · Max 25MB</div></>}
      </div>
      <button onClick={() => setStep("metadata")} disabled={!file} style={{
        width:"100%", padding:"0.85rem", borderRadius:"10px", border:"none", cursor:file?"pointer":"not-allowed",
        fontWeight:900, fontSize:"0.72rem", fontFamily:"'JetBrains Mono',monospace",
        background: file?"linear-gradient(135deg,#14F195,#C8A96E)":"rgba(255,255,255,0.04)",
        color: file?"#000":"rgba(255,255,255,0.2)",
      }}>{file?"Continue →":"Upload image to continue"}</button>
    </div>
  );

  // ── METADATA ───────────────────────────────────────────────────────────────
  if (step==="metadata") {
    const ok = !!(meta.name && meta.grade);
    return (
      <div style={W}>
        <StepDots step="metadata"/>
        <p style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)", fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase", margin:"0 0 0.25rem", letterSpacing:"0.18em" }}>Step 2 · Metadata</p>
        <h2 style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0", margin:"0 0 1rem" }}>Define Your Asset</h2>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem", marginBottom:"0.875rem" }}>
          {([["name","Asset Name *",""],["grade","Grade / Cert *","PSA 10, CGC 9.8…"],
             ["year","Year","1999"],["description","Notes","Provenance…"]] as const).map(([k,label,ph]) => (
            <div key={k} style={{ gridColumn:k==="description"?"1/-1":"auto" }}>
              <label style={S_STYLE.label}>{label}</label>
              <input value={(meta as any)[k]} placeholder={ph}
                     onChange={e => setMeta(m => ({...m,[k]:e.target.value}))}
                     style={S_STYLE.input}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button onClick={() => setStep("upload")} style={S_STYLE.back}>← Back</button>
          <button onClick={() => setStep("valuation")} disabled={!ok} style={{
            flex:1, padding:"0.7rem", borderRadius:"8px", border:"none", cursor:ok?"pointer":"not-allowed",
            fontWeight:900, fontSize:"0.68rem", fontFamily:"'JetBrains Mono',monospace",
            background:ok?`linear-gradient(135deg,${cfg.color},#14F195)`:"rgba(255,255,255,0.04)",
            color:ok?"#000":"rgba(255,255,255,0.2)",
          }}>Continue →</button>
        </div>
      </div>
    );
  }

  // ── VALUATION ──────────────────────────────────────────────────────────────
  if (step==="valuation") {
    const ok = estUsd > 0;
    return (
      <div style={W}>
        <StepDots step="valuation"/>
        <p style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)", fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase", margin:"0 0 0.25rem", letterSpacing:"0.18em" }}>Step 3 · Valuation</p>
        <h2 style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0", margin:"0 0 1rem" }}>Set Your Valuation</h2>
        <div style={{ marginBottom:"0.875rem" }}>
          <label style={S_STYLE.label}>Estimated Market Value (USD) *</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:"0.7rem", top:"50%", transform:"translateY(-50%)",
                           color:"rgba(255,255,255,0.4)", fontSize:"0.62rem" }}>$</span>
            <input type="number" value={val.estimatedUsd} placeholder="0"
                   onChange={e => setVal(v => ({...v,estimatedUsd:e.target.value}))}
                   style={{ ...S_STYLE.input, paddingLeft:"1.4rem", fontSize:"0.8rem", fontWeight:700 }}/>
          </div>
        </div>
        {ok && (
          <div style={{ padding:"0.75rem 1rem", background:"rgba(20,241,149,0.05)",
                        border:"1px solid rgba(20,241,149,0.15)", borderRadius:"9px",
                        display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem", marginBottom:"0.875rem" }}>
            {([["Asset Value",`$${estUsd.toLocaleString()}`,"rgba(255,255,255,0.7)"],
               ["Borrow Up To",`$${borrowMax.toLocaleString()} USDC`,"#14F195"],
               ["LTV Cap",`${cfg.ltv}%`,"#6b8cff"]] as [string,string,string][]).map(([l,v,c]) => (
              <div key={l} style={{ textAlign:"center" }}>
                <div style={{ fontSize:"0.75rem", fontWeight:900, color:c,
                              fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.3)", marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <button onClick={() => setStep("metadata")} style={S_STYLE.back}>← Back</button>
          <button onClick={() => setStep("wallet")} disabled={!ok} style={{
            flex:1, padding:"0.7rem", borderRadius:"8px", border:"none", cursor:ok?"pointer":"not-allowed",
            fontWeight:900, fontSize:"0.68rem", fontFamily:"'JetBrains Mono',monospace",
            background:ok?`linear-gradient(135deg,${cfg.color},#14F195)`:"rgba(255,255,255,0.04)",
            color:ok?"#000":"rgba(255,255,255,0.2)",
          }}>Continue →</button>
        </div>
      </div>
    );
  }

  // ── WALLET ─────────────────────────────────────────────────────────────────
  if (step==="wallet") return (
    <div style={W}>
      <StepDots step="wallet"/>
      <p style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)", fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase", margin:"0 0 0.25rem", letterSpacing:"0.18em" }}>Step 4 · Wallet</p>
      <h2 style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0", margin:"0 0 1rem" }}>Connect Wallet</h2>
      {connected ? (
        <>
          <div style={{ padding:"0.75rem 1rem", background:"rgba(20,241,149,0.06)",
                        border:"1px solid rgba(20,241,149,0.2)", borderRadius:"9px", marginBottom:"1rem" }}>
            <div style={{ fontSize:"0.42rem", color:"rgba(20,241,149,0.6)",
                          fontFamily:"'JetBrains Mono',monospace", marginBottom:2 }}>Connected</div>
            <div style={{ fontSize:"0.66rem", fontWeight:700, color:"#14F195",
                          fontFamily:"'JetBrains Mono',monospace" }}>
              {publicKey?.toBase58().slice(0,6)}…{publicKey?.toBase58().slice(-4)}
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.5rem" }}>
            <button onClick={() => setStep("valuation")} style={S_STYLE.back}>← Back</button>
            <button onClick={() => setStep("fee")} style={{
              flex:1, padding:"0.7rem", borderRadius:"8px", border:"none", cursor:"pointer",
              fontWeight:900, fontSize:"0.68rem", fontFamily:"'JetBrains Mono',monospace",
              background:"linear-gradient(135deg,#14F195,#C8A96E)", color:"#000",
            }}>Review Mint Fee →</button>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.4)", margin:"0 0 1rem", lineHeight:1.7 }}>
            Connect your Solana wallet to authorize the mint. Your wallet becomes the owner of the tokenized asset.
          </p>
          <button onClick={() => setVisible(true)} style={{
            width:"100%", padding:"0.875rem", borderRadius:"10px", border:"none", cursor:"pointer",
            fontWeight:900, fontSize:"0.72rem", fontFamily:"'JetBrains Mono',monospace",
            background:"linear-gradient(135deg,#9945FF,#14F195)", color:"#fff",
            marginBottom:"0.5rem",
          }}>Connect Wallet</button>
          <button onClick={() => setStep("valuation")} style={{ ...S_STYLE.back, width:"100%" }}>← Back</button>
        </>
      )}
    </div>
  );

  // ── FEE ────────────────────────────────────────────────────────────────────
  if (step==="fee") return (
    <div style={W}>
      <StepDots step="fee"/>
      <p style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)", fontFamily:"'JetBrains Mono',monospace",
                  textTransform:"uppercase", margin:"0 0 0.25rem", letterSpacing:"0.18em" }}>Step 5 · Mint Fee</p>
      <h2 style={{ fontWeight:900, fontSize:"1.2rem", color:"#f0f0f0", margin:"0 0 1rem" }}>Confirm Fee</h2>
      {/* Balance */}
      <div style={{ padding:"0.5rem 0.875rem", background:canAfford?"rgba(20,241,149,0.05)":"rgba(242,107,107,0.05)",
                    border:`1px solid ${canAfford?"rgba(20,241,149,0.2)":"rgba(242,107,107,0.25)"}`,
                    borderRadius:"8px", marginBottom:"0.875rem",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.4)" }}>Your $ABRA balance</span>
        <span style={{ fontSize:"0.72rem", fontWeight:800, color:canAfford?"#14F195":"#f26b6b",
                       fontFamily:"'JetBrains Mono',monospace" }}>{abraBalance.toLocaleString()} $ABRA</span>
      </div>
      {/* Breakdown */}
      <div style={{ background:"rgba(6,8,16,0.99)", border:"1px solid rgba(255,255,255,0.08)",
                    borderRadius:"10px", overflow:"hidden", marginBottom:"1rem" }}>
        {([
          [`${assetClass} Issuance`, `${cfg.fee} $ABRA`, "#C8A96E"],
          ["Verification Queue",     "10 $ABRA",         "rgba(255,255,255,0.5)"],
          ["Solana Network Fee",     "~0.000005 SOL",    "rgba(255,255,255,0.5)"],
        ] as [string,string,string][]).map(([l,v,c],i) => (
          <div key={l} style={{ display:"flex", justifyContent:"space-between",
                                padding:"0.6rem 0.875rem",
                                borderBottom:i<2?"1px solid rgba(255,255,255,0.04)":"none" }}>
            <span style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.45)" }}>{l}</span>
            <span style={{ fontSize:"0.56rem", fontWeight:700, color:c,
                           fontFamily:"'JetBrains Mono',monospace" }}>{v}</span>
          </div>
        ))}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"0.65rem 0.875rem",
                      background:"rgba(200,169,110,0.05)", borderTop:"1px solid rgba(200,169,110,0.1)" }}>
          <span style={{ fontSize:"0.62rem", fontWeight:700, color:"rgba(255,255,255,0.7)" }}>Total</span>
          <span style={{ fontSize:"0.7rem", fontWeight:900, color:"#C8A96E",
                         fontFamily:"'JetBrains Mono',monospace" }}>{fee} $ABRA</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <button onClick={() => setStep("wallet")} style={S_STYLE.back}>← Back</button>
        <button onClick={executeMint} disabled={!canAfford} style={{
          flex:1, padding:"0.875rem", borderRadius:"10px", border:"none",
          cursor:canAfford?"pointer":"not-allowed",
          fontWeight:900, fontSize:"0.72rem", fontFamily:"'JetBrains Mono',monospace",
          background:canAfford?"linear-gradient(135deg,#C8A96E,#FBBF24)":"rgba(255,255,255,0.05)",
          color:canAfford?"#000":"rgba(255,255,255,0.2)",
        }}>{canAfford?`Confirm — Deduct ${fee} $ABRA →`:`Need ${fee-abraBalance} more $ABRA`}</button>
      </div>
    </div>
  );

  // ── PROCESSING ─────────────────────────────────────────────────────────────
  if (step==="processing") return (
    <div style={{ ...W, minHeight:"60vh", display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", textAlign:"center" }}>
      <div style={{ width:52, height:52, borderRadius:"50%", marginBottom:"1.25rem",
                    border:"3px solid rgba(200,169,110,0.15)", borderTopColor:"#C8A96E",
                    animation:"spin 0.9s linear infinite" }}/>
      <h3 style={{ fontWeight:900, fontSize:"1.1rem", color:"#f0f0f0", margin:"0 0 0.4rem" }}>
        Minting on Solana
      </h3>
      <p style={{ fontSize:"0.56rem", color:"rgba(255,255,255,0.38)", maxWidth:300, lineHeight:1.7, margin:0 }}>
        Creating Token-2022 position · Anchoring metadata · Notifying {cfg.partner}
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── QUEUE / SUCCESS ─────────────────────────────────────────────────────────
  if (step==="queue") return (
    <div style={W}>
      <StepDots step="queue"/>
      <div style={{ padding:"1rem", background:"rgba(20,241,149,0.06)",
                    border:"1px solid rgba(20,241,149,0.25)", borderRadius:"12px", marginBottom:"1.25rem" }}>
        <div style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.6)",
                      fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase",
                      marginBottom:"0.4rem" }}>✓ Token-2022 Minted</div>
        {preview && (
          <img src={preview} alt="" style={{ width:64, height:64, objectFit:"contain",
                                             borderRadius:8, marginBottom:"0.5rem",
                                             border:"1px solid rgba(20,241,149,0.2)" }}/>
        )}
        <div style={{ fontWeight:800, fontSize:"0.78rem", color:"#f0f0f0",
                      marginBottom:"0.25rem" }}>{meta.name}</div>
        <div style={{ fontSize:"0.44rem", color:"rgba(255,255,255,0.35)",
                      fontFamily:"'JetBrains Mono',monospace", wordBreak:"break-all" }}>
          Tx: {txSig.slice(0,20)}…
        </div>
      </div>
      {estUsd>0 && (
        <div style={{ padding:"0.75rem 1rem", background:"rgba(107,140,255,0.07)",
                      border:"1px solid rgba(107,140,255,0.2)", borderRadius:"10px", marginBottom:"1rem" }}>
          <div style={{ fontSize:"0.44rem", fontWeight:700, color:"rgba(107,140,255,0.7)",
                        fontFamily:"'JetBrains Mono',monospace", textTransform:"uppercase",
                        marginBottom:"0.35rem" }}>Loopscale Lending — Unlocks After Verification</div>
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            {([["Borrow Up To",`$${borrowMax.toLocaleString()} USDC`,"#14F195"],
               ["Fixed APR","5.2%","#14F195"],
               ["LTV",`${cfg.ltv}%`,"#6b8cff"]] as [string,string,string][]).map(([l,v,c]) => (
              <div key={l}>
                <div style={{ fontSize:"0.68rem", fontWeight:900, color:c,
                              fontFamily:"'JetBrains Mono',monospace", lineHeight:1 }}>{v}</div>
                <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.3)", marginTop:1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.4)", marginBottom:"1.25rem", lineHeight:1.7 }}>
        Asset is pending verification by {cfg.partner}. Once verified it will appear as listed in Markets.
      </div>
      <div style={{ display:"flex", gap:"0.5rem" }}>
        <button onClick={() => { setStep("upload"); setFile(null); setPreview(undefined);
                                 setMeta({name:"",grade:"",year:"",description:""});
                                 setVal({estimatedUsd:""}); setMintedId(null); setTxSig(""); }}
                style={{ ...S_STYLE.back, flex:1 }}>Mint Another Asset</button>
        <button onClick={onSuccess} style={{
          flex:1, padding:"0.7rem", borderRadius:"8px", border:"none", cursor:"pointer",
          fontWeight:900, fontSize:"0.66rem", fontFamily:"'JetBrains Mono',monospace",
          background:"linear-gradient(135deg,#14F195,#6b8cff)", color:"#000",
        }}>View in Markets →</button>
      </div>
    </div>
  );

  return null;
}