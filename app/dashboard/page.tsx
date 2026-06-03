"use client";
// FILE: app/dashboard/page.tsx
// Wallet-style dashboard. Shows session identity + all user-submitted assets.
// Each asset shows lifecycle state + append-only timeline.

import { useState, useEffect } from "react";
import Link from "next/link";
import { sessionStore } from "@/lib/vos/sessionStore";
import { userAssetStore, ASSET_LABELS, STATE_LABELS } from "@/lib/vos/userAssetStore";
import type { Session } from "@/lib/vos/sessionStore";
import type { UserAsset, LifecycleState } from "@/lib/vos/userAssetStore";
import { CompactWallet }    from "@/components/CompactWallet";
import { LanguageSelector } from "@/components/LanguageSelector";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#0A0C10";
const CARD = "#0D1117";
const BDR  = "#1C2333";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const W    = "#F8FAFC";

const STATE_ORDER: LifecycleState[] = ["DRAFT","SUBMITTED","IN_REVIEW","VERIFIED","COMPLETED"];

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [assets,  setAssets]  = useState<UserAsset[]>([]);
  const [selected,setSelected]= useState<string | null>(null);

  function refresh() {
    setSession(sessionStore.get());
    const mine = userAssetStore.listMine();
    setAssets(mine);
    if (mine.length > 0 && !selected) setSelected(mine[0].id);
  }

  useEffect(() => { refresh(); }, []);

  const stats = userAssetStore.stats();
  const sel   = assets.find(a => a.id === selected);

  function advance(id: string) {
    userAssetStore.simulateAdvance(id);
    refresh();
  }
  function remove(id: string) {
    if (!confirm("Remove this asset record?")) return;
    userAssetStore.remove(id);
    setSelected(null);
    refresh();
  }
  function reset() {
    if (!confirm("Clear all your asset records and reset your session?")) return;
    userAssetStore.clearMine();
    sessionStore.reset();
    setSelected(null);
    refresh();
  }

  return (
    <div style={{ background:BG, minHeight:"100vh",
                   display:"flex", flexDirection:"column" }}>

      {/* Top status strip */}
      <div style={{ background:"#060810", borderBottom:"1px solid #0F1929",
                     padding:"0 clamp(0.75rem,2.5vw,1.5rem)",
                     height:28, display:"flex", alignItems:"center",
                     gap:"1.5rem", overflowX:"auto", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.35rem" }}>
          <div style={{ width:5, height:5, borderRadius:"50%",
                         background:G, boxShadow:`0 0 5px ${G}80` }}/>
          <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                          color:"rgba(255,255,255,0.25)", letterSpacing:"0.12em",
                          textTransform:"uppercase" }}>
            DASHBOARD · SESSION ACTIVE
          </span>
        </div>
        <span style={{ fontFamily:M, fontSize:"0.26rem", color:"rgba(255,255,255,0.2)",
                        letterSpacing:"0.1em" }}>
          {session ? `ID: ${session.id}` : "..."}
        </span>
        <div style={{ flex:1 }}/>
        <span style={{ fontFamily:M, fontSize:"0.26rem",
                        color:"rgba(255,255,255,0.15)", letterSpacing:"0.1em" }}>
          ABRAXAS OS · BUILD 2025.1
        </span>
      </div>

      {/* Nav */}
      <nav style={{ position:"sticky", top:28, zIndex:200,
                     background:"rgba(10,12,16,0.97)", backdropFilter:"blur(12px)",
                     borderBottom:`1px solid ${BDR}`, display:"flex", alignItems:"center",
                     padding:"0 clamp(0.75rem,2.5vw,1.5rem)",
                     height:"clamp(46px,6vw,54px)",
                     gap:"clamp(0.25rem,1vw,0.5rem)" }}>
        <Link href="/terminal" style={{ display:"flex", alignItems:"center",
                       gap:"0.375rem", textDecoration:"none",
                       flexShrink:0, marginRight:"clamp(0.375rem,1.5vw,1rem)" }}>
          <span style={{ color:G, fontSize:"clamp(0.7rem,2vw,0.9rem)" }}>&#9672;</span>
          <div>
            <span style={{ fontFamily:M, fontSize:"clamp(0.5rem,1.5vw,0.7rem)",
                            fontWeight:900, color:W, letterSpacing:"0.1em" }}>
              ABRAXAS
            </span>
            <span style={{ fontFamily:M, fontSize:"0.24rem",
                            color:"rgba(255,255,255,0.2)", letterSpacing:"0.15em",
                            marginLeft:"0.375rem" }}>
              PROTOCOL OS
            </span>
          </div>
        </Link>

        <Link href="/terminal" style={{
          padding:"0.25rem clamp(0.4rem,1.2vw,0.75rem)", borderRadius:4,
          border:`1px solid ${BDR}`, color:"rgba(255,255,255,0.28)",
          fontFamily:M, fontSize:"clamp(0.28rem,0.85vw,0.36rem)", fontWeight:700,
          textDecoration:"none", textTransform:"uppercase",
          letterSpacing:"0.1em", whiteSpace:"nowrap",
        }}>TERMINAL</Link>

        <button style={{
          padding:"0.25rem clamp(0.4rem,1.2vw,0.75rem)", borderRadius:4,
          border:`1px solid ${G}50`, background:`${G}10`, color:G,
          fontFamily:M, fontSize:"clamp(0.28rem,0.85vw,0.36rem)", fontWeight:700,
          cursor:"default", textTransform:"uppercase",
          letterSpacing:"0.1em", whiteSpace:"nowrap",
        }}>DASHBOARD</button>

        <Link href="/terminal" style={{
          padding:"0.25rem clamp(0.4rem,1.2vw,0.75rem)", borderRadius:4,
          border:`1px solid ${BDR}`, color:"rgba(255,255,255,0.28)",
          fontFamily:M, fontSize:"clamp(0.28rem,0.85vw,0.36rem)", fontWeight:700,
          textDecoration:"none", textTransform:"uppercase",
          letterSpacing:"0.1em", whiteSpace:"nowrap",
        }}>LENDING</Link>

        <div style={{ flex:1 }}/>
        <LanguageSelector/>
        <CompactWallet/>
      </nav>

      {/* Content */}
      <div style={{ maxWidth:1100, margin:"0 auto", width:"100%",
                     padding:"2rem clamp(1rem,3vw,2rem) 4rem" }}>

        {/* Identity card */}
        <div style={{ display:"grid",
                       gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",
                       gap:"1px", border:`1px solid ${BDR}`,
                       borderRadius:8, overflow:"hidden", marginBottom:"2rem" }}>
          <div style={{ background:CARD, padding:"1.125rem 1rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.25)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.4rem" }}>SESSION</div>
            <div style={{ fontFamily:M, fontSize:"0.7rem", fontWeight:900,
                           color:G, letterSpacing:"0.05em" }}>
              {session?.label ?? "..."}
            </div>
            <div style={{ fontFamily:M, fontSize:"0.26rem",
                           color:"rgba(255,255,255,0.25)", marginTop:"0.2rem" }}>
              {session?.id ?? ""}
            </div>
          </div>
          <div style={{ background:CARD, padding:"1.125rem 1rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.25)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.4rem" }}>TOTAL ASSETS</div>
            <div style={{ fontFamily:M, fontSize:"1rem", fontWeight:900, color:W }}>
              {stats.total}
            </div>
          </div>
          <div style={{ background:CARD, padding:"1.125rem 1rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.25)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.4rem" }}>IN REVIEW</div>
            <div style={{ fontFamily:M, fontSize:"1rem", fontWeight:900, color:A }}>
              {stats.byState.SUBMITTED + stats.byState.IN_REVIEW}
            </div>
          </div>
          <div style={{ background:CARD, padding:"1.125rem 1rem" }}>
            <div style={{ fontFamily:M, fontSize:"0.28rem", color:"rgba(255,255,255,0.25)",
                           textTransform:"uppercase", letterSpacing:"0.12em",
                           marginBottom:"0.4rem" }}>VERIFIED</div>
            <div style={{ fontFamily:M, fontSize:"1rem", fontWeight:900, color:G }}>
              {stats.byState.VERIFIED + stats.byState.COMPLETED}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {assets.length === 0 && (
          <div style={{ padding:"3rem 2rem", border:`1px solid ${BDR}`,
                         background:CARD, borderRadius:8, textAlign:"center" }}>
            <div style={{ fontFamily:M, fontSize:"0.32rem", color:"rgba(255,255,255,0.25)",
                           textTransform:"uppercase", letterSpacing:"0.2em",
                           marginBottom:"0.875rem" }}>EMPTY REGISTRY</div>
            <h2 style={{ fontFamily:S, fontSize:"clamp(1.1rem,2.5vw,1.5rem)",
                          fontWeight:800, color:W, margin:"0 0 0.625rem",
                          letterSpacing:"-0.02em" }}>
              No assets submitted yet.
            </h2>
            <p style={{ fontFamily:S, fontSize:"clamp(0.72rem,1.5vw,0.84rem)",
                         color:"rgba(255,255,255,0.4)", lineHeight:1.7,
                         maxWidth:480, margin:"0 auto 1.25rem" }}>
              Submit your first asset for verification through the terminal.
              Records persist across visits — your session is saved locally.
            </p>
            <Link href="/terminal" style={{
              display:"inline-block", padding:"0.75rem 1.5rem", borderRadius:6,
              background:G, color:"#000", fontFamily:M, fontSize:"0.48rem",
              fontWeight:900, letterSpacing:"0.04em",
              textTransform:"uppercase", textDecoration:"none",
            }}>
              OPEN TERMINAL &#8594;
            </Link>
          </div>
        )}

        {/* Asset list + detail split */}
        {assets.length > 0 && (
          <div style={{ display:"grid",
                         gridTemplateColumns:"minmax(0,1fr) minmax(0,1.4fr)",
                         gap:"1rem" }}>

            {/* Asset list */}
            <div>
              <div style={{ fontFamily:M, fontSize:"0.3rem",
                             color:"rgba(255,255,255,0.25)",
                             textTransform:"uppercase", letterSpacing:"0.15em",
                             marginBottom:"0.625rem" }}>
                MY ASSETS ({assets.length})
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
                {assets.map(a => {
                  const st = STATE_LABELS[a.state];
                  const isSel = a.id === selected;
                  return (
                    <button key={a.id} onClick={() => setSelected(a.id)} style={{
                      padding:"0.75rem 0.875rem", borderRadius:6, textAlign:"left",
                      cursor:"pointer", transition:"all 0.15s",
                      border:`1px solid ${isSel ? st.color : BDR}`,
                      borderLeft:`3px solid ${st.color}`,
                      background: isSel ? `${st.color}10` : CARD,
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between",
                                     alignItems:"baseline", marginBottom:"0.3rem" }}>
                        <span style={{ fontFamily:M, fontSize:"0.4rem",
                                        fontWeight:900, color:W,
                                        letterSpacing:"0.05em" }}>
                          {a.id}
                        </span>
                        <span style={{ fontFamily:M, fontSize:"0.26rem", fontWeight:700,
                                        color:st.color, background:`${st.color}15`,
                                        border:`1px solid ${st.color}30`,
                                        borderRadius:3, padding:"1px 5px",
                                        letterSpacing:"0.08em" }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ fontFamily:S, fontSize:"0.74rem",
                                     color:"rgba(255,255,255,0.55)",
                                     marginBottom:"0.2rem" }}>
                        {ASSET_LABELS[a.assetType] ?? a.assetType}
                      </div>
                      <div style={{ fontFamily:M, fontSize:"0.28rem",
                                     color:"rgba(255,255,255,0.3)" }}>
                        {a.estimatedValue ? `$${a.estimatedValue}` : "—"} · {a.jurisdiction}
                      </div>
                    </button>
                  );
                })}
              </div>
              <button onClick={reset} style={{
                marginTop:"1rem", padding:"0.5rem 0.75rem", borderRadius:4,
                border:`1px solid ${BDR}`, background:"transparent",
                color:"rgba(239,68,68,0.5)", fontFamily:M, fontSize:"0.3rem",
                fontWeight:700, cursor:"pointer", letterSpacing:"0.08em",
                textTransform:"uppercase",
              }}>
                RESET SESSION
              </button>
            </div>

            {/* Asset detail */}
            <div>
              {sel && (
                <div style={{ background:CARD, border:`1px solid ${BDR}`,
                               borderRadius:8, padding:"1.5rem" }}>

                  {/* Header */}
                  <div style={{ display:"flex", justifyContent:"space-between",
                                 alignItems:"baseline", marginBottom:"1.25rem",
                                 flexWrap:"wrap", gap:"0.5rem" }}>
                    <div>
                      <div style={{ fontFamily:M, fontSize:"0.3rem",
                                     color:"rgba(255,255,255,0.25)",
                                     textTransform:"uppercase", letterSpacing:"0.15em",
                                     marginBottom:"0.3rem" }}>
                        ASSET RECORD
                      </div>
                      <div style={{ fontFamily:M, fontSize:"clamp(0.75rem,1.8vw,0.95rem)",
                                     fontWeight:900, color:W,
                                     letterSpacing:"0.05em" }}>
                        {sel.id}
                      </div>
                    </div>
                    <span style={{ fontFamily:M, fontSize:"0.32rem", fontWeight:700,
                                    color:STATE_LABELS[sel.state].color,
                                    background:`${STATE_LABELS[sel.state].color}15`,
                                    border:`1px solid ${STATE_LABELS[sel.state].color}30`,
                                    borderRadius:4, padding:"3px 9px",
                                    letterSpacing:"0.1em",
                                    textTransform:"uppercase" }}>
                      {STATE_LABELS[sel.state].label}
                    </span>
                  </div>

                  {/* Stepper */}
                  <div style={{ marginBottom:"1.5rem" }}>
                    <div style={{ fontFamily:M, fontSize:"0.28rem",
                                   color:"rgba(255,255,255,0.25)",
                                   textTransform:"uppercase", letterSpacing:"0.12em",
                                   marginBottom:"0.625rem" }}>
                      LIFECYCLE
                    </div>
                    <div style={{ display:"flex", gap:"0.2rem",
                                   alignItems:"center" }}>
                      {STATE_ORDER.map((s, i) => {
                        const reached = STATE_ORDER.indexOf(sel.state) >= i;
                        const color = reached ? STATE_LABELS[s].color : "rgba(255,255,255,0.1)";
                        return (
                          <div key={s} style={{ flex:1,
                                                  display:"flex",
                                                  flexDirection:"column",
                                                  alignItems:"center",
                                                  gap:"0.35rem" }}>
                            <div style={{ height:3, width:"100%",
                                           background:color, borderRadius:1,
                                           boxShadow: reached ? `0 0 4px ${color}80` : "none" }}/>
                            <span style={{ fontFamily:M, fontSize:"0.24rem", fontWeight:700,
                                            color:reached ? color : "rgba(255,255,255,0.15)",
                                            letterSpacing:"0.06em",
                                            textAlign:"center", whiteSpace:"nowrap" }}>
                              {STATE_LABELS[s].label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Asset details */}
                  <div style={{ marginBottom:"1.5rem",
                                 borderTop:`1px solid ${BDR}`,
                                 paddingTop:"1rem" }}>
                    {[
                      ["Asset Type",     ASSET_LABELS[sel.assetType] ?? sel.assetType],
                      ["Estimated",      sel.estimatedValue ? `$${sel.estimatedValue}` : "—"],
                      ["Jurisdiction",   sel.jurisdiction],
                      ["Existing Liens", sel.hasLiens],
                      ["Appraisal",      sel.hasAppraisal],
                      ["Custody",        sel.hasCustody],
                      ["Submitted",      new Date(sel.createdAt).toLocaleString()],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                             padding:"0.4rem 0",
                                             borderBottom:"1px solid rgba(28,35,51,0.6)" }}>
                        <span style={{ fontFamily:M, fontSize:"0.32rem",
                                        color:"rgba(255,255,255,0.35)",
                                        textTransform:"uppercase",
                                        letterSpacing:"0.08em" }}>{k}</span>
                        <span style={{ fontFamily:M, fontSize:"0.38rem",
                                        color:W, fontWeight:700,
                                        textAlign:"right", maxWidth:"60%" }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Timeline */}
                  <div style={{ marginBottom:"1.5rem" }}>
                    <div style={{ fontFamily:M, fontSize:"0.28rem",
                                   color:"rgba(255,255,255,0.25)",
                                   textTransform:"uppercase", letterSpacing:"0.12em",
                                   marginBottom:"0.625rem" }}>
                      EVENT LOG (APPEND-ONLY · {sel.timeline.length} EVENTS)
                    </div>
                    <div style={{ position:"relative", paddingLeft:"1.25rem" }}>
                      <div style={{ position:"absolute", left:"0.25rem", top:0, bottom:0,
                                     width:1, background:"rgba(16,185,129,0.2)" }}/>
                      {sel.timeline.map((ev, i) => {
                        const c = STATE_LABELS[ev.state].color;
                        return (
                          <div key={i} style={{ position:"relative", marginBottom:"0.625rem" }}>
                            <div style={{ position:"absolute", left:"-1.15rem", top:3,
                                           width:8, height:8, borderRadius:"50%",
                                           background:c,
                                           boxShadow:`0 0 4px ${c}80`,
                                           border:`2px solid ${BG}` }}/>
                            <div style={{ display:"flex", justifyContent:"space-between",
                                           gap:"0.5rem", marginBottom:1, flexWrap:"wrap" }}>
                              <span style={{ fontFamily:M, fontSize:"0.34rem",
                                              fontWeight:700, color:c,
                                              letterSpacing:"0.08em" }}>
                                {STATE_LABELS[ev.state].label}
                              </span>
                              <span style={{ fontFamily:M, fontSize:"0.28rem",
                                              color:"rgba(255,255,255,0.3)" }}>
                                {new Date(ev.at).toLocaleString()}
                              </span>
                            </div>
                            {ev.note && (
                              <div style={{ fontFamily:S, fontSize:"0.7rem",
                                             color:"rgba(255,255,255,0.45)",
                                             lineHeight:1.6 }}>
                                {ev.note}
                              </div>
                            )}
                            <div style={{ fontFamily:M, fontSize:"0.26rem",
                                           color:"rgba(255,255,255,0.25)",
                                           marginTop:1 }}>
                              actor: {ev.actor}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap",
                                 borderTop:`1px solid ${BDR}`, paddingTop:"1rem" }}>
                    {sel.state !== "COMPLETED" && sel.state !== "REJECTED" && (
                      <button onClick={() => advance(sel.id)} style={{
                        flex:1, padding:"0.625rem 1rem", borderRadius:5,
                        background:`${G}10`, border:`1px solid ${G}40`,
                        color:G, fontFamily:M, fontSize:"0.36rem",
                        fontWeight:700, cursor:"pointer",
                        textTransform:"uppercase", letterSpacing:"0.08em",
                      }}>
                        SIMULATE NEXT STATE &#8594;
                      </button>
                    )}
                    <button onClick={() => remove(sel.id)} style={{
                      padding:"0.625rem 1rem", borderRadius:5,
                      background:"transparent", border:`1px solid rgba(239,68,68,0.3)`,
                      color:"rgba(239,68,68,0.7)", fontFamily:M, fontSize:"0.34rem",
                      fontWeight:700, cursor:"pointer",
                      textTransform:"uppercase", letterSpacing:"0.08em",
                    }}>
                      REMOVE
                    </button>
                  </div>
                  <div style={{ marginTop:"0.625rem", fontFamily:M,
                                 fontSize:"0.28rem",
                                 color:"rgba(255,255,255,0.2)",
                                 lineHeight:1.6 }}>
                    Demo mode: simulate state transitions to walk through the verification lifecycle.
                    In production, transitions are triggered by the verification network.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
