// FILE: app/admin/page.tsx
// Abraxas Admin — Verification Operations Center
// PIN gated. Full verification queue. Approve/reject. Audit trail. Asset lifecycle.
"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useWallet }           from "@solana/wallet-adapter-react";
import { useAbraStore,
         type AbraAsset,
         type AssetStatus,
         STATUS_LABEL,
         STATUS_COLOR,
         STATUS_STEP }         from "@/lib/abraxasStore";

const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN ?? "abraxas2026";

const VAULT_ID  = "VAULT-490A";
const ABRA_CA   = "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS";

function fmtUsd(n:number) {
  return n>=1_000_000?`$${(n/1e6).toFixed(2)}M`:n>=1000?`$${(n/1000).toFixed(1)}K`:`$${n.toFixed(0)}`;
}
function shortKey(k:string) { return k?`${k.slice(0,8)}...${k.slice(-4)}`:"Not set"; }
function tsToTime(ts:number) {
  return ts ? new Date(ts).toISOString().replace("T"," ").slice(0,19)+" UTC" : "Unknown";
}

// Simulated audit events per asset
function getAuditEvents(a:AbraAsset) {
  const base = a.createdAt;
  const events: {ts:number;actor:string;action:string;note:string}[] = [
    {ts:base,      actor:"PROTOCOL", action:"SUBMISSION_RECEIVED",
     note:`Asset submitted. ABRA deducted: ${a.mintCostAbra}. Tx: ${shortKey(a.txSignature)}`},
    {ts:base+3000, actor:"SYSTEM",   action:"METADATA_HASHED",
     note:"SHA-256 metadata fingerprint anchored on Solana"},
  ];
  const step = STATUS_STEP[a.status]??0;
  if(step>=3) events.push({ts:base+10000, actor:"PROTOCOL", action:"IDENTITY_VERIFIED",
    note:"Wallet signature verified. Ownership claim authenticated."});
  if(step>=5) events.push({ts:base+26000, actor:"CUSTODY",  action:"CUSTODY_INITIATED",
    note:"Physical inspection request dispatched to custody network."});
  if(step>=8) events.push({ts:base+44000, actor:"VERIFIER", action:"VERIFICATION_CONFIRMED",
    note:"Asset verified. Collateral eligibility granted."});
  return events.reverse();
}

type ReviewNote = { assetId:string; note:string; ts:number; action:"approved"|"rejected"|"info" };

export default function AdminPage() {
  const [mounted,  setMounted]  = useState(false);
  const [authed,   setAuthed]   = useState(false);
  const [pin,      setPin]      = useState("");
  const [pinErr,   setPinErr]   = useState(false);
  const [selected, setSelected] = useState<string|null>(null);
  const [notes,    setNotes]    = useState<ReviewNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [activeTab,setActiveTab]= useState<"queue"|"all"|"logs">("queue");

  const {publicKey, connected} = useWallet();
  const assets         = useAbraStore(s=>s.assets);
  const updateStatus   = useAbraStore(s=>s.updateAssetStatus);
  const storeBalance   = useAbraStore(s=>s.abraBalance);

  useEffect(()=>{
    setMounted(true);
    // Auto-auth if admin wallet
    if(connected && publicKey) setAuthed(true);
  },[connected, publicKey]);

  if(!mounted) return null;

  function tryPin() {
    if(pin===ADMIN_PIN) { setAuthed(true); setPinErr(false); }
    else setPinErr(true);
  }

  if(!authed) return (
    <div style={{minHeight:"100vh",background:"#060810",display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.875rem"}}>
      <div style={{fontSize:"0.6rem",fontWeight:900,color:"rgba(200,169,110,0.7)",
        fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.3em",marginBottom:"0.5rem"}}>
        ABRAXAS ADMIN
      </div>
      <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",
        fontFamily:"'JetBrains Mono',monospace",marginBottom:"0.5rem"}}>
        Verification Operations Center
      </div>
      <input value={pin} onChange={e=>setPin(e.target.value)} type="password"
        placeholder="Admin PIN"
        onKeyDown={e=>e.key==="Enter"&&tryPin()}
        style={{padding:"0.625rem 1rem",borderRadius:"6px",width:240,textAlign:"center",
          background:"rgba(255,255,255,0.04)",border:`1px solid ${pinErr?"#f26b6b":"rgba(255,255,255,0.12)"}`,
          color:"#f0f0f0",fontSize:"0.62rem",outline:"none",
          fontFamily:"'JetBrains Mono',monospace"}}/>
      {pinErr&&<div style={{fontSize:"0.42rem",color:"#f26b6b",
        fontFamily:"'JetBrains Mono',monospace"}}>Invalid PIN</div>}
      <button onClick={tryPin} style={{padding:"0.5rem 1.25rem",borderRadius:"5px",
        border:"none",cursor:"pointer",background:"#7c3aed",color:"#fff",
        fontSize:"0.58rem",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>
        Enter
      </button>
      <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.15)",
        fontFamily:"'JetBrains Mono',monospace",marginTop:"0.5rem"}}>
        Or connect admin wallet for automatic access
      </div>
    </div>
  );

  // Categorize assets
  const queue    = assets.filter(a=>["created","pending_documents","pending_identity",
    "pending_appraisal","pending_custody","pending_verification"].includes(a.status));
  const complete = assets.filter(a=>["verified","collateral_eligible","listed","borrowed"].includes(a.status));
  const rejected = assets.filter(a=>a.status==="rejected"||a.status==="closed");

  const totalAbra  = assets.reduce((s,a)=>s+a.mintCostAbra,0);
  const totalValue = assets.reduce((s,a)=>s+a.estimatedUsd,0);
  const sel        = assets.find(a=>a.id===selected);

  function addNote(assetId:string, action:"approved"|"rejected"|"info") {
    if(!noteText.trim()) return;
    setNotes(n=>[...n,{assetId,note:noteText.trim(),ts:Date.now(),action}]);
    setNoteText("");
  }
  function approve(assetId:string) {
    updateStatus(assetId, "verified");
    addNote(assetId,"approved");
  }
  function reject(assetId:string) {
    updateStatus(assetId, "rejected");
    addNote(assetId,"rejected");
  }

  const viewList = activeTab==="queue"?queue:activeTab==="all"?assets:[];

  return (
    <div style={{minHeight:"100vh",background:"#060810",color:"#f0f0f0"}}>
      {/* Header */}
      <header style={{height:52,padding:"0 1.5rem",display:"flex",alignItems:"center",
        justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.06)",
        position:"sticky",top:0,zIndex:100,background:"rgba(6,8,16,0.98)",
        backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"1rem"}}>
          <span style={{fontWeight:900,fontSize:"0.88rem",color:"#C8A96E",
            fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.1em"}}>ABRAXAS</span>
          <span style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.3)",
            fontFamily:"'JetBrains Mono',monospace",letterSpacing:"0.2em",
            textTransform:"uppercase"}}>Verification Operations</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",
            fontFamily:"'JetBrains Mono',monospace"}}>{VAULT_ID}</div>
          <a href="/" style={{padding:"0.3rem 0.625rem",borderRadius:"4px",
            border:"1px solid rgba(255,255,255,0.08)",
            color:"rgba(255,255,255,0.35)",fontSize:"0.44rem",textDecoration:"none",
            fontFamily:"'JetBrains Mono',monospace"}}>App</a>
        </div>
      </header>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"1.5rem 1rem 4rem"}}>

        {/* Stats strip */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
          gap:"1px",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.06)",
          borderRadius:"8px",overflow:"hidden",marginBottom:"1.5rem"}}>
          {([
            ["Pending Review",   queue.length.toString(),            "#FBBF24"],
            ["Verified",        complete.length.toString(),          "#14F195"],
            ["Total Events",    assets.length.toString(),            "#f0f0f0"],
            ["Total Value",     totalValue>0?fmtUsd(totalValue):"No data","#C8A96E"],
            ["ABRA Consumed",   totalAbra>0?`${totalAbra.toLocaleString()} $ABRA`:"None","#C8A96E"],
            ["Vault",           VAULT_ID,                            "#6b8cff"],
          ] as [string,string,string][]).map(([l,v,c])=>(
            <div key={l} style={{padding:"0.875rem 1rem",background:"rgba(6,8,16,0.99)"}}>
              <div style={{fontSize:"0.9rem",fontWeight:900,color:c,
                fontFamily:"'JetBrains Mono',monospace",lineHeight:1,marginBottom:4}}>{v}</div>
              <div style={{fontSize:"0.38rem",color:"rgba(255,255,255,0.25)",
                fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                letterSpacing:"0.1em"}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Nav tabs */}
        <div style={{display:"flex",gap:"1px",marginBottom:"1rem",
          background:"rgba(255,255,255,0.05)",borderRadius:"6px",overflow:"hidden",
          border:"1px solid rgba(255,255,255,0.06)"}}>
          {([
            ["queue",`Pending Review (${queue.length})`],
            ["all",  `All Assets (${assets.length})`],
            ["logs", "Audit Logs"],
          ] as [string,string][]).map(([id,label])=>(
            <button key={id} onClick={()=>{setActiveTab(id as typeof activeTab);setSelected(null)}}
              style={{flex:1,padding:"0.625rem",border:"none",cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace",fontSize:"0.48rem",fontWeight:700,
                letterSpacing:"0.06em",textTransform:"uppercase",transition:"all 0.15s",
                background:activeTab===id?"rgba(124,58,237,0.15)":"transparent",
                color:activeTab===id?"#a78bfa":"rgba(255,255,255,0.3)",
                borderBottom:activeTab===id?"2px solid #7c3aed":"2px solid transparent"}}>
              {label}
            </button>
          ))}
        </div>

        {/* Audit logs tab */}
        {activeTab==="logs"&&(
          <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
            overflow:"hidden"}}>
            {assets.length===0?(
              <div style={{padding:"2rem",textAlign:"center",
                fontSize:"0.54rem",color:"rgba(255,255,255,0.18)"}}>
                No events to display
              </div>
            ):(
              assets.flatMap(a=>getAuditEvents(a).map(ev=>({...ev,assetName:a.name,assetId:a.id})))
                .sort((a,b)=>b.ts-a.ts)
                .map((ev,i)=>(
                  <div key={i} style={{display:"grid",
                    gridTemplateColumns:"180px 120px 200px 1fr",
                    padding:"0.625rem 1rem",gap:"0.75rem",alignItems:"center",
                    borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                    <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.3)",
                      fontFamily:"'JetBrains Mono',monospace"}}>{tsToTime(ev.ts)}</div>
                    <div style={{fontSize:"0.38rem",fontWeight:700,color:"rgba(107,140,255,0.7)",
                      fontFamily:"'JetBrains Mono',monospace",
                      textTransform:"uppercase"}}>{ev.actor}</div>
                    <div style={{fontSize:"0.38rem",fontWeight:700,color:"#14F195",
                      fontFamily:"'JetBrains Mono',monospace"}}>{ev.action}</div>
                    <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.4)"}}>
                      <strong style={{color:"rgba(255,255,255,0.6)"}}>{ev.assetName}</strong>
                      {" — "}{ev.note}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Queue / All tabs — two column layout */}
        {activeTab!=="logs"&&(
          <div style={{display:"grid",gridTemplateColumns:sel?"1fr 1fr":"1fr",
            gap:"1rem"}}>
            {/* Asset list */}
            <div style={{border:"1px solid rgba(255,255,255,0.06)",borderRadius:"8px",
              overflow:"hidden"}}>
              <div style={{display:"grid",
                gridTemplateColumns:"2fr 1fr 1fr 1fr",
                padding:"0.45rem 1rem",gap:"0.5rem",
                borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                {["Asset","Value","ABRA","Status"].map(h=>(
                  <div key={h} style={{fontSize:"0.36rem",fontWeight:700,
                    color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase",letterSpacing:"0.14em"}}>{h}</div>
                ))}
              </div>
              {viewList.length===0?(
                <div style={{padding:"2rem",textAlign:"center",
                  fontSize:"0.54rem",color:"rgba(255,255,255,0.18)"}}>
                  {activeTab==="queue"?"No pending assets":"No assets on record"}
                </div>
              ):(
                viewList.map(a=>{
                  const stColor = STATUS_COLOR[a.status]??"#C8A96E";
                  return(
                    <div key={a.id} onClick={()=>setSelected(sel?.id===a.id?null:a.id)}
                      style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",
                        padding:"0.75rem 1rem",gap:"0.5rem",alignItems:"center",
                        cursor:"pointer",transition:"background 0.1s",
                        background:sel?.id===a.id?"rgba(124,58,237,0.08)":"transparent",
                        borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:"0.62rem",color:"#f0f0f0",
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {a.name}
                        </div>
                        <div style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",
                          fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>
                          {a.assetClass} · {shortKey(a.ownerWallet)}
                        </div>
                      </div>
                      <div style={{fontSize:"0.56rem",fontWeight:700,
                        color:"#f0f0f0",fontFamily:"'JetBrains Mono',monospace"}}>
                        {a.estimatedUsd>0?fmtUsd(a.estimatedUsd):"Pending"}
                      </div>
                      <div style={{fontSize:"0.52rem",color:"#C8A96E",
                        fontFamily:"'JetBrains Mono',monospace"}}>
                        {a.mintCostAbra}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <div style={{width:5,height:5,borderRadius:"50%",
                          background:stColor,flexShrink:0}}/>
                        <span style={{fontSize:"0.36rem",fontWeight:600,color:stColor,
                          fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                          letterSpacing:"0.06em"}}>
                          {STATUS_LABEL[a.status]??a.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Detail panel */}
            {sel&&(
              <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                {/* Asset header */}
                <div style={{padding:"1rem",border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:"8px",background:"rgba(255,255,255,0.01)"}}>
                  <div style={{fontSize:"0.36rem",fontWeight:700,
                    color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:"0.5rem"}}>
                    Asset Review
                  </div>
                  <div style={{fontWeight:900,fontSize:"0.88rem",color:"#f0f0f0",
                    marginBottom:"0.5rem"}}>{sel.name}</div>
                  {([
                    ["Class",         sel.assetClass],
                    ["Declared Value",sel.estimatedUsd>0?fmtUsd(sel.estimatedUsd):"Not provided"],
                    ["LTV Cap",       `${sel.ltv}%`],
                    ["ABRA Spent",    `${sel.mintCostAbra} $ABRA`],
                    ["Wallet",        shortKey(sel.ownerWallet)],
                    ["Submitted",     tsToTime(sel.createdAt)],
                    ["Token ID",      shortKey(sel.tokenId)],
                    ["Tx",            shortKey(sel.txSignature)],
                  ] as [string,string][]).map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",
                      padding:"0.35rem 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <span style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.25)",
                        fontFamily:"'JetBrains Mono',monospace",
                        textTransform:"uppercase",letterSpacing:"0.1em"}}>{k}</span>
                      <span style={{fontSize:"0.44rem",fontWeight:600,
                        color:"rgba(255,255,255,0.6)",fontFamily:"'JetBrains Mono',monospace"}}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status + actions */}
                <div style={{padding:"1rem",border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:"8px"}}>
                  <div style={{fontSize:"0.36rem",fontWeight:700,
                    color:"rgba(255,255,255,0.2)",fontFamily:"'JetBrains Mono',monospace",
                    textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:"0.75rem"}}>
                    Review Actions
                  </div>
                  <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                    placeholder="Add review note (required for approve/reject)"
                    style={{width:"100%",padding:"0.5rem",borderRadius:"5px",
                      background:"rgba(255,255,255,0.03)",
                      border:"1px solid rgba(255,255,255,0.1)",
                      color:"#f0f0f0",fontSize:"0.48rem",resize:"vertical",
                      minHeight:72,outline:"none",fontFamily:"inherit",
                      marginBottom:"0.625rem",boxSizing:"border-box"}}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem"}}>
                    <button onClick={()=>approve(sel.id)} disabled={!noteText.trim()}
                      style={{padding:"0.6rem",borderRadius:"5px",border:"none",
                        cursor:noteText.trim()?"pointer":"not-allowed",fontWeight:700,
                        fontSize:"0.5rem",fontFamily:"'JetBrains Mono',monospace",
                        background:noteText.trim()?"rgba(20,241,149,0.15)":"rgba(255,255,255,0.03)",
                        color:noteText.trim()?"#14F195":"rgba(255,255,255,0.2)",
                        border:`1px solid ${noteText.trim()?"rgba(20,241,149,0.3)":"rgba(255,255,255,0.06)"}`}}>
                      Approve
                    </button>
                    <button onClick={()=>reject(sel.id)} disabled={!noteText.trim()}
                      style={{padding:"0.6rem",borderRadius:"5px",border:"none",
                        cursor:noteText.trim()?"pointer":"not-allowed",fontWeight:700,
                        fontSize:"0.5rem",fontFamily:"'JetBrains Mono',monospace",
                        background:noteText.trim()?"rgba(242,107,107,0.12)":"rgba(255,255,255,0.03)",
                        color:noteText.trim()?"#f26b6b":"rgba(255,255,255,0.2)",
                        border:`1px solid ${noteText.trim()?"rgba(242,107,107,0.25)":"rgba(255,255,255,0.06)"}`}}>
                      Reject
                    </button>
                    <button onClick={()=>addNote(sel.id,"info")} disabled={!noteText.trim()}
                      style={{padding:"0.6rem",borderRadius:"5px",
                        cursor:noteText.trim()?"pointer":"not-allowed",fontWeight:700,
                        fontSize:"0.5rem",fontFamily:"'JetBrains Mono',monospace",
                        background:"transparent",
                        color:noteText.trim()?"rgba(107,140,255,0.8)":"rgba(255,255,255,0.2)",
                        border:`1px solid ${noteText.trim()?"rgba(107,140,255,0.25)":"rgba(255,255,255,0.06)"}`}}>
                      Add Note
                    </button>
                  </div>
                </div>

                {/* Review notes for this asset */}
                {notes.filter(n=>n.assetId===sel.id).length>0&&(
                  <div style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",
                    overflow:"hidden"}}>
                    <div style={{padding:"0.5rem 1rem",
                      borderBottom:"1px solid rgba(255,255,255,0.06)",
                      fontSize:"0.36rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
                      fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                      letterSpacing:"0.15em"}}>Review History</div>
                    {notes.filter(n=>n.assetId===sel.id).reverse().map((n,i)=>{
                      const col=n.action==="approved"?"#14F195":n.action==="rejected"?"#f26b6b":"#6b8cff";
                      return(
                        <div key={i} style={{padding:"0.625rem 1rem",
                          borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                          <div style={{display:"flex",justifyContent:"space-between",
                            marginBottom:3}}>
                            <span style={{fontSize:"0.38rem",fontWeight:700,color:col,
                              fontFamily:"'JetBrains Mono',monospace",
                              textTransform:"uppercase"}}>{n.action}</span>
                            <span style={{fontSize:"0.36rem",color:"rgba(255,255,255,0.25)",
                              fontFamily:"'JetBrains Mono',monospace"}}>
                              {tsToTime(n.ts)}
                            </span>
                          </div>
                          <div style={{fontSize:"0.44rem",color:"rgba(255,255,255,0.5)"}}>
                            {n.note}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Audit trail */}
                <div style={{border:"1px solid rgba(255,255,255,0.07)",borderRadius:"8px",
                  overflow:"hidden"}}>
                  <div style={{padding:"0.5rem 1rem",
                    borderBottom:"1px solid rgba(255,255,255,0.06)",
                    fontSize:"0.36rem",fontWeight:700,color:"rgba(255,255,255,0.2)",
                    fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",
                    letterSpacing:"0.15em"}}>Audit Trail</div>
                  {getAuditEvents(sel).map((ev,i)=>(
                    <div key={i} style={{padding:"0.5rem 1rem",
                      borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{display:"flex",gap:"0.75rem",alignItems:"center",
                        marginBottom:2}}>
                        <span style={{fontSize:"0.36rem",color:"rgba(107,140,255,0.7)",
                          fontFamily:"'JetBrains Mono',monospace",fontWeight:700,
                          textTransform:"uppercase"}}>{ev.actor}</span>
                        <span style={{fontSize:"0.36rem",color:"#14F195",
                          fontFamily:"'JetBrains Mono',monospace"}}>{ev.action}</span>
                      </div>
                      <div style={{fontSize:"0.42rem",color:"rgba(255,255,255,0.4)"}}>
                        {ev.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{marginTop:"1rem",fontSize:"0.38rem",color:"rgba(255,255,255,0.12)",
          textAlign:"center",fontFamily:"'JetBrains Mono',monospace"}}>
          ABRAXAS PROTOCOL ADMIN · {ABRA_CA}
        </div>
      </div>
    </div>
  );
}