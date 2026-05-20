// FILE: components/IssuanceEngine.tsx
"use client";
// Full 7-step tokenization studio.
// Asset classes include Property + Short-Term Rental (Airbnb use case).
// Real SPL ABRA deduction. Supabase sync after mint. TransactionReceipt shown.
// SOL payment UI scaffolded for X402 integration.
"use client";

import { useState, useCallback, useRef }    from "react";
import { useWallet }                         from "@solana/wallet-adapter-react";
import { useWalletModal }                    from "@solana/wallet-adapter-react-ui";
import { useConnection }                     from "@solana/wallet-adapter-react";
import { useAbraStore, type AssetClass }     from "@/lib/abraxasStore";
import { useAbraBalance }                    from "@/lib/hooks/useAbraBalance";
import { deductAbraForMint,
         simulateMintDeduction }             from "@/lib/services/mintService";
import { TransactionReceipt }               from "@/components/TransactionReceipt";
import { TokenizationProgress }             from "@/components/TokenizationProgress";

// ── Asset class config ────────────────────────────────────────────────────────
const CLASSES: Record<string, {
  fee:number; ltv:number; partner:string; color:string;
  description:string; icon:string; category:string;
}> = {
  "Watches":           {fee:150,ltv:65,color:"#6b8cff",icon:"◎",category:"Collectible",
    partner:"Certified Custody Network",
    description:"Mechanical, luxury, and vintage timepieces with verifiable provenance."},
  "Spirits":           {fee:120,ltv:55,color:"#FF8C00",icon:"◈",category:"Collectible",
    partner:"Certified Custody Network",
    description:"Rare and aged whisky, cognac, rum, and wine with authentication records."},
  "Cards (PSA/BGS)":  {fee:110,ltv:55,color:"#FBBF24",icon:"⬡",category:"Collectible",
    partner:"Certified Custody Network",
    description:"Professionally graded trading cards from PSA, BGS, or CGC."},
  "Comics (CGC)":      {fee:130,ltv:65,color:"#a855f7",icon:"◫",category:"Collectible",
    partner:"Certified Custody Network",
    description:"CGC-certified comic books with case-verified grade."},
  "Metals":            {fee:200,ltv:80,color:"#D4AF37",icon:"◆",category:"Commodity",
    partner:"Certified Custody Network",
    description:"LBMA-standard gold, silver, platinum, and palladium in bullion form."},
  "Art":               {fee:180,ltv:50,color:"#f26b6b",icon:"◭",category:"Fine Art",
    partner:"Certified Custody Network",
    description:"Fine art, limited editions, and authenticated prints with provenance."},
  "Racehorses":        {fee:250,ltv:55,color:"#22c55e",icon:"◉",category:"Animal Asset",
    partner:"Certified Custody Network",
    description:"Thoroughbred and racing horses with registry documentation."},
  "Property":          {fee:300,ltv:60,color:"#14F195",icon:"⬛",category:"Real Estate",
    partner:"Title and Deed Verification Network",
    description:"Residential, commercial, or vacation property with clear title and deed."},
  "Short-Term Rental": {fee:250,ltv:55,color:"#14F195",icon:"⊞",category:"Real Estate",
    partner:"Title and Deed Verification Network",
    description:"Airbnb, VRBO, or short-term rental property. Tokenize your listing to unlock DeFi capital."},
  "Other":             {fee:100,ltv:45,color:"#C8A96E",icon:"⬢",category:"General",
    partner:"Certified Custody Network",
    description:"Any real-world asset with documented ownership and provable value."},
};

type AssetClassKey = keyof typeof CLASSES;
type Step = "upload"|"metadata"|"valuation"|"wallet"|"fee"|"processing"|"queue";
type PayMethod = "abra"|"sol";

// ── Supabase sync ─────────────────────────────────────────────────────────────
async function syncToSupabase(asset: {
  name:string; assetClass:string; estimatedUsd:number; mintCostAbra:number;
  txSignature:string; ownerWallet:string; ltv:number;
  description?:string; imagePreview?:string;
}) {
  try {
    await fetch("/api/assets", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(asset),
    });
  } catch {
    // Supabase sync failure is non-fatal — asset is in Zustand store
    console.warn("Supabase sync failed — asset saved to local store only");
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export function IssuanceEngine({ onSuccess }: { onSuccess?: () => void }) {
  const [step,       setStep]       = useState<Step>("upload");
  const [assetClass, setAssetClass] = useState<AssetClassKey>("Watches");
  const [preview,    setPreview]    = useState<string|undefined>();
  const [meta,       setMeta]       = useState({ name:"", description:"", grade:"", year:"" });
  const [estUsd,     setEstUsd]     = useState(0);
  const [mintedId,   setMintedId]   = useState("");
  const [txSig,      setTxSig]      = useState("");
  const [payMethod,  setPayMethod]  = useState<PayMethod>("abra");
  const [mintedAsset,setMintedAsset]= useState<{name:string;assetClass:string;tokenId:string}|null>(null);
  const [errorMsg,   setErrorMsg]   = useState("");
  const fileRef                     = useRef<HTMLInputElement>(null);

  const { connection }                            = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const { setVisible }                            = useWalletModal();
  const { balance: realBalance, loading: balLoading } = useAbraBalance();
  const abraBalance   = useAbraStore(s => s.abraBalance);
  const mintAsset     = useAbraStore(s => s.mintAsset);

  const cfg        = CLASSES[assetClass] ?? CLASSES["Other"];
  const fee        = cfg.fee;
  const displayBal = connected ? realBalance : abraBalance;
  const canAfford  = displayBal >= fee;

  // ── Image upload ─────────────────────────────────────────────────────────
  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ── Mint execution ────────────────────────────────────────────────────────
  async function executeMint() {
    setStep("processing");
    setErrorMsg("");
    const wallet = publicKey?.toBase58() ?? "demo-wallet";

    // Real SPL deduction if wallet connected, demo otherwise
    let deductResult;
    if (connected && publicKey && signTransaction) {
      deductResult = await deductAbraForMint({
        connection, userWallet: publicKey, amountAbra: fee,
        signAndSendTransaction: async (tx) => {
          const signed = await signTransaction(tx);
          return connection.sendRawTransaction(signed.serialize());
        },
      });
    } else {
      deductResult = simulateMintDeduction(fee);
    }

    if (!deductResult.success) {
      setErrorMsg(deductResult.error ?? "Transaction failed. Please try again.");
      setStep("fee");
      return;
    }

    // Write to Zustand store
    const result = mintAsset({
      name:           meta.name || "Unnamed Asset",
      description:    meta.description || cfg.description,
      assetClass:     assetClass as AssetClass,
      mintCostAbra:   fee,
      imagePreview:   preview,
      estimatedUsd:   estUsd,
      ltv:            cfg.ltv,
      custodyPartner: cfg.partner,
      grade:          meta.grade || undefined,
      year:           meta.year  || undefined,
    }, wallet);

    if (!result) { setStep("fee"); return; }

    const finalTx = deductResult.txSignature ?? result.txSignature;
    setMintedId(result.id);
    setTxSig(finalTx);
    setMintedAsset({ name: result.name, assetClass: result.assetClass, tokenId: result.tokenId });

    // Sync to Supabase (non-blocking)
    await syncToSupabase({
      name:          result.name,
      assetClass:    result.assetClass,
      estimatedUsd:  estUsd,
      mintCostAbra:  fee,
      txSignature:   finalTx,
      ownerWallet:   wallet,
      ltv:           cfg.ltv,
      description:   meta.description,
      imagePreview:  preview,
    });

    setStep("queue");
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const T = (styles: React.CSSProperties) => styles;
  const mono = "'JetBrains Mono',monospace";

  const stepNum = {upload:1,metadata:2,valuation:3,wallet:4,fee:5,processing:6,queue:7};
  const pct = Math.round((stepNum[step]/7)*100);

  function labelStyle(): React.CSSProperties {
    return {fontSize:"0.38rem",fontWeight:700,color:"rgba(255,255,255,0.3)",
      fontFamily:mono,textTransform:"uppercase" as const,letterSpacing:"0.12em",marginBottom:"0.35rem"};
  }
  function inputStyle(): React.CSSProperties {
    return {width:"100%",padding:"0.625rem 0.75rem",borderRadius:"6px",
      background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",
      color:"#f0f0f0",fontSize:"0.6rem",outline:"none",fontFamily:mono,
      boxSizing:"border-box" as const};
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:560,margin:"0 auto"}}>

      {/* Progress bar */}
      {step!=="queue"&&(
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.3rem"}}>
            <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",fontFamily:mono,
              textTransform:"uppercase",letterSpacing:"0.12em"}}>
              Step {stepNum[step]} of 7
            </span>
            <span style={{fontSize:"0.38rem",fontWeight:700,color:"#C8A96E",fontFamily:mono}}>
              {pct}%
            </span>
          </div>
          <div style={{height:2,background:"rgba(255,255,255,0.07)",borderRadius:1}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,#7c3aed,#C8A96E)",
              borderRadius:1,width:`${pct}%`,transition:"width 0.4s ease"}}/>
          </div>
        </div>

      {/* ── STEP 1: SELECT ASSET CLASS ── */}
      {step==="upload"&&(
        <div>
          <h2 style={{fontWeight:900,fontSize:"1rem",color:"#f0f0f0",margin:"0 0 0.25rem"}}>
            Select Asset Class
          </h2>
          <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",
            margin:"0 0 1.25rem",lineHeight:1.6}}>
            Choose the category that best describes your real-world asset.
            Each class has specific verification requirements and lending parameters.
          </p>

          <div style={{display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))",
            gap:"0.5rem",marginBottom:"1.25rem"}}>
            {Object.entries(CLASSES).map(([name,cfg])=>{
              const active = assetClass===name;
              return(
                <div key={name} onClick={()=>setAssetClass(name as AssetClassKey)} style={{
                  padding:"0.875rem",borderRadius:"7px",cursor:"pointer",
                  border:`1px solid ${active?`${cfg.color}40`:cfg.color+"18"}`,
                  background:active?`${cfg.color}10`:`${cfg.color}04`,
                  transition:"all 0.15s",
                }}
                onMouseEnter={e=>{if(!active){const el=e.currentTarget as HTMLDivElement;
                  el.style.background=`${cfg.color}08`;el.style.borderColor=`${cfg.color}30`;}}}
                onMouseLeave={e=>{if(!active){const el=e.currentTarget as HTMLDivElement;
                  el.style.background=`${cfg.color}04`;el.style.borderColor=`${cfg.color}18`;}}}>
                  <div style={{fontSize:"1rem",color:cfg.color,opacity:active?0.9:0.5,
                    marginBottom:"0.25rem",lineHeight:1}}>{cfg.icon}</div>
                  <div style={{fontWeight:800,fontSize:"0.56rem",color:active?"#f0f0f0":"rgba(255,255,255,0.7)",
                    marginBottom:2}}>{name}</div>
                  <div style={{fontSize:"0.34rem",color:cfg.color,fontFamily:mono,
                    marginBottom:2,opacity:0.7}}>{cfg.category}</div>
                  <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",fontFamily:mono}}>
                    {cfg.ltv}% LTV · {cfg.fee} ABRA
                  </div>
                  {/* Property/Airbnb highlight */}
                  {(name==="Property"||name==="Short-Term Rental")&&(
                    <div style={{marginTop:4,padding:"1px 5px",borderRadius:3,
                      background:`${cfg.color}15`,border:`1px solid ${cfg.color}30`,
                      display:"inline-block"}}>
                      <span style={{fontSize:"0.3rem",fontWeight:700,color:cfg.color,
                        fontFamily:mono,textTransform:"uppercase",letterSpacing:"0.08em"}}>
                        Real Estate
                      </span>
                    </div>
                </div>
              );
            })}
          </div>

          {/* Description for selected class */}
          <div style={{padding:"0.875rem",background:"rgba(255,255,255,0.02)",
            border:"1px solid rgba(255,255,255,0.06)",borderRadius:"7px",
            marginBottom:"1.25rem"}}>
            <div style={{fontSize:"0.36rem",fontWeight:700,color:`${cfg.color}80`,
              fontFamily:mono,textTransform:"uppercase",letterSpacing:"0.1em",
              marginBottom:"0.3rem"}}>{assetClass} · {cfg.category}</div>
            <div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.4)",lineHeight:1.65}}>
              {cfg.description}
            </div>
            {(assetClass==="Property"||assetClass==="Short-Term Rental")&&(
              <div style={{marginTop:"0.625rem",padding:"0.5rem",
                background:"rgba(20,241,149,0.05)",
                border:"1px solid rgba(20,241,149,0.15)",borderRadius:"5px"}}>
                <div style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.7)",lineHeight:1.65}}>
                  Real estate tokenization unlocks DeFi capital without selling your property.
                  Tokenize your cabin, rental, or home to access USDC liquidity at 5.2% APR —
                  while continuing to earn rental income.
                </div>
              </div>
          </div>

          {/* Image upload */}
          <div style={{marginBottom:"1.25rem"}}>
            <div style={labelStyle()}>Asset Photo (optional)</div>
            <div onClick={()=>fileRef.current?.click()} style={{
              height:120,borderRadius:"7px",cursor:"pointer",
              border:`2px dashed ${preview?"rgba(20,241,149,0.3)":"rgba(255,255,255,0.1)"}`,
              background:preview?"rgba(20,241,149,0.04)":"rgba(255,255,255,0.02)",
              display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",overflow:"hidden",
              transition:"all 0.15s",
            }}>
              {preview?(
                <img src={preview} alt="preview" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
              ):(
                <>
                  <div style={{fontSize:"1.5rem",opacity:0.2,marginBottom:"0.35rem"}}>↑</div>
                  <div style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.25)"}}>
                    Click to upload image
                  </div>
                  <div style={{fontSize:"0.4rem",color:"rgba(255,255,255,0.15)",marginTop:3,fontFamily:mono}}>
                    JPG, PNG, HEIC supported
                  </div>
                </>
            </div>
            <input ref={fileRef} type="file" accept="image/*"
              onChange={onFile} style={{display:"none"}}/>
          </div>

          <button onClick={()=>setStep("metadata")} style={{
            width:"100%",padding:"0.875rem",borderRadius:"7px",border:"none",
            cursor:"pointer",fontWeight:800,fontSize:"0.64rem",
            fontFamily:mono,letterSpacing:"0.04em",
            background:"linear-gradient(135deg,#7c3aed,#C8A96E)",color:"#fff"}}>
            Continue with {assetClass} →
          </button>
        </div>

      {/* ── STEP 2: METADATA ── */}
      {step==="metadata"&&(
        <div>
          <h2 style={{fontWeight:900,fontSize:"1rem",color:"#f0f0f0",margin:"0 0 0.25rem"}}>
            Asset Details
          </h2>
          <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",margin:"0 0 1.25rem",lineHeight:1.6}}>
            This metadata is hashed and anchored on Solana. It becomes the immutable
            fingerprint of your submission.
          </p>

          <div style={{display:"flex",flexDirection:"column",gap:"0.875rem",marginBottom:"1.25rem"}}>
            <div>
              <div style={labelStyle()}>Asset Name *</div>
              <input value={meta.name} onChange={e=>setMeta(m=>({...m,name:e.target.value}))}
                placeholder={assetClass==="Property"?"123 Main Street, Austin TX":"e.g. Rolex Submariner Ref 5513 1966"}
                style={inputStyle()}/>
            </div>
            <div>
              <div style={labelStyle()}>Description</div>
              <textarea value={meta.description}
                onChange={e=>setMeta(m=>({...m,description:e.target.value}))}
                placeholder={
                  assetClass==="Property"
                    ? "3-bed, 2-bath cabin with private lake access. Listed on Airbnb. $180/night avg rate."
                    : "Condition, serial numbers, notable features, acquisition details..."
                }
                style={{...inputStyle(),minHeight:80,resize:"vertical" as const}}/>
            </div>
            {(assetClass==="Property"||assetClass==="Short-Term Rental")&&(
              <div style={{padding:"0.875rem",background:"rgba(20,241,149,0.04)",
                border:"1px solid rgba(20,241,149,0.12)",borderRadius:"7px"}}>
                <div style={{fontSize:"0.38rem",fontWeight:700,color:"rgba(20,241,149,0.5)",
                  fontFamily:mono,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"0.5rem"}}>
                  Real Estate Documents Required
                </div>
                {["Title deed or ownership certificate",
                  "Recent property appraisal (within 12 months)",
                  "Property photo documentation",
                  "Rental income records (if applicable)"
                ].map((doc,i)=>(
                  <div key={i} style={{display:"flex",gap:"0.4rem",
                    marginBottom:i<3?"0.3rem":0}}>
                    <span style={{fontSize:"0.44rem",color:"rgba(20,241,149,0.5)",
                      fontFamily:mono,flexShrink:0}}>
                      {String(i+1).padStart(2,"0")}
                    </span>
                    <span style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.35)"}}>{doc}</span>
                  </div>
                ))}
              </div>
            {(assetClass==="Watches"||assetClass==="Spirits"||assetClass==="Cards (PSA/BGS)"||assetClass==="Comics (CGC)")&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.625rem"}}>
                <div>
                  <div style={labelStyle()}>Grade / Certification</div>
                  <input value={meta.grade} onChange={e=>setMeta(m=>({...m,grade:e.target.value}))}
                    placeholder="PSA 10 / CGC 9.8" style={inputStyle()}/>
                </div>
                <div>
                  <div style={labelStyle()}>Year / Vintage</div>
                  <input value={meta.year} onChange={e=>setMeta(m=>({...m,year:e.target.value}))}
                    placeholder="1986" style={inputStyle()}/>
                </div>
              </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            <button onClick={()=>setStep("upload")} style={{
              padding:"0.75rem",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer",fontWeight:700,fontSize:"0.58rem",fontFamily:mono,
              background:"transparent",color:"rgba(255,255,255,0.4)"}}>
              Back
            </button>
            <button onClick={()=>setStep("valuation")} disabled={!meta.name.trim()}
              style={{padding:"0.75rem",borderRadius:"7px",border:"none",
                cursor:meta.name.trim()?"pointer":"not-allowed",fontWeight:700,
                fontSize:"0.58rem",fontFamily:mono,
                background:meta.name.trim()?"#7c3aed":"rgba(255,255,255,0.07)",
                color:meta.name.trim()?"#fff":"rgba(255,255,255,0.3)"}}>
              Continue →
            </button>
          </div>
        </div>

      {/* ── STEP 3: VALUATION ── */}
      {step==="valuation"&&(
        <div>
          <h2 style={{fontWeight:900,fontSize:"1rem",color:"#f0f0f0",margin:"0 0 0.25rem"}}>
            Declared Value
          </h2>
          <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",margin:"0 0 1.25rem",lineHeight:1.6}}>
            Enter the declared USD value. This determines your borrowing power once verified.
            Overstated values will be flagged during custody verification.
          </p>

          <div style={{marginBottom:"1.25rem"}}>
            <div style={labelStyle()}>Estimated Value (USD)</div>
            <div style={{position:"relative" as const}}>
              <span style={{position:"absolute" as const,left:"0.75rem",top:"50%",
                transform:"translateY(-50%)",fontSize:"0.6rem",color:"rgba(255,255,255,0.4)",
                fontFamily:mono}}>$</span>
              <input type="number" value={estUsd||""} min={0}
                onChange={e=>setEstUsd(Math.max(0,Number(e.target.value)))}
                placeholder={
                  assetClass==="Property"||assetClass==="Short-Term Rental"
                    ? "350000" : "12500"
                }
                style={{...inputStyle(),paddingLeft:"1.5rem"}}/>
            </div>
          </div>

          {estUsd>0&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,
              background:"rgba(255,255,255,0.06)",borderRadius:"7px",overflow:"hidden",
              marginBottom:"1.25rem"}}>
              {([
                ["Declared",    `$${estUsd.toLocaleString()}`,"#f0f0f0"],
                ["LTV Cap",     `${cfg.ltv}%`,                "#FBBF24"],
                ["Max Borrow",  `$${Math.round(estUsd*cfg.ltv/100).toLocaleString()} USDC`,"#14F195"],
              ] as [string,string,string][]).map(([l,v,c])=>(
                <div key={l} style={{padding:"0.75rem",background:"rgba(6,8,16,0.98)"}}>
                  <div style={{fontSize:"0.72rem",fontWeight:900,color:c,
                    fontFamily:mono,lineHeight:1,marginBottom:3}}>{v}</div>
                  <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",
                    fontFamily:mono,textTransform:"uppercase",letterSpacing:"0.1em"}}>{l}</div>
                </div>
              ))}
            </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            <button onClick={()=>setStep("metadata")} style={{
              padding:"0.75rem",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer",fontWeight:700,fontSize:"0.58rem",fontFamily:mono,
              background:"transparent",color:"rgba(255,255,255,0.4)"}}>Back</button>
            <button onClick={()=>setStep("wallet")} style={{
              padding:"0.75rem",borderRadius:"7px",border:"none",cursor:"pointer",
              fontWeight:700,fontSize:"0.58rem",fontFamily:mono,
              background:"#7c3aed",color:"#fff"}}>Continue →</button>
          </div>
        </div>

      {/* ── STEP 4: WALLET ── */}
      {step==="wallet"&&(
        <div>
          <h2 style={{fontWeight:900,fontSize:"1rem",color:"#f0f0f0",margin:"0 0 0.25rem"}}>
            Connect Wallet
          </h2>
          <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",margin:"0 0 1.25rem",lineHeight:1.6}}>
            Your wallet is bound to this tokenized position.
            The signing address becomes the on-chain owner of the Token-2022 asset.
          </p>

          {!connected?(
            <div style={{textAlign:"center" as const,padding:"2rem",
              border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",
              marginBottom:"1.25rem"}}>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:"rgba(255,255,255,0.3)",
                marginBottom:"0.5rem"}}>Wallet not connected</div>
              <div style={{fontSize:"0.48rem",color:"rgba(255,255,255,0.18)",
                marginBottom:"1rem",lineHeight:1.6}}>
                Connect Phantom or Solflare to bind your wallet to this issuance.
              </div>
              <button onClick={()=>setVisible(true)} style={{
                padding:"0.7rem 1.4rem",borderRadius:"6px",border:"none",
                cursor:"pointer",fontWeight:800,fontSize:"0.6rem",fontFamily:mono,
                background:"#7c3aed",color:"#fff"}}>Connect Wallet</button>
              <div style={{marginTop:"0.875rem",fontSize:"0.42rem",
                color:"rgba(255,255,255,0.15)",fontFamily:mono}}>
                Continuing without wallet uses demo mode — no on-chain transaction
              </div>
              <button onClick={()=>setStep("fee")} style={{
                marginTop:"0.5rem",padding:"0.4rem 0.875rem",borderRadius:"5px",
                border:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",
                fontWeight:600,fontSize:"0.48rem",fontFamily:mono,
                background:"transparent",color:"rgba(255,255,255,0.3)"}}>
                Continue in demo mode
              </button>
            </div>
          ):(
            <div style={{padding:"1rem",border:"1px solid rgba(20,241,149,0.2)",
              borderRadius:"8px",background:"rgba(20,241,149,0.04)",
              marginBottom:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:"0.5rem"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:"#14F195"}}/>
                <span style={{fontSize:"0.52rem",fontWeight:700,color:"#14F195",fontFamily:mono}}>
                  Wallet Connected
                </span>
              </div>
              <div style={{fontSize:"0.46rem",color:"rgba(255,255,255,0.5)",
                fontFamily:mono,wordBreak:"break-all" as const}}>
                {publicKey?.toBase58()}
              </div>
              <div style={{marginTop:"0.5rem",fontSize:"0.44rem",
                color:"rgba(255,255,255,0.3)"}}>
                This address will own the Token-2022 position on Solana.
              </div>
            </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            <button onClick={()=>setStep("valuation")} style={{
              padding:"0.75rem",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer",fontWeight:700,fontSize:"0.58rem",fontFamily:mono,
              background:"transparent",color:"rgba(255,255,255,0.4)"}}>Back</button>
            <button onClick={()=>setStep("fee")} style={{
              padding:"0.75rem",borderRadius:"7px",border:"none",cursor:"pointer",
              fontWeight:700,fontSize:"0.58rem",fontFamily:mono,
              background:"#7c3aed",color:"#fff"}}>Continue →</button>
          </div>
        </div>

      {/* ── STEP 5: FEE + PAYMENT ── */}
      {step==="fee"&&(
        <div>
          <h2 style={{fontWeight:900,fontSize:"1rem",color:"#f0f0f0",margin:"0 0 0.25rem"}}>
            Issuance Fee
          </h2>
          <p style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.3)",margin:"0 0 1.25rem",lineHeight:1.6}}>
            The protocol charges a one-time issuance fee routed to the Abraxas treasury.
            This funds the verification pipeline and custody coordination.
          </p>

          {/* Payment method selector */}
          <div style={{marginBottom:"1rem"}}>
            <div style={labelStyle()}>Payment Method</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,
              background:"rgba(255,255,255,0.06)",borderRadius:"6px",overflow:"hidden"}}>
              {([
                ["abra","Pay with ABRA"],
                ["sol", "Pay with SOL (coming)"],
              ] as [PayMethod,string][]).map(([id,label])=>(
                <button key={id} onClick={()=>setPayMethod(id)}
                  disabled={id==="sol"}
                  style={{padding:"0.6rem",border:"none",
                    cursor:id==="sol"?"not-allowed":"pointer",
                    fontFamily:mono,fontSize:"0.48rem",fontWeight:700,
                    background:payMethod===id?"rgba(124,58,237,0.15)":"rgba(6,8,16,0.98)",
                    color:id==="sol"?"rgba(255,255,255,0.2)":payMethod===id?"#a78bfa":"rgba(255,255,255,0.35)",
                    borderBottom:payMethod===id?"2px solid #7c3aed":"2px solid transparent",
                    transition:"all 0.15s"}}>
                  {label}
                </button>
              ))}
            </div>
            {payMethod==="sol"&&(
              <div style={{marginTop:"0.4rem",fontSize:"0.42rem",
                color:"rgba(255,255,255,0.3)",fontFamily:mono}}>
                SOL payment via X402 protocol — launching soon
              </div>
          </div>

          {/* Fee breakdown */}
          <div style={{padding:"1rem",border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"7px",marginBottom:"1rem"}}>
            {([
              [`${assetClass} Issuance`, `${fee - 10} ABRA`],
              ["Verification Queue",    "10 ABRA"],
            ]).map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",
                padding:"0.35rem 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:"0.5rem",color:"rgba(255,255,255,0.35)"}}>{k}</span>
                <span style={{fontSize:"0.52rem",fontWeight:700,color:"rgba(255,255,255,0.6)",
                  fontFamily:mono}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:"0.5rem"}}>
              <span style={{fontSize:"0.56rem",fontWeight:700,color:"#f0f0f0"}}>Total</span>
              <span style={{fontSize:"0.68rem",fontWeight:900,color:"#C8A96E",fontFamily:mono}}>
                {fee} ABRA
              </span>
            </div>
          </div>

          {/* Balance */}
          <div style={{padding:"0.75rem 0.875rem",
            background:canAfford?"rgba(20,241,149,0.04)":"rgba(242,107,107,0.04)",
            border:`1px solid ${canAfford?"rgba(20,241,149,0.2)":"rgba(242,107,107,0.2)"}`,
            borderRadius:"7px",marginBottom:"1rem",
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.3)",
                fontFamily:mono,textTransform:"uppercase" as const,letterSpacing:"0.1em",marginBottom:2}}>
                {connected?"Wallet Balance":"Demo Balance"}
              </div>
              <div style={{fontSize:"0.72rem",fontWeight:900,
                color:canAfford?"#14F195":"#f26b6b",fontFamily:mono}}>
                {balLoading?"…":displayBal.toLocaleString()} ABRA
              </div>
            </div>
            {!canAfford&&(
              <div style={{textAlign:"right" as const}}>
                <div style={{fontSize:"0.44rem",color:"#f26b6b",fontFamily:mono}}>
                  Need {(fee-displayBal).toLocaleString()} more
                </div>
                <a href={`https://jup.ag/swap/SOL-5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS`}
                  target="_blank" rel="noopener noreferrer"
                  style={{fontSize:"0.4rem",color:"#6b8cff",fontFamily:mono,textDecoration:"none"}}>
                  Buy ABRA on Jupiter →
                </a>
              </div>
          </div>

          {errorMsg&&(
            <div style={{padding:"0.625rem 0.875rem",background:"rgba(242,107,107,0.08)",
              border:"1px solid rgba(242,107,107,0.25)",borderRadius:"6px",
              marginBottom:"0.875rem",fontSize:"0.48rem",color:"#f26b6b",lineHeight:1.5}}>
              {errorMsg}
            </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            <button onClick={()=>setStep("wallet")} style={{
              padding:"0.75rem",borderRadius:"7px",border:"1px solid rgba(255,255,255,0.1)",
              cursor:"pointer",fontWeight:700,fontSize:"0.58rem",fontFamily:mono,
              background:"transparent",color:"rgba(255,255,255,0.4)"}}>Back</button>
            <button onClick={executeMint} disabled={!canAfford} style={{
              padding:"0.75rem",borderRadius:"7px",border:"none",
              cursor:canAfford?"pointer":"not-allowed",fontWeight:800,
              fontSize:"0.58rem",fontFamily:mono,
              background:canAfford?"linear-gradient(135deg,#C8A96E,#FBBF24)":"rgba(255,255,255,0.07)",
              color:canAfford?"#000":"rgba(255,255,255,0.2)"}}>
              {canAfford?`Confirm ${fee} ABRA →`:`Insufficient ABRA`}
            </button>
          </div>
        </div>

      {/* ── STEP 6: PROCESSING ── */}
      {step==="processing"&&(
        <div style={{textAlign:"center" as const,padding:"3rem 1rem"}}>
          <div style={{width:48,height:48,borderRadius:"50%",
            border:"2px solid rgba(200,169,110,0.2)",
            borderTop:"2px solid #C8A96E",
            margin:"0 auto 1.25rem",
            animation:"spin 1s linear infinite"}}/>
          <div style={{fontWeight:900,fontSize:"0.9rem",color:"#f0f0f0",marginBottom:"0.35rem"}}>
            {connected?"Broadcasting Transaction":"Processing"}
          </div>
          <div style={{fontSize:"0.52rem",color:"rgba(255,255,255,0.35)",lineHeight:1.65}}>
            {connected
              ? "Signing ABRA transfer and submitting to Solana mainnet."
              : "Creating your asset position in the verification queue."}
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

      {/* ── STEP 7: SUCCESS + PROGRESS ── */}
      {step==="queue"&&mintedAsset&&(
        <TokenizationProgress
          assetName={mintedAsset.name}
          assetClass={mintedAsset.assetClass}
          txSignature={txSig}
          tokenId={mintedAsset.tokenId}
          amountAbra={fee}
          onViewPortfolio={()=>{ if(onSuccess) onSuccess(); }}
        />
      )}
  );
}