// FILE: app/tokenize/page.tsx
// Tokenize Your Asset — plain language, transparency about current gaps,
// use-case explanation for why external marketplace links exist.
"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { GachaVaultDeploy } from "@/components/GachaVaultDeploy";

type AssetClass = "collectible"|"metal"|"stock"|"timepiece"|"spirits"|"comics";

const ASSET_CLASSES: Array<{ id:AssetClass; label:string; desc:string; color:string; ltv:string; custody:string }> = [
  { id:"collectible", label:"Graded Collectible", desc:"PSA/BGS/CGC graded cards. Physical vault in Tigard OR or New Castle DE.",          color:"#FBBF24", ltv:"55%", custody:"Collector Crypt" },
  { id:"metal",       label:"Precious Metal",     desc:"LBMA-certified gold or silver bullion. 999.9 fine. Verifiable weight cert.",         color:"#D4AF37", ltv:"80%", custody:"LBMA Vaulted" },
  { id:"stock",       label:"Tokenized Equity",   desc:"NASDAQ-listed shares via verified custodian. Token-2022 transfer hook.",             color:"#14F195", ltv:"70%", custody:"Digital Custody" },
  { id:"timepiece",   label:"Luxury Timepiece",   desc:"Rolex, Patek Philippe, AP. Authenticated by certified watchmaker.",                  color:"#C8A96E", ltv:"65%", custody:"Courtyard.io" },
  { id:"spirits",     label:"Rare Spirits",        desc:"Authenticated whisky, rum, cognac. Baxus on-chain provenance certification.",        color:"#FF8C00", ltv:"55%", custody:"Baxus Vault" },
  { id:"comics",      label:"Graded Comics",       desc:"CGC/CBCS certified vintage comics. Heritage Auctions or Metropolis provenance.",      color:"#a855f7", ltv:"65%", custody:"Metropolis Comics" },
];

const CURRENT_GAPS = [
  {
    area: "Physical Custody Bridge",
    status: "In Progress",
    color: "#FBBF24",
    detail: "Today the physical asset and the on-chain token are linked by trust — the custodian (Baxus, Courtyard, Collector Crypt) holds the item. A cryptographic custody attestation signed by the custodian and stored in the token metadata is on the roadmap. When live, the token will be non-transferable unless the custodian cosigns, preventing double-spend.",
  },
  {
    area: "Redemption (Token → Physical)",
    status: "Manual",
    color: "#FBBF24",
    detail: "Redeeming a tokenized asset for the physical item currently requires contacting the custodian off-chain. An on-chain redemption flow (burn token → custodian ships item) is planned for Q3 2026 via a Solana program instruction that triggers a Helius webhook to the custodian API.",
  },
  {
    area: "Real-Time Price Oracles",
    status: "Mock / Static",
    color: "#fb923c",
    detail: "Asset prices on the Terminal currently use last-known sale prices from custodians + a ±10min drift simulation. Integration with Pyth Network for metals/equities is live; collectible/spirits pricing via Baxus and PSA auction APIs is planned but not yet streaming.",
  },
  {
    area: "On-Chain Lending Settlement",
    status: "Simulated",
    color: "#fb923c",
    detail: "Loopscale borrow limits shown are accurate per their modular vault config. The actual USDC disbursement from vault to wallet is simulated in the current deployment. The Token-2022 transfer hook and Loopscale Anchor CPI are implemented but not yet mainnet-deployed.",
  },
  {
    area: "Legal Wrapper / SPV",
    status: "Not Yet Live",
    color: "#f26b6b",
    detail: "For equities and real estate, a legal Special Purpose Vehicle (SPV) is required to make the token represent actual ownership rights. This is the hardest gap to close — it requires jurisdiction-specific legal work. Abraxas is exploring partnerships with OpenDeal (Republic) and Securitize for compliant SPV infrastructure.",
  },
];

const WHY_EXTERNAL = [
  {
    marketplace: "Baxus",
    url: "https://www.baxus.co/",
    icon: "🥃",
    color: "#FF8C00",
    why: "Baxus is a Solana-native spirits marketplace with on-chain provenance. When you buy a bottle on Baxus, the NFT lives on Solana and the Abraxas protocol can read its ownership. This means your Blanton's or Pappy Van Winkle can be vaulted, borrowed against, or played in the Arena without any re-certification — the chain already knows you own it. This is the original insight behind Abraxas: existing RWA tokenization rails + Abraxas utility layer = immediate DeFi composability for physical assets.",
  },
  {
    marketplace: "Courtyard.io",
    url: "https://courtyard.io/vending-machine/rolex-watch-box",
    icon: "⌚",
    color: "#C8A96E",
    why: "Courtyard tokenizes luxury watches as NFTs backed by physical custody in a secure vault. A Rolex Submariner on Courtyard becomes a Solana token you can see in your wallet. Abraxas treats that token as a vault-eligible asset — you get 65% LTV borrowing, Arena combat stats, and yield staking without ever moving the physical watch. The vending machine link takes you directly to watch boxes you can buy and have immediately recognized in Abraxas.",
  },
  {
    marketplace: "Collector Crypt",
    url: "https://gacha.collectorcrypt.com/#pokemon",
    icon: "⬡",
    color: "#FBBF24",
    why: "Collector Crypt is a gacha-style graded card marketplace on Solana. Cards you pull become on-chain assets with PSA grade and vault location metadata baked in. Abraxas reads that metadata to assign combat archetypes (Charizard = Aggro, Blastoise = Tank) and calculate borrow limits based on PSA grade and recent auction comps. It's the cleanest pipeline from physical TCG to DeFi that exists today.",
  },
  {
    marketplace: "Metropolis Comics",
    url: "https://www.metropoliscomics.com/?hl=en-US",
    icon: "📖",
    color: "#a855f7",
    why: "Metropolis is the world's largest dealer of vintage comics. Abraxas currently routes comic acquisition here because Metropolis provides CGC certification data that maps directly to the provenance fields in our Token-2022 metadata schema. As Metropolis builds on-chain tooling, the bridge will become programmatic rather than manual.",
  },
];

export default function TokenizePage() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [step,       setStep]       = useState<"explain"|"select"|"form"|"mint"|"done">("explain");
  const [assetClass, setAssetClass] = useState<AssetClass|null>(null);
  const [form,       setForm]       = useState({ name:"", gradeProvider:"", gradeScore:"", estimatedValue:"", serialOrCert:"", notes:"" });
  const [gapsOpen,   setGapsOpen]   = useState(false);
  const [whyOpen,    setWhyOpen]    = useState(false);

  function selectClass(id:AssetClass) { setAssetClass(id); setStep("form"); }
  const ABRA_FEE = form.estimatedValue ? Math.max(50, Math.min(250, Math.round(parseFloat(form.estimatedValue||"0")/1000))) : 100;

  function handleSubmit() {
    if(!connected){ setVisible(true); return; }
    if(!form.name||!form.estimatedValue) return;
    setStep("mint");
  }

  const cls = ASSET_CLASSES.find(a=>a.id===assetClass);

  return (
    <div style={{ maxWidth:"720px",margin:"0 auto",padding:"1.5rem 1.25rem 5rem" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom:"1.5rem" }}>
        <p style={{ fontSize:"0.5rem",letterSpacing:"0.2em",textTransform:"uppercase",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",margin:"0 0 0.2rem" }}>
          Abraxas Protocol · Token-2022 · Solana
        </p>
        <h1 style={{ fontWeight:900,fontSize:"clamp(1.2rem,3vw,1.6rem)",letterSpacing:"-0.02em",margin:"0 0 0.4rem" }}>Tokenize Your Asset</h1>
        <p style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.4)",margin:0,lineHeight:1.65 }}>
          Convert a real-world asset into a Token-2022 position on Solana — then vault it, borrow against it, earn yield, or deploy it in the Arena.
        </p>
      </div>

      {/* Step progress */}
      {step!=="explain"&&(
        <div style={{ display:"flex",gap:"0.25rem",marginBottom:"1.25rem",alignItems:"center" }}>
          {[["Select","select"],["Details","form"],["Mint","mint"],["Done","done"]].map(([l,s],i)=>{
            const steps=["select","form","mint","done"]; const cur=steps.indexOf(step);
            const done=steps.indexOf(s)<cur; const active=s===step;
            return(
              <div key={s} style={{ display:"flex",alignItems:"center",gap:"0.25rem" }}>
                <div style={{ width:"18px",height:"18px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.46rem",fontWeight:700,background:done?"#14F195":active?"rgba(168,85,247,0.2)":"rgba(255,255,255,0.05)",border:`1px solid ${done?"#14F195":active?"rgba(168,85,247,0.5)":"rgba(255,255,255,0.1)"}`,color:done?"#000":active?"#a855f7":"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>
                  {done?"✓":i+1}
                </div>
                <span style={{ fontSize:"0.5rem",color:active?"#a855f7":done?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>{l}</span>
                {i<3&&<div style={{ width:"20px",height:"1px",background:"rgba(255,255,255,0.07)" }} />}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Explain step ───── */}
      {step==="explain"&&(
        <div style={{ animation:"fadeIn 0.4s ease-out" }}>
          {/* What tokenizing means */}
          <div style={{ padding:"1.125rem",background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.15)",borderRadius:"12px",marginBottom:"1rem" }}>
            <div style={{ fontWeight:800,fontSize:"0.88rem",color:"#a855f7",marginBottom:"0.625rem" }}>What does "tokenizing" actually mean?</div>
            <div style={{ fontSize:"0.58rem",color:"rgba(255,255,255,0.55)",lineHeight:1.75 }}>
              <p style={{ margin:"0 0 0.625rem" }}>You own a physical asset — a watch, a bottle of whisky, a graded Pokémon card. Right now it sits in a vault or on a shelf. It's illiquid: you can't borrow against it, earn yield on it, or use it as collateral without selling it first.</p>
              <p style={{ margin:"0 0 0.625rem" }}>Tokenizing means creating a <strong style={{ color:"#a855f7" }}>Token-2022 record on Solana</strong> that represents your ownership. The token contains: the asset's identity (grade, serial, custodian), your wallet as the verified owner, and a transfer hook that enforces custody rules on every trade.</p>
              <p style={{ margin:0 }}>Once tokenized, Abraxas treats it like any on-chain asset: it can be deposited into a vault, used as collateral for USDC through Loopscale, staked for $ABRA yield, or battled in the Sovereign Arena. The physical item never moves — the digital token is what becomes composable.</p>
            </div>
          </div>

          {/* Why external marketplaces */}
          <div style={{ marginBottom:"1rem" }}>
            <button onClick={()=>setWhyOpen(v=>!v)} style={{ width:"100%",textAlign:"left",padding:"0.75rem 1rem",background:"rgba(6,8,16,0.97)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontSize:"0.72rem",fontWeight:700,color:"#f0f0f0" }}>Why does Abraxas link to Baxus, Courtyard, and Collector Crypt?</span>
              <span style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.3)" }}>{whyOpen?"▲":"▼"}</span>
            </button>
            {whyOpen&&(
              <div style={{ border:"1px solid rgba(255,255,255,0.06)",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden" }}>
                {WHY_EXTERNAL.map(m=>(
                  <div key={m.marketplace} style={{ padding:"0.875rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.4rem" }}>
                      <span style={{ fontSize:"1rem" }}>{m.icon}</span>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight:700,fontSize:"0.7rem",color:m.color,textDecoration:"none" }}>{m.marketplace}</a>
                    </div>
                    <p style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.45)",lineHeight:1.65,margin:0 }}>{m.why}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current gaps — transparency */}
          <div style={{ marginBottom:"1.25rem" }}>
            <button onClick={()=>setGapsOpen(v=>!v)} style={{ width:"100%",textAlign:"left",padding:"0.75rem 1rem",background:"rgba(251,146,60,0.04)",border:"1px solid rgba(251,146,60,0.15)",borderRadius:"10px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <span style={{ fontSize:"0.72rem",fontWeight:700,color:"#fb923c" }}>What gaps still exist? (Transparency)</span>
                <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.28)",marginTop:"0.1rem" }}>We believe in showing you exactly where the tech stands today.</div>
              </div>
              <span style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.3)",flexShrink:0,marginLeft:"0.5rem" }}>{gapsOpen?"▲":"▼"}</span>
            </button>
            {gapsOpen&&(
              <div style={{ border:"1px solid rgba(251,146,60,0.12)",borderTop:"none",borderRadius:"0 0 10px 10px",overflow:"hidden" }}>
                {CURRENT_GAPS.map(g=>(
                  <div key={g.area} style={{ padding:"0.875rem 1rem",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.35rem" }}>
                      <span style={{ fontSize:"0.48rem",fontWeight:700,padding:"0.1rem 0.4rem",borderRadius:"3px",background:`${g.color}14`,border:`1px solid ${g.color}28`,color:g.color,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap" }}>{g.status}</span>
                      <span style={{ fontSize:"0.64rem",fontWeight:700,color:"#f0f0f0" }}>{g.area}</span>
                    </div>
                    <p style={{ fontSize:"0.54rem",color:"rgba(255,255,255,0.42)",lineHeight:1.65,margin:0 }}>{g.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={()=>setStep("select")} style={{ width:"100%",padding:"0.875rem",borderRadius:"10px",border:"none",fontWeight:900,fontSize:"0.88rem",fontFamily:"'JetBrains Mono',monospace",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#6b8cff)",color:"#fff",boxShadow:"0 0 28px rgba(168,85,247,0.3)",letterSpacing:"0.04em" }}>
            Start Tokenizing →
          </button>
        </div>
      )}

      {/* ─── Select asset class ───── */}
      {step==="select"&&(
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))",gap:"0.625rem",animation:"fadeIn 0.3s ease-out" }}>
          {ASSET_CLASSES.map(ac=>(
            <button key={ac.id} onClick={()=>selectClass(ac.id)} style={{ textAlign:"left",padding:"1rem",borderRadius:"10px",background:"rgba(6,8,16,0.97)",border:`1px solid ${ac.color}22`,cursor:"pointer",transition:"border-color 0.15s,box-shadow 0.15s" }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=ac.color+"55";(e.currentTarget as HTMLElement).style.boxShadow=`0 0 16px ${ac.color}10`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=ac.color+"22";(e.currentTarget as HTMLElement).style.boxShadow="none";}}>
              <div style={{ fontWeight:800,fontSize:"0.82rem",color:ac.color,marginBottom:"0.2rem" }}>{ac.label}</div>
              <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.38)",lineHeight:1.5,marginBottom:"0.5rem" }}>{ac.desc}</div>
              <div style={{ display:"flex",gap:"0.5rem" }}>
                <span style={{ fontSize:"0.46rem",color:ac.color,fontFamily:"'JetBrains Mono',monospace",fontWeight:700 }}>LTV {ac.ltv}</span>
                <span style={{ fontSize:"0.46rem",color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>· {ac.custody}</span>
              </div>
            </button>
          ))}
          <button onClick={()=>setStep("explain")} style={{ gridColumn:"1/-1",padding:"0.4rem",background:"none",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",color:"rgba(255,255,255,0.28)",fontSize:"0.54rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
        </div>
      )}

      {/* ─── Form ───── */}
      {step==="form"&&cls&&(
        <div style={{ animation:"fadeIn 0.3s ease-out" }}>
          <div style={{ padding:"0.75rem 1rem",background:`${cls.color}08`,border:`1px solid ${cls.color}22`,borderRadius:"10px",marginBottom:"1rem" }}>
            <div style={{ fontWeight:700,fontSize:"0.72rem",color:cls.color }}>{cls.label}</div>
            <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.35)" }}>LTV: {cls.ltv} · Custody: {cls.custody}</div>
          </div>
          {[
            { key:"name",           label:"Asset Name",         placeholder:"e.g. 1999 Charizard Holo",              required:true  },
            { key:"gradeProvider",  label:"Grade Provider",     placeholder:"PSA / BGS / CGC / Baxus / LBMA",        required:false },
            { key:"gradeScore",     label:"Grade Score",        placeholder:"e.g. 10 / 9.5 / Auth",                  required:false },
            { key:"estimatedValue", label:"Est. Value (USD)",   placeholder:"e.g. 55000",                            required:true  },
            { key:"serialOrCert",   label:"Serial / Cert #",    placeholder:"PSA cert # or custodian reference",     required:false },
            { key:"notes",          label:"Notes",              placeholder:"Any additional provenance or condition info", required:false },
          ].map(f=>(
            <div key={f.key} style={{ marginBottom:"0.625rem" }}>
              <label style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.38)",display:"block",marginBottom:"0.2rem",fontFamily:"'JetBrains Mono',monospace" }}>
                {f.label}{f.required&&<span style={{ color:"#f26b6b",marginLeft:"2px" }}>*</span>}
              </label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                placeholder={f.placeholder}
                style={{ width:"100%",padding:"0.5rem 0.75rem",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,255,255,0.09)`,color:"#f0f0f0",fontSize:"0.62rem",fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box",transition:"border-color 0.15s" }}
                onFocus={e=>{(e.currentTarget as HTMLElement).style.borderColor=cls.color+"55";}}
                onBlur={e=>{(e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,0.09)";}}
              />
            </div>
          ))}
          {/* $ABRA fee display */}
          {form.estimatedValue&&(
            <div style={{ padding:"0.5rem 0.75rem",borderRadius:"7px",background:"rgba(200,169,110,0.07)",border:"1px solid rgba(200,169,110,0.2)",marginTop:"0.5rem",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <div>
                <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.4)",fontFamily:"'JetBrains Mono',monospace" }}>Tokenization Fee</div>
                <div style={{ fontSize:"0.44rem",color:"rgba(255,255,255,0.25)",fontFamily:"'JetBrains Mono',monospace" }}>Paid in $ABRA · Scales with asset value</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"0.82rem",fontWeight:900,color:"#C8A96E",fontFamily:"'JetBrains Mono',monospace" }}>{ABRA_FEE} $ABRA</div>
                <a href="https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ fontSize:"0.4rem",color:"rgba(200,169,110,0.6)",fontFamily:"'JetBrains Mono',monospace" }}>Need $ABRA? Buy on Jupiter →</a>
              </div>
            </div>
          )}
          <div style={{ display:"flex",gap:"0.5rem",marginTop:"0.5rem" }}>
            <button onClick={()=>setStep("select")} style={{ padding:"0.5rem 1rem",borderRadius:"7px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.35)",fontSize:"0.62rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>← Back</button>
            <button onClick={handleSubmit} disabled={!form.name||!form.estimatedValue} style={{ flex:1,padding:"0.625rem",borderRadius:"7px",border:"none",fontWeight:800,fontSize:"0.75rem",cursor:form.name&&form.estimatedValue?"pointer":"not-allowed",background:form.name&&form.estimatedValue?`linear-gradient(135deg,${cls.color},#a855f7)`:"rgba(255,255,255,0.05)",color:form.name&&form.estimatedValue?"#000":"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace" }}>
              {connected?`Mint · ${ABRA_FEE} $ABRA fee`:"Connect Wallet to Mint"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Mint ───── */}
      {step==="mint"&&cls&&(
        <div style={{ animation:"fadeIn 0.3s ease-out" }}>
          <GachaVaultDeploy
            assetName={form.name}
            assetType={cls.id}
            vaultName={`${cls.label} Vault`}
            onComplete={(_result)=>{ setStep("done"); }}
            onCancel={()=>setStep("form")}
          />
        </div>
      )}

      {/* ─── Done ───── */}
      {step==="done"&&(
        <div style={{ textAlign:"center",padding:"2rem",animation:"fadeIn 0.4s ease-out" }}>
          <div style={{ width:"56px",height:"56px",borderRadius:"50%",background:"rgba(20,241,149,0.1)",border:"1px solid rgba(20,241,149,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem",fontSize:"1.4rem" }}>✓</div>
          <div style={{ fontWeight:900,fontSize:"1.1rem",color:"#14F195",marginBottom:"0.4rem" }}>Asset Tokenized</div>
          <p style={{ fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",lineHeight:1.65,maxWidth:"420px",margin:"0 auto 1.5rem" }}>
            Your Token-2022 position is live on Solana. Head to the Vault Terminal to deposit, borrow USDC against it via Loopscale, or deploy it in the Sovereign Arena.
          </p>
          <div style={{ display:"flex",gap:"0.5rem",justifyContent:"center",flexWrap:"wrap" }}>
            <a href="/protect" style={{ padding:"0.5rem 1.25rem",borderRadius:"8px",background:"rgba(20,241,149,0.1)",border:"1px solid rgba(20,241,149,0.25)",color:"#14F195",textDecoration:"none",fontSize:"0.65rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace" }}>→ Vault Terminal</a>
            <button onClick={()=>{setStep("explain");setAssetClass(null);setForm({name:"",gradeProvider:"",gradeScore:"",estimatedValue:"",serialOrCert:"",notes:""});}} style={{ padding:"0.5rem 1.25rem",borderRadius:"8px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.38)",fontSize:"0.65rem",cursor:"pointer",fontFamily:"'JetBrains Mono',monospace" }}>Tokenize Another</button>
          </div>
        </div>
      )}
    </div>
  );
}