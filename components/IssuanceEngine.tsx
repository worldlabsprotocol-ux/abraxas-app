"use client";
import React, { useState, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { useWallet }           from "@solana/wallet-adapter-react";
import { useWalletModal }      from "@solana/wallet-adapter-react-ui";
import { useConnection }       from "@solana/wallet-adapter-react";
import { useAbraStore }        from "@/lib/abraxasStore";
import type { AssetClass }     from "@/lib/abraxasStore";
import { useAbraBalance }      from "@/lib/hooks/useAbraBalance";
import { deductAbraForMint, simulateMintDeduction } from "@/lib/services/mintService";
import { TokenizationProgress } from "@/components/TokenizationProgress";

// ─── Asset class definitions ──────────────────────────────────────────────────
const CLASSES = {
  "Watches":            { fee:150, ltv:65, color:"#6b8cff",  icon:"◎", cat:"Collectible",    partner:"Certified Custody Network",           desc:"Luxury and vintage timepieces with verifiable provenance." },
  "Spirits":            { fee:120, ltv:55, color:"#FF8C00",  icon:"◈", cat:"Collectible",    partner:"Certified Custody Network",           desc:"Rare whisky, cognac, rum, and wine with authentication records." },
  "Cards (PSA/BGS)":   { fee:110, ltv:55, color:"#FBBF24",  icon:"⬡", cat:"Collectible",    partner:"Certified Custody Network",           desc:"Professionally graded trading cards from PSA or BGS." },
  "Metals":             { fee:200, ltv:80, color:"#D4AF37",  icon:"◆", cat:"Commodity",      partner:"Certified Custody Network",           desc:"LBMA-standard gold, silver, and platinum bullion." },
  "Art":                { fee:180, ltv:50, color:"#f26b6b",  icon:"◭", cat:"Fine Art",       partner:"Certified Custody Network",           desc:"Fine art and authenticated prints with provenance." },
  "Property":           { fee:300, ltv:60, color:"#14F195",  icon:"⬛", cat:"Real Estate",    partner:"Title & Deed Verification Network",  desc:"Residential or commercial property with clear title." },
  "Short-Term Rental":  { fee:250, ltv:55, color:"#14F195",  icon:"⊞", cat:"Real Estate",    partner:"Title & Deed Verification Network",  desc:"Airbnb or VRBO rental property. Unlock DeFi capital." },
  "Mineral Rights":     { fee:500, ltv:55, color:"#C8A96E",  icon:"◈", cat:"Energy",         partner:"Energy Verification Network",         desc:"Non-op working interest or mineral rights with clean title." },
  "Racehorses":         { fee:250, ltv:55, color:"#22c55e",  icon:"◉", cat:"Animal Asset",   partner:"Certified Custody Network",           desc:"Thoroughbred horses with registry documentation." },
  "Other":              { fee:100, ltv:45, color:"#a855f7",  icon:"⬢", cat:"General",        partner:"Certified Custody Network",           desc:"Any real-world asset with documented ownership and value." },
} as const;

type AssetClassKey = keyof typeof CLASSES;
type Step = "upload" | "metadata" | "valuation" | "wallet" | "fee" | "processing" | "queue";

// ─── Supabase sync (non-blocking) ────────────────────────────────────────────
async function syncToSupabase(data: Record<string, unknown>): Promise<void> {
  try {
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    console.warn("Supabase sync failed — asset saved locally");
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
function IssuanceEngine({ onSuccess }: { onSuccess?: () => void }) {
  const [step,        setStep]       = useState<Step>("upload");
  const [cls,         setCls]        = useState<AssetClassKey>("Watches");
  const [preview,     setPreview]    = useState<string | undefined>();
  const [name,        setName]       = useState("");
  const [desc,        setDesc]       = useState("");
  const [grade,       setGrade]      = useState("");
  const [year,        setYear]       = useState("");
  const [estUsd,      setEstUsd]     = useState(0);
  const [txSig,       setTxSig]      = useState("");
  const [minted,      setMinted]     = useState<{ name: string; assetClass: string; tokenId: string } | null>(null);
  const [errorMsg,    setErrorMsg]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { connection }                         = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const { setVisible }                         = useWalletModal();
  const { balance: realBalance }               = useAbraBalance();
  const abraBalance  = useAbraStore(s => s.abraBalance);
  const mintAsset    = useAbraStore(s => s.mintAsset);

  const cfg        = CLASSES[cls];
  const fee        = cfg.fee;
  const balance    = connected ? realBalance : abraBalance;
  const canAfford  = balance >= fee;

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const MONO = "'JetBrains Mono',monospace";
  const STEPS: Step[] = ["upload","metadata","valuation","wallet","fee","processing","queue"];
  const stepN = STEPS.indexOf(step) + 1;
  const pct   = Math.round((stepN / 7) * 100);

  function L(extra?: CSSProperties): CSSProperties {
    return { fontSize:"0.38rem", fontWeight:700, color:"rgba(255,255,255,0.3)",
      fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.12em",
      marginBottom:"0.35rem", ...extra };
  }
  function I(extra?: CSSProperties): CSSProperties {
    return { width:"100%", padding:"0.625rem 0.75rem", borderRadius:"6px",
      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
      color:"#f0f0f0", fontSize:"0.6rem", outline:"none", fontFamily:MONO,
      boxSizing:"border-box", ...extra };
  }
  function Btn(active: boolean): CSSProperties {
    return { width:"100%", padding:"0.875rem", borderRadius:"7px", border:"none",
      cursor: active ? "pointer" : "not-allowed", fontWeight:800,
      fontSize:"0.66rem", fontFamily:MONO, letterSpacing:"0.04em",
      background: active ? "#7c3aed" : "rgba(255,255,255,0.05)",
      color: active ? "#fff" : "rgba(255,255,255,0.2)", transition:"all 0.15s" };
  }

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = ev => setPreview(ev.target?.result as string);
    r.readAsDataURL(file);
  }, []);

  // ─── Mint ──────────────────────────────────────────────────────────────────
  async function executeMint() {
    setStep("processing");
    setErrorMsg("");
    const wallet = publicKey?.toBase58() ?? "demo-wallet";

    let result: { success: boolean; txSignature?: string | null; error?: string | null };

    if (connected && publicKey && signTransaction) {
      result = await deductAbraForMint({
        connection,
        userWallet: publicKey,
        amountAbra: fee,
        signAndSendTransaction: async (tx) => {
          const signed = await signTransaction(tx);
          return connection.sendRawTransaction(signed.serialize());
        },
      });
    } else {
      result = simulateMintDeduction(fee);
    }

    if (!result.success) {
      setErrorMsg(result.error ?? "Transaction failed.");
      setStep("fee");
      return;
    }

    const assetResult = mintAsset({
      name:           name || "Unnamed Asset",
      description:    desc || cfg.desc,
      assetClass:     cls as AssetClass,
      mintCostAbra:   fee,
      imagePreview:   preview,
      estimatedUsd:   estUsd,
      ltv:            cfg.ltv,
      custodyPartner: cfg.partner,
      grade:          grade || undefined,
      year:           year  || undefined,
    }, wallet);

    if (!assetResult) {
      setStep("fee");
      return;
    }

    const finalTx = result.txSignature ?? assetResult.txSignature ?? "";
    setTxSig(finalTx);
    setMinted({ name: assetResult.name, assetClass: assetResult.assetClass, tokenId: assetResult.tokenId });

    syncToSupabase({
      name:         assetResult.name,
      assetClass:   assetResult.assetClass,
      estimatedUsd: estUsd,
      mintCostAbra: fee,
      txSignature:  finalTx,
      ownerWallet:  wallet,
      ltv:          cfg.ltv,
    });

    setStep("queue");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:560, margin:"0 auto" }}>

      {/* Progress bar */}
      {step !== "queue" && (
        <div style={{ marginBottom:"1.25rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.3rem" }}>
            <span style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.25)", fontFamily:MONO,
              textTransform:"uppercase", letterSpacing:"0.12em" }}>
              Step {stepN} of 7
            </span>
            <span style={{ fontSize:"0.38rem", fontWeight:700, color:"#C8A96E", fontFamily:MONO }}>
              {pct}%
            </span>
          </div>
          <div style={{ height:2, background:"rgba(255,255,255,0.07)", borderRadius:1 }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg,#7c3aed,#C8A96E)",
              borderRadius:1, width:`${pct}%`, transition:"width 0.4s ease" }} />
          </div>
        </div>
      )}

      {/* ── STEP 1: ASSET CLASS ── */}
      {step === "upload" && (
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1rem", color:"#f0f0f0", margin:"0 0 0.25rem" }}>
            Select Asset Class
          </h2>
          <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:"0 0 1.25rem", lineHeight:1.6 }}>
            Choose the category that best describes your asset.
          </p>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:"0.5rem", marginBottom:"1.25rem" }}>
            {(Object.entries(CLASSES) as [AssetClassKey, typeof CLASSES[AssetClassKey]][]).map(([n, c]) => {
              const active = cls === n;
              return (
                <button key={n} onClick={() => setCls(n)} style={{
                  padding:"0.875rem 0.625rem", borderRadius:"7px", cursor:"pointer", textAlign:"left",
                  border:`1px solid ${active ? c.color : c.color + "22"}`,
                  background: active ? `${c.color}15` : `${c.color}06`,
                  transition:"all 0.15s",
                }}>
                  <div style={{ fontSize:"1rem", color:c.color, opacity:0.7, marginBottom:"0.25rem", lineHeight:1 }}>
                    {c.icon}
                  </div>
                  <div style={{ fontWeight:800, fontSize:"0.6rem", color:"#f0f0f0", marginBottom:2 }}>{n}</div>
                  <div style={{ fontSize:"0.38rem", color:"rgba(255,255,255,0.25)", fontFamily:MONO }}>
                    {c.ltv}% LTV · {c.fee} ABRA
                  </div>
                  {(n === "Property" || n === "Short-Term Rental") && (
                    <div style={{ marginTop:4, padding:"1px 5px", borderRadius:3,
                      background:`${c.color}15`, border:`1px solid ${c.color}30`,
                      display:"inline-block" }}>
                      <span style={{ fontSize:"0.3rem", fontWeight:700, color:c.color,
                        fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        Real Estate
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ padding:"0.875rem", background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.06)", borderRadius:"7px", marginBottom:"1.25rem" }}>
            <div style={{ fontSize:"0.36rem", fontWeight:700, color:`${cfg.color}80`,
              fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.3rem" }}>
              {cls} · {cfg.cat}
            </div>
            <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.4)", lineHeight:1.65 }}>
              {cfg.desc}
            </div>
          </div>

          {/* Image upload */}
          <div style={{ marginBottom:"1.25rem" }}>
            <div style={L()}>Asset Photo (optional)</div>
            <div onClick={() => fileRef.current?.click()} style={{
              height:120, borderRadius:"7px", cursor:"pointer",
              border:`2px dashed ${preview ? "rgba(20,241,149,0.3)" : "rgba(255,255,255,0.1)"}`,
              background: preview ? "rgba(20,241,149,0.04)" : "rgba(255,255,255,0.02)",
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", overflow:"hidden", transition:"all 0.15s",
            }}>
              {preview ? (
                <img src={preview} alt="preview" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
              ) : (
                <>
                  <div style={{ fontSize:"1.5rem", opacity:0.2, marginBottom:"0.35rem" }}>↑</div>
                  <div style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.25)" }}>Click to upload image</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display:"none" }} />
          </div>

          <button onClick={() => setStep("metadata")} style={Btn(true)}>
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2: METADATA ── */}
      {step === "metadata" && (
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1rem", color:"#f0f0f0", margin:"0 0 0.25rem" }}>
            Asset Details
          </h2>
          <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:"0 0 1.25rem", lineHeight:1.6 }}>
            Metadata is hashed and anchored on Sui — immutable after submission.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:"0.875rem", marginBottom:"1.25rem" }}>
            <div>
              <div style={L()}>Asset Name *</div>
              <input value={name}
                onChange={e => setName(e.target.value)}
                placeholder={cls === "Property" ? "123 Main Street, Austin TX" : "e.g. Rolex Submariner Ref 5513 1966"}
                style={I()} />
            </div>
            <div>
              <div style={L()}>Description</div>
              <textarea value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Condition, serial numbers, notable features..."
                style={{ ...I(), minHeight:80, resize:"vertical" } as CSSProperties} />
            </div>

            {(cls === "Property" || cls === "Short-Term Rental") && (
              <div style={{ padding:"0.875rem", background:"rgba(20,241,149,0.04)",
                border:"1px solid rgba(20,241,149,0.12)", borderRadius:"7px" }}>
                <div style={{ fontSize:"0.38rem", fontWeight:700, color:"rgba(20,241,149,0.5)",
                  fontFamily:MONO, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"0.5rem" }}>
                  Real Estate Documents Required
                </div>
                {["Title deed or ownership certificate",
                  "Recent property appraisal (within 12 months)",
                  "Property photo documentation",
                  "Rental income records (if applicable)"
                ].map((doc, i) => (
                  <div key={i} style={{ display:"flex", gap:"0.4rem", marginBottom: i < 3 ? "0.3rem" : 0 }}>
                    <span style={{ fontSize:"0.44rem", color:"rgba(20,241,149,0.5)",
                      fontFamily:MONO, flexShrink:0 }}>
                      {String(i+1).padStart(2,"0")}
                    </span>
                    <span style={{ fontSize:"0.46rem", color:"rgba(255,255,255,0.35)" }}>{doc}</span>
                  </div>
                ))}
              </div>
            )}

            {(cls === "Watches" || cls === "Spirits" || cls === "Cards (PSA/BGS)") && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.625rem" }}>
                <div>
                  <div style={L()}>Grade / Certification</div>
                  <input value={grade} onChange={e => setGrade(e.target.value)}
                    placeholder="PSA 10 / CGC 9.8" style={I()} />
                </div>
                <div>
                  <div style={L()}>Year / Vintage</div>
                  <input value={year} onChange={e => setYear(e.target.value)}
                    placeholder="1986" style={I()} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            <button onClick={() => setStep("upload")} style={{
              padding:"0.75rem", borderRadius:"7px", border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer", fontWeight:700, fontSize:"0.58rem", fontFamily:MONO,
              background:"transparent", color:"rgba(255,255,255,0.4)" }}>
              Back
            </button>
            <button onClick={() => setStep("valuation")} disabled={!name.trim()} style={Btn(!!name.trim())}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: VALUATION ── */}
      {step === "valuation" && (
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1rem", color:"#f0f0f0", margin:"0 0 0.25rem" }}>
            Declared Value
          </h2>
          <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:"0 0 1.25rem", lineHeight:1.6 }}>
            Enter the declared USD value. This determines your borrowing power once verified.
          </p>

          <div style={{ marginBottom:"1.25rem" }}>
            <div style={L()}>Estimated Value (USD)</div>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:"0.75rem", top:"50%",
                transform:"translateY(-50%)", fontSize:"0.6rem", color:"rgba(255,255,255,0.4)",
                fontFamily:MONO }}>$</span>
              <input
                type="number" min={0} value={estUsd || ""}
                onChange={e => setEstUsd(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                style={{ ...I(), paddingLeft:"1.5rem" } as CSSProperties} />
            </div>
          </div>

          {estUsd > 0 && (
            <div style={{ padding:"0.875rem", background:"rgba(255,255,255,0.02)",
              border:"1px solid rgba(255,255,255,0.06)", borderRadius:"7px", marginBottom:"1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"0.4rem" }}>
                <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.35)" }}>Declared Value</span>
                <span style={{ fontSize:"0.56rem", fontWeight:700, color:"#f0f0f0", fontFamily:MONO }}>
                  ${estUsd.toLocaleString()}
                </span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.35)" }}>
                  Max Borrow at {cfg.ltv}% LTV
                </span>
                <span style={{ fontSize:"0.56rem", fontWeight:700, color:"#14F195", fontFamily:MONO }}>
                  ${Math.round(estUsd * cfg.ltv / 100).toLocaleString()} USDC
                </span>
              </div>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
            <button onClick={() => setStep("metadata")} style={{
              padding:"0.75rem", borderRadius:"7px", border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer", fontWeight:700, fontSize:"0.58rem", fontFamily:MONO,
              background:"transparent", color:"rgba(255,255,255,0.4)" }}>
              Back
            </button>
            <button onClick={() => setStep("wallet")} style={Btn(estUsd > 0)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: WALLET ── */}
      {step === "wallet" && (
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1rem", color:"#f0f0f0", margin:"0 0 0.25rem" }}>
            Connect Wallet
          </h2>
          <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:"0 0 1.25rem", lineHeight:1.6 }}>
            Your wallet address becomes the on-chain owner of the tokenized asset.
          </p>

          {!connected ? (
            <button onClick={() => setVisible(true)} style={Btn(true)}>
              Connect Wallet →
            </button>
          ) : (
            <>
              <div style={{ padding:"0.875rem", background:"rgba(20,241,149,0.04)",
                border:"1px solid rgba(20,241,149,0.15)", borderRadius:"7px", marginBottom:"1.25rem" }}>
                <div style={{ fontSize:"0.38rem", color:"rgba(20,241,149,0.5)", fontFamily:MONO,
                  textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:"0.3rem" }}>
                  Connected Wallet
                </div>
                <div style={{ fontSize:"0.52rem", color:"rgba(255,255,255,0.7)", fontFamily:MONO,
                  wordBreak:"break-all" }}>
                  {publicKey?.toBase58()}
                </div>
              </div>
              <button onClick={() => setStep("fee")} style={Btn(true)}>
                Continue →
              </button>
            </>
          )}

          <button onClick={() => setStep("valuation")} style={{
            marginTop:"0.5rem", width:"100%", padding:"0.75rem", borderRadius:"7px",
            border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", fontWeight:700,
            fontSize:"0.58rem", fontFamily:MONO, background:"transparent",
            color:"rgba(255,255,255,0.4)" }}>
            Back
          </button>
        </div>
      )}

      {/* ── STEP 5: FEE ── */}
      {step === "fee" && (
        <div>
          <h2 style={{ fontWeight:900, fontSize:"1rem", color:"#f0f0f0", margin:"0 0 0.25rem" }}>
            Tokenization Fee
          </h2>
          <p style={{ fontSize:"0.5rem", color:"rgba(255,255,255,0.3)", margin:"0 0 1.25rem", lineHeight:1.6 }}>
            A one-time ABRA fee initiates your asset into the verification pipeline.
          </p>

          <div style={{ padding:"1rem", background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.07)", borderRadius:"7px", marginBottom:"1rem" }}>
            {[
              ["Asset Class", cls],
              ["Fee", `${fee} ABRA`],
              ["Your Balance", `${balance.toLocaleString()} ABRA`],
              ["LTV Cap After Verification", `${cfg.ltv}%`],
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                padding:"0.35rem 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize:"0.48rem", color:"rgba(255,255,255,0.35)" }}>{k}</span>
                <span style={{ fontSize:"0.52rem", fontWeight:700,
                  color: k === "Your Balance" && !canAfford ? "#f26b6b" : "#f0f0f0",
                  fontFamily:MONO }}>{v}</span>
              </div>
            ))}
          </div>

          {!canAfford && (
            <div style={{ padding:"0.625rem", background:"rgba(242,107,107,0.07)",
              border:"1px solid rgba(242,107,107,0.2)", borderRadius:"5px",
              marginBottom:"0.875rem", fontSize:"0.48rem", color:"#f26b6b" }}>
              Insufficient ABRA. Acquire more on Jupiter or Bags.fm.
            </div>
          )}
          {errorMsg && (
            <div style={{ padding:"0.625rem", background:"rgba(242,107,107,0.07)",
              border:"1px solid rgba(242,107,107,0.2)", borderRadius:"5px",
              marginBottom:"0.875rem", fontSize:"0.48rem", color:"#f26b6b" }}>
              {errorMsg}
            </div>
          )}

          <button onClick={executeMint} disabled={!canAfford} style={Btn(canAfford)}>
            Pay {fee} ABRA &amp; Submit →
          </button>
          <button onClick={() => setStep("wallet")} style={{
            marginTop:"0.5rem", width:"100%", padding:"0.75rem", borderRadius:"7px",
            border:"1px solid rgba(255,255,255,0.1)", cursor:"pointer", fontWeight:700,
            fontSize:"0.58rem", fontFamily:MONO, background:"transparent",
            color:"rgba(255,255,255,0.4)" }}>
            Back
          </button>
        </div>
      )}

      {/* ── STEP 6: PROCESSING ── */}
      {step === "processing" && (
        <div style={{ padding:"2rem", textAlign:"center" }}>
          <div style={{ width:40, height:40, borderRadius:"50%",
            border:"3px solid rgba(124,58,237,0.2)",
            borderTopColor:"#7c3aed", margin:"0 auto 1rem",
            animation:"spin 0.8s linear infinite" }} />
          <div style={{ fontWeight:800, fontSize:"0.72rem", color:"#f0f0f0", marginBottom:"0.5rem" }}>
            Submitting to Sui…
          </div>
          <div style={{ fontSize:"0.54rem", color:"rgba(255,255,255,0.3)" }}>
            Deducting {fee} ABRA · Anchoring metadata · Creating position
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── STEP 7: SUCCESS ── */}
      {step === "queue" && minted && (
        <TokenizationProgress
          assetName={minted.name}
          assetClass={minted.assetClass}
          txSignature={txSig}
          tokenId={minted.tokenId}
          amountAbra={fee}
          onViewPortfolio={() => { if (onSuccess) onSuccess(); }}
        />
      )}

    </div>
  );
}

export default IssuanceEngine;
export { IssuanceEngine };
