// FILE: components/terminal/TerminalLayout.tsx
// 3-column terminal shell. Left: asset ledger. Center: inspector. Right: underwriting.
// Mobile: stacks vertically. Desktop: fixed-width columns.
"use client";

import { useState }             from "react";
import { useWallet }            from "@solana/wallet-adapter-react";
import { useWalletModal }       from "@solana/wallet-adapter-react-ui";
import { useAbraStore }         from "@/lib/abraxasStore";
import { TerminalHeader }       from "@/components/terminal/TerminalHeader";
import { CryptographicProof }   from "@/components/inspection/CryptographicProof";
import { UnderwritingEngine }   from "@/components/inspection/UnderwritingEngine";
import { LanguageSelector }     from "@/components/LanguageSelector";
import { CompactWallet }        from "@/components/CompactWallet";
import { IssuanceEngine }       from "@/components/IssuanceEngine";
import { BorrowPage }           from "@/components/BorrowPage";

const M  = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const BG = "#0C0E12";
const CARD = "#0E1117";
const BORDER = "#1F2937";

const STATUS_COLOR: Record<string, string> = {
  verified:"#10B981", collateral_eligible:"#10B981", borrowed:"#3182CE",
  pending_verification:"#ED8936", pending_custody:"#ED8936",
  pending_appraisal:"#ED8936", pending_documents:"#ED8936",
  created:"#ED8936", rejected:"#f26b6b", closed:"rgba(255,255,255,0.2)",
};

type View = "inspect" | "ingest" | "borrow";

export function TerminalLayout() {
  const { connected }           = useWallet();
  const { setVisible }          = useWalletModal();
  const assets                  = useAbraStore(s => s.assets);
  const [selected, setSelected] = useState<number>(0);
  const [view, setView]         = useState<View>("inspect");
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  const asset  = assets[selected];

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                   background:BG, overflow:"hidden" }}>

      {/* Network rail */}
      <TerminalHeader />

      {/* Secondary toolbar */}
      <div style={{
        height:40, background:CARD,
        borderBottom:`1px solid ${BORDER}`,
        display:"flex", alignItems:"center",
        padding:"0 1rem", gap:"0.5rem",
        flexShrink:0,
      }}>
        {/* View tabs */}
        {(["inspect","ingest","borrow"] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{
            padding:"0.25rem 0.75rem", borderRadius:"3px",
            border:`1px solid ${view===v ? "#3182CE" : BORDER}`,
            background: view===v ? "rgba(49,130,206,0.12)" : "transparent",
            color: view===v ? "#3182CE" : "rgba(255,255,255,0.3)",
            fontFamily:M, fontSize:"0.34rem", fontWeight:700,
            cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.1em",
          }}>
            {v === "inspect" ? "ASSET INSPECTOR"
             : v === "ingest" ? "COLLATERAL INGESTION"
             : "CREDIT & BORROW"}
          </button>
        ))}

        <div style={{ flex:1 }}/>
        <LanguageSelector />
        <CompactWallet />
      </div>

      {/* ── 3-column body ─────────────────────────────────────────────── */}
      {view === "inspect" ? (
        <div style={{
          flex:1, display:"flex", overflow:"hidden",
          // Mobile: stack vertically
          flexDirection:"column",
        }}>
          {/* Row on desktop via CSS override via media */}
          <style>{`
            @media(min-width:768px){
              .abr-terminal-columns {
                flex-direction: row !important;
              }
              .abr-col-left  { width:300px; flex-shrink:0; display:flex !important; }
              .abr-col-mid   { flex:1; }
              .abr-col-right { width:360px; flex-shrink:0; display:flex !important; }
              .abr-mobile-tab { display:none !important; }
            }
            @media(max-width:767px){
              .abr-col-left  { display: none; }
              .abr-col-right { display: none; }
              .abr-col-left.active  { display:flex !important; }
              .abr-col-right.active { display:flex !important; }
            }
          `}</style>

          {/* Mobile tab switcher */}
          <div className="abr-mobile-tab" style={{
            display:"flex", borderBottom:`1px solid ${BORDER}`,
            background:CARD, flexShrink:0,
          }}>
            <button onClick={() => setMobilePane("list")} style={{
              flex:1, padding:"0.5rem", background:mobilePane==="list"?"rgba(16,185,129,0.08)":"transparent",
              border:"none", color:mobilePane==="list"?"#10B981":"rgba(255,255,255,0.3)",
              fontFamily:M, fontSize:"0.32rem", fontWeight:700, cursor:"pointer",
              textTransform:"uppercase", letterSpacing:"0.1em",
              borderBottom:mobilePane==="list"?`1px solid #10B981`:"none",
            }}>REGISTRY</button>
            <button onClick={() => setMobilePane("detail")} style={{
              flex:1, padding:"0.5rem", background:mobilePane==="detail"?"rgba(16,185,129,0.08)":"transparent",
              border:"none", color:mobilePane==="detail"?"#10B981":"rgba(255,255,255,0.3)",
              fontFamily:M, fontSize:"0.32rem", fontWeight:700, cursor:"pointer",
              textTransform:"uppercase", letterSpacing:"0.1em",
              borderBottom:mobilePane==="detail"?`1px solid #10B981`:"none",
            }}>INSPECTOR</button>
          </div>

          <div className="abr-terminal-columns" style={{ flex:1, display:"flex", overflow:"hidden" }}>

            {/* ── LEFT: Asset Registry Ledger ──────────────────────────── */}
            <div className={`abr-col-left${mobilePane==="list"?" active":""}`}
              style={{ flexDirection:"column", overflow:"hidden",
                        borderRight:`1px solid ${BORDER}`, background:CARD }}>
              <div style={{ padding:"0.75rem 1rem",
                             borderBottom:`1px solid ${BORDER}`,
                             fontFamily:M, fontSize:"0.3rem",
                             color:"rgba(255,255,255,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.12em" }}>
                ◈ COLLATERAL REGISTRY — {assets.length} ASSET{assets.length !== 1 ? "S" : ""}
              </div>
              <div style={{ flex:1, overflowY:"auto" }}>
                {assets.length === 0 ? (
                  <div style={{ padding:"1.5rem 1rem", fontFamily:M,
                                  fontSize:"0.38rem", color:"rgba(255,255,255,0.2)" }}>
                    NO ASSETS REGISTERED
                  </div>
                ) : (
                  assets.map((a, i) => {
                    const sc = STATUS_COLOR[a.status] ?? "rgba(255,255,255,0.3)";
                    const active = i === selected;
                    return (
                      <button key={a.id} onClick={() => { setSelected(i); setMobilePane("detail"); }}
                        style={{
                          width:"100%", padding:"0.75rem 1rem",
                          background: active ? "rgba(49,130,206,0.08)" : "transparent",
                          border:"none", borderBottom:`1px solid ${BORDER}`,
                          borderLeft:`2px solid ${active ? "#3182CE" : "transparent"}`,
                          cursor:"pointer", textAlign:"left",
                        }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                                       alignItems:"center", marginBottom:3 }}>
                          <span style={{ fontFamily:M, fontSize:"0.38rem",
                                          color:active?"#f0f0f0":"rgba(255,255,255,0.55)",
                                          fontWeight:active?700:400 }}>
                            {a.name?.slice(0,28)}{(a.name?.length ?? 0) > 28 ? "…" : ""}
                          </span>
                          <span style={{ width:6, height:6, borderRadius:"50%",
                                          background:sc, flexShrink:0, display:"inline-block" }}/>
                        </div>
                        <div style={{ fontFamily:M, fontSize:"0.3rem",
                                       color:"rgba(255,255,255,0.2)",
                                       textTransform:"uppercase", letterSpacing:"0.08em" }}>
                          {a.assetClass} · {a.status?.replace(/_/g," ")}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <button
                onClick={() => setView("ingest")}
                style={{
                  margin:"0.75rem", padding:"0.6rem", borderRadius:"4px",
                  background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)",
                  color:"#10B981", fontFamily:M, fontSize:"0.34rem", fontWeight:700,
                  cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.1em",
                }}>
                + REGISTER NEW ASSET
              </button>
            </div>

            {/* ── CENTER: Deep Verification Inspector ──────────────────── */}
            <div className={`abr-col-mid${mobilePane==="detail"?" active":""}`}
              style={{ flex:1, overflowY:"auto", padding:"1rem",
                        background:BG }}>
              {!asset ? (
                <div style={{ display:"flex", flexDirection:"column",
                               alignItems:"center", justifyContent:"center",
                               height:"100%", gap:"1rem" }}>
                  <span style={{ fontFamily:M, fontSize:"0.44rem",
                                  color:"rgba(255,255,255,0.15)",
                                  textTransform:"uppercase", letterSpacing:"0.12em" }}>
                    SELECT ASSET FROM REGISTRY
                  </span>
                  {!connected && (
                    <button onClick={() => setVisible(true)} style={{
                      padding:"0.75rem 1.5rem", borderRadius:"5px",
                      border:"1px solid rgba(16,185,129,0.25)",
                      background:"rgba(16,185,129,0.06)",
                      color:"#10B981", fontFamily:M, fontSize:"0.38rem",
                      fontWeight:700, cursor:"pointer",
                      textTransform:"uppercase", letterSpacing:"0.1em",
                    }}>
                      LINK WALLET NODE →
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
                  {/* Asset header */}
                  <div style={{ padding:"1rem", background:CARD,
                                  border:`1px solid ${BORDER}`, borderRadius:"6px" }}>
                    <div style={{ fontFamily:M, fontSize:"0.28rem",
                                   color:"rgba(255,255,255,0.2)",
                                   textTransform:"uppercase", letterSpacing:"0.12em",
                                   marginBottom:"0.35rem" }}>
                      REGISTERED COLLATERAL ASSET
                    </div>
                    <div style={{ fontFamily:M, fontSize:"clamp(0.8rem,2.5vw,1.1rem)",
                                   fontWeight:900, color:"#f0f0f0", lineHeight:1.2 }}>
                      {asset.name}
                    </div>
                    <div style={{ fontFamily:M, fontSize:"0.38rem",
                                   color:"rgba(255,255,255,0.3)", marginTop:"0.35rem" }}>
                      {asset.assetClass} · ASSET ID: {asset.id?.slice(0,16).toUpperCase() ?? "—"}
                    </div>
                  </div>

                  {/* Cryptographic proof */}
                  <CryptographicProof asset={{
                    id: asset.id,
                    name: asset.name,
                    tokenId: asset.tokenId,
                    status: asset.status,
                    txSignature: asset.txSignature,
                    createdAt: new Date().toISOString(),
                  }} />
                </div>
              )}
            </div>

            {/* ── RIGHT: Credit & Underwriting Console ─────────────────── */}
            <div className="abr-col-right"
              style={{ flexDirection:"column", overflow:"hidden",
                        borderLeft:`1px solid ${BORDER}`, background:CARD }}>
              <div style={{ padding:"0.75rem 1rem",
                             borderBottom:`1px solid ${BORDER}`,
                             fontFamily:M, fontSize:"0.3rem",
                             color:"rgba(255,255,255,0.2)",
                             textTransform:"uppercase", letterSpacing:"0.12em" }}>
                ◆ CREDIT & UNDERWRITING CONSOLE
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"0.75rem" }}>
                <UnderwritingEngine asset={asset ? {
                  id: asset.id,
                  assetClass: asset.assetClass,
                  status: asset.status,
                  ltv: asset.ltv,
                  estimatedUsd: asset.estimatedUsd,
                  createdAt: new Date().toISOString(),
                } : undefined} />
              </div>
            </div>
          </div>
        </div>
      ) : view === "ingest" ? (
        <div style={{ flex:1, overflowY:"auto", padding:"1.5rem",
                       background:BG }}>
          <div style={{ maxWidth:600, margin:"0 auto" }}>
            <div style={{ fontFamily:M, fontSize:"0.3rem",
                           color:"rgba(255,255,255,0.2)",
                           textTransform:"uppercase", letterSpacing:"0.15em",
                           marginBottom:"1rem" }}>
              ▶ COLLATERAL INGESTION PIPELINE
            </div>
            <IssuanceEngine onSuccess={() => setView("inspect")} />
          </div>
        </div>
      ) : (
        <div style={{ flex:1, overflowY:"auto", padding:"1.5rem",
                       background:BG }}>
          <BorrowPage />
        </div>
      )}
    </div>
  );
}
