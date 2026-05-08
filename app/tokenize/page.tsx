// FILE: app/tokenize/page.tsx
// In-app tokenization intake — uses existing Token-2022 mint infrastructure.
// Users select asset class, provide metadata, then GachaVaultDeploy mints the position.
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { GachaVaultDeploy } from "@/components/GachaVaultDeploy";

type AssetClass = "collectible" | "metal" | "stock" | "timepiece" | "realestate" | "memorabilia";

const ASSET_CLASSES: Array<{ id: AssetClass; label: string; desc: string; color: string }> = [
  { id:"collectible",  label:"Graded Collectible", desc:"PSA/BGS/CGC graded cards, comics, gaming items. Physical vault storage in Tigard OR or New Castle DE.", color:"#FBBF24" },
  { id:"metal",        label:"Precious Metal",     desc:"LBMA-certified gold or silver bullion. 999.9 fine. 70% LTV borrow available on vault deposit.", color:"#D4AF37" },
  { id:"stock",        label:"Tokenized Equity",   desc:"NASDAQ-listed shares held via verified custodian. Token-2022 transfer hook. 70% LTV.", color:"#14F195" },
  { id:"timepiece",    label:"Luxury Timepiece",   desc:"Rolex, Patek Philippe, AP. Authenticated by certified watchmaker. 65% LTV.", color:"#C8A96E" },
  { id:"realestate",   label:"Real Estate",        desc:"Fractional ownership via SPV. On-chain deed certificate. Yield-bearing position.", color:"#6b8cff" },
  { id:"memorabilia",  label:"Sports Memorabilia", desc:"Game-worn, signed, or certified items. PSA/JSA authentication required.", color:"#fb923c" },
];

export default function TokenizePage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [step,        setStep]        = useState<"select"|"form"|"mint"|"done">("select");
  const [assetClass,  setAssetClass]  = useState<AssetClass | null>(null);
  const [form,        setForm]        = useState({ name:"", gradeProvider:"", gradeScore:"", estimatedValue:"", serialOrCert:"", notes:"" });
  const [minted,      setMinted]      = useState<{ tokenId: string; sig: string } | null>(null);

  function selectClass(id: AssetClass) { setAssetClass(id); setStep("form"); }

  function handleSubmit() {
    if (!connected) { setVisible(true); return; }
    if (!form.name || !form.estimatedValue) return;
    setStep("mint");
  }

  const cls = ASSET_CLASSES.find(a => a.id === assetClass);

  return (
    <div style={{ maxWidth:"680px", margin:"0 auto", padding:"1.5rem 1.25rem 5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <p style={{ fontSize:"0.5rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>
          Abraxas Protocol · Token-2022 · Solana
        </p>
        <h1 style={{ fontWeight:900,fontSize:"clamp(1.2rem,3vw,1.6rem)",letterSpacing:"-0.02em",margin:"0 0 0.3rem" }}>
          Tokenize Your Asset
        </h1>
        <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.38)",margin:0,lineHeight:1.6 }}>
          Convert a real-world asset into a Token-2022 position on Solana. Once minted, the position can be vaulted, staked for yield, or entered into the Arena.
        </p>
      </div>

      {/* Step 1 — Select asset class */}
      {step === "select" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:"0.625rem" }}>
          {ASSET_CLASSES.map(cls => (
            <button key={cls.id} onClick={() => selectClass(cls.id)} style={{
              textAlign:"left", padding:"0.875rem 1rem", borderRadius:"10px", cursor:"pointer",
              background:"rgba(6,8,16,0.97)", border:`1px solid ${cls.color}28`,
              transition:"border-color 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = cls.color+"66"; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${cls.color}14`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = cls.color+"28"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ fontWeight:800,fontSize:"0.82rem",color:cls.color,marginBottom:"0.25rem" }}>{cls.label}</div>
              <div style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.38)",lineHeight:1.6 }}>{cls.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Asset metadata form */}
      {step === "form" && cls && (
        <div style={{ background:"rgba(6,8,16,0.97)", border:`1px solid ${cls.color}22`, borderRadius:"12px", padding:"1.25rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <div>
              <div style={{ fontWeight:800,fontSize:"0.85rem",color:cls.color }}>{cls.label}</div>
              <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",fontFamily:"'JetBrains Mono',monospace" }}>Token-2022 · Vault Intake Form</div>
            </div>
            <button onClick={() => { setStep("select"); setAssetClass(null); }} style={{ fontSize:"0.55rem",color:"rgba(255,255,255,0.3)",background:"none",border:"none",cursor:"pointer" }}>
              Back
            </button>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:"0.625rem" }}>
            {[
              { key:"name",          label:"Asset Name",          placeholder:"e.g. 1999 Charizard Base Set" },
              { key:"gradeProvider", label:"Grade Provider",      placeholder:"PSA / BGS / CGC / RAW" },
              { key:"gradeScore",    label:"Grade Score",         placeholder:"e.g. PSA 10 / BGS 9.5" },
              { key:"estimatedValue",label:"Estimated Value USD", placeholder:"e.g. 4828" },
              { key:"serialOrCert",  label:"Serial / Cert #",     placeholder:"e.g. 40710035 (optional)" },
              { key:"notes",         label:"Additional Notes",    placeholder:"Provenance, purchase source, etc." },
            ].map(field => (
              <div key={field.key}>
                <label style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:"4px" }}>
                  {field.label}
                </label>
                <input
                  value={(form as any)[field.key]}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ width:"100%",padding:"0.5rem 0.625rem",borderRadius:"6px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#f0f0f0",fontSize:"0.65rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box" }}
                />
              </div>
            ))}

            {/* x402 ante notice */}
            <div style={{ padding:"0.4rem 0.625rem",background:"rgba(96,165,250,0.06)",border:"1px solid rgba(96,165,250,0.15)",borderRadius:"6px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:"0.35rem" }}>
                <span style={{ width:"4px",height:"4px",borderRadius:"50%",background:"#60A5FA",flexShrink:0 }} />
                <span style={{ fontSize:"0.46rem",fontWeight:700,color:"#60A5FA",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace" }}>x402 MINT FEE</span>
              </div>
              <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.35)",marginTop:"3px",lineHeight:1.5 }}>
                0.001 SOL deducted via x402 payment middleware on mint. This covers oracle verification and on-chain account creation.
              </div>
            </div>

            <button onClick={handleSubmit} disabled={!form.name || !form.estimatedValue} style={{
              padding:"0.625rem",borderRadius:"8px",border:"none",fontWeight:800,fontSize:"0.78rem",
              fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.04em",
              background: form.name && form.estimatedValue ? `linear-gradient(135deg,${cls.color},${cls.color}bb)` : "rgba(255,255,255,0.05)",
              color: form.name && form.estimatedValue ? "#000" : "rgba(255,255,255,0.2)",
              cursor: form.name && form.estimatedValue ? "pointer" : "not-allowed",
              boxShadow: form.name && form.estimatedValue ? `0 0 16px ${cls.color}30` : "none",
            }}>
              {connected ? "Mint Token-2022 Position" : "Connect Wallet to Mint"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — GachaVaultDeploy minting animation */}
      {step === "mint" && cls && (
        <div style={{ background:"rgba(6,8,16,0.97)",border:`1px solid ${cls.color}22`,borderRadius:"12px",padding:"1.5rem",textAlign:"center" }}>
          <GachaVaultDeploy
            assetName={form.name}
            assetType={cls.label}
            vaultName="VAULT-490"
            onComplete={(result) => {
              setMinted({ tokenId: result?.tokenId ?? `TKN-${Date.now().toString(36).toUpperCase()}`, sig: result?.txSignature ?? "" });
              setStep("done");
            }}
            onCancel={() => setStep("form")}
          />
        </div>
      )}

      {/* Step 4 — Done */}
      {step === "done" && minted && cls && (
        <div style={{ background:"rgba(6,8,16,0.97)",border:"1px solid rgba(20,241,149,0.25)",borderRadius:"12px",padding:"1.5rem",textAlign:"center" }}>
          <div style={{ fontWeight:900,fontSize:"1.3rem",color:"#14F195",marginBottom:"0.5rem",letterSpacing:"-0.02em" }}>Position Minted</div>
          <div style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.4)",marginBottom:"1rem",fontFamily:"'JetBrains Mono',monospace" }}>{form.name} · {cls.label}</div>
          <div style={{ padding:"0.75rem 1rem",background:"rgba(20,241,149,0.05)",border:"1px solid rgba(20,241,149,0.15)",borderRadius:"8px",marginBottom:"1rem" }}>
            <div style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.28)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"4px" }}>Token ID</div>
            <div style={{ fontSize:"0.6rem",color:"#14F195",fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>{minted.tokenId}</div>
          </div>
          <div style={{ display:"flex",gap:"0.5rem",justifyContent:"center" }}>
            <a href="/protect" style={{ padding:"0.45rem 1rem",borderRadius:"7px",background:"rgba(20,241,149,0.1)",border:"1px solid rgba(20,241,149,0.25)",color:"#14F195",textDecoration:"none",fontSize:"0.65rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>
              View in Vaults
            </a>
            <button onClick={() => { setStep("select"); setForm({ name:"",gradeProvider:"",gradeScore:"",estimatedValue:"",serialOrCert:"",notes:"" }); setMinted(null); }} style={{ padding:"0.45rem 1rem",borderRadius:"7px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",fontSize:"0.65rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",cursor:"pointer" }}>
              Tokenize Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}