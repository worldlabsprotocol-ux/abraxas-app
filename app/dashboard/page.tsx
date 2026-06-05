"use client";
// FILE: app/dashboard/page.tsx — Institutional Bloomberg-style asset intelligence center

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  userAssetStore, ASSET_LABELS, STATE_COLORS,
  STAGE_META, PIPELINE_STAGES,
} from "@/lib/vos/userAssetStore";
import type { UserAsset, LifecycleState } from "@/lib/vos/userAssetStore";
import { sessionStore } from "@/lib/vos/sessionStore";
import type { Session } from "@/lib/vos/sessionStore";
import { CompactWallet }    from "@/components/CompactWallet";
import { LanguageSelector } from "@/components/LanguageSelector";

const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#070A0F";
const CARD = "#0C0F14";
const BDR  = "#1A2233";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const R    = "#EF4444";
const W    = "#F0F2F5";

function Mono({ children, color = W, size = "0.36rem" }: {
  children: React.ReactNode; color?: string; size?: string;
}) {
  return <span style={{ fontFamily: M, fontSize: size, color }}>{children}</span>;
}

function ScoreCard({ label, value, color, sub }: {
  label: string; value: number; color: string; sub?: string;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 6,
                   borderTop: `3px solid ${color}`, padding: "0.75rem 1rem" }}>
      <div style={{ fontFamily: M, fontSize: "0.28rem", color: "rgba(255,255,255,0.3)",
                     textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: M, fontSize: "1.4rem", fontWeight: 900, color,
                     lineHeight: 1, marginBottom: 4 }}>
        {value}<span style={{ fontSize: "0.5rem", fontWeight: 400 }}>/100</span>
      </div>
      {sub && <div style={{ fontFamily: M, fontSize: "0.26rem",
                             color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>
        {sub}
      </div>}
    </div>
  );
}

// Score label helper
function scoreLabel(v: number, isRisk = false) {
  if (isRisk) {
    if (v >= 85) return "LOW RISK";
    if (v >= 65) return "MODERATE";
    return "ELEVATED";
  }
  if (v >= 85) return "STRONG";
  if (v >= 70) return "GOOD";
  if (v >= 55) return "MODERATE";
  return "DEVELOPING";
}

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [assets,  setAssets]  = useState<UserAsset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview"|"lifecycle"|"documents"|"activity">("overview");

  function refresh() {
    const s = sessionStore.get();
    setSession(s);
    const mine = userAssetStore.listMine();
    setAssets(mine);
    if (mine.length > 0 && !selected) setSelected(mine[0].id);
  }

  useEffect(() => { refresh(); }, []);

  const sel = assets.find(a => a.id === selected);

  function advance(id: string) {
    userAssetStore.simulateAdvance(id);
    refresh();
  }
  function reset() {
    if (!confirm("Reset all assets and session?")) return;
    userAssetStore.clearMine();
    sessionStore.reset();
    setSelected(null);
    refresh();
  }

  const pipelineIndex = sel ? PIPELINE_STAGES.indexOf(sel.state) : -1;

  return (
    <div style={{ background: BG, minHeight: "100vh",
                   display: "flex", flexDirection: "column", color: W }}>

      {/* Status strip */}
      <div style={{ background: "#030507", borderBottom: "1px solid #0D1520",
                     padding: "0 1.5rem", height: 28,
                     display: "flex", alignItems: "center", gap: "1.5rem",
                     overflowX: "auto", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: G,
                         boxShadow: `0 0 5px ${G}80` }}/>
          <Mono color="rgba(255,255,255,0.3)" size="0.26rem">
            PORTFOLIO · SESSION {session?.label ?? "..."}
          </Mono>
        </div>
        <Mono color="rgba(255,255,255,0.15)" size="0.26rem">
          {assets.length} ASSET{assets.length !== 1 ? "S" : ""} · ABRAXAS OS BUILD 2025.1
        </Mono>
      </div>

      {/* Nav */}
      <nav style={{ position: "sticky", top: 28, zIndex: 200,
                     background: "rgba(7,10,15,0.97)", backdropFilter: "blur(12px)",
                     borderBottom: `1px solid ${BDR}`,
                     display: "flex", alignItems: "center",
                     padding: "0 clamp(0.75rem,2.5vw,1.5rem)",
                     height: 52, gap: "0.5rem" }}>
        <Link href="/terminal" style={{ display: "flex", alignItems: "center",
                       gap: "0.375rem", textDecoration: "none", marginRight: "0.75rem" }}>
          <Image src="/icon-48.png" alt="" width={22} height={22}/>
          <Mono size="0.6rem" color={W}>ABRAXAS</Mono>
          <Mono size="0.24rem" color="rgba(255,255,255,0.2)">PROTOCOL OS</Mono>
        </Link>
        {["TERMINAL","LENDING","DASHBOARD"].map(t => (
          <Link key={t} href={t === "TERMINAL" ? "/terminal" : t === "LENDING" ? "/lending" : "/dashboard"}
            style={{
              padding: "0.25rem 0.75rem", borderRadius: 4, textDecoration: "none",
              border: `1px solid ${t === "DASHBOARD" ? `${G}50` : BDR}`,
              background: t === "DASHBOARD" ? `${G}10` : "transparent",
              color: t === "DASHBOARD" ? G : "rgba(255,255,255,0.3)",
              fontFamily: M, fontSize: "0.32rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}>
            {t}
          </Link>
        ))}
        <div style={{ flex: 1 }}/>
        <LanguageSelector/>
        <CompactWallet/>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%",
                     padding: "1.5rem clamp(1rem,3vw,2rem) 4rem" }}>

        {/* ── Stat strip ── */}
        <div style={{ display: "grid",
                       gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
                       gap: "1px", border: `1px solid ${BDR}`, borderRadius: 7,
                       overflow: "hidden", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Assets",   val: assets.length,   color: W },
            { label: "In Review",      val: assets.filter(a => ["IDENTITY_REVIEW","OWNERSHIP_REVIEW","LEGAL_REVIEW","DUE_DILIGENCE","RISK_SCORING","APPROVAL_COMMITTEE"].includes(a.state)).length, color: A },
            { label: "Authorized",     val: assets.filter(a => ["TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE"].includes(a.state)).length, color: G },
            { label: "Portfolio Value", val: "$" + (assets.reduce((s,a) => s + (parseFloat(a.estimatedValue?.replace(/[^0-9.]/g,"")) || 0), 0) / 1e6).toFixed(2) + "M", color: G },
          ].map(s => (
            <div key={s.label} style={{ background: CARD, padding: "1rem" }}>
              <Mono size="0.28rem" color="rgba(255,255,255,0.25)">{s.label.toUpperCase()}</Mono>
              <div style={{ fontFamily: M, fontSize: "1.2rem", fontWeight: 900,
                             color: s.color, marginTop: 4 }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {assets.length === 0 && (
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8,
                         padding: "3rem", textAlign: "center" }}>
            <div style={{ fontFamily: M, fontSize: "0.32rem", color: "rgba(255,255,255,0.25)",
                           textTransform: "uppercase", letterSpacing: "0.2em",
                           marginBottom: "1rem" }}>
              EMPTY REGISTRY
            </div>
            <div style={{ fontFamily: S, fontSize: "1.4rem", fontWeight: 800,
                           color: W, marginBottom: "0.625rem" }}>
              No assets in verification pipeline.
            </div>
            <p style={{ fontFamily: S, fontSize: "0.86rem", color: "rgba(255,255,255,0.4)",
                         lineHeight: 1.7, maxWidth: 480, margin: "0 auto 1.5rem" }}>
              Submit your first asset through the terminal.
            </p>
            <Link href="/terminal" style={{
              padding: "0.75rem 1.5rem", borderRadius: 5, background: G, color: "#000",
              fontFamily: M, fontSize: "0.5rem", fontWeight: 900,
              textDecoration: "none", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              OPEN TERMINAL →
            </Link>
          </div>
        )}

        {assets.length > 0 && (
          <div style={{ display: "grid",
                         gridTemplateColumns: "min(280px,35%) 1fr",
                         gap: "1rem", alignItems: "start" }}>

            {/* ── Asset list ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <Mono size="0.3rem" color="rgba(255,255,255,0.25)">
                ASSET REGISTRY ({assets.length})
              </Mono>
              {assets.map(a => {
                const color = STATE_COLORS[a.state];
                const isSel = a.id === selected;
                return (
                  <button key={a.id} onClick={() => { setSelected(a.id); setTab("overview"); }}
                    style={{
                      padding: "0.75rem 0.875rem", borderRadius: 6,
                      textAlign: "left", cursor: "pointer",
                      border: `1px solid ${isSel ? color : BDR}`,
                      borderLeft: `3px solid ${color}`,
                      background: isSel ? `${color}12` : CARD,
                      transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                   alignItems: "baseline", marginBottom: 3 }}>
                      <Mono size="0.38rem" color={W}>{a.id}</Mono>
                      <span style={{ fontFamily: M, fontSize: "0.24rem", fontWeight: 700,
                                      color, background: `${color}20`, borderRadius: 3,
                                      padding: "1px 5px", letterSpacing: "0.06em" }}>
                        {STAGE_META[a.state]?.shortLabel ?? a.state}
                      </span>
                    </div>
                    <div style={{ fontFamily: S, fontSize: "0.76rem",
                                   color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>
                      {ASSET_LABELS[a.assetType] ?? a.assetType}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, height: 3, background: `${color}20`, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${a.progressPct}%`,
                                       background: color, borderRadius: 2,
                                       transition: "width 0.3s" }}/>
                      </div>
                      <Mono size="0.26rem" color={color}>{a.progressPct}%</Mono>
                    </div>
                  </button>
                );
              })}

              {/* Registry stats */}
              <div style={{ background: CARD, border: `1px solid ${BDR}`,
                             borderRadius: 6, padding: "0.75rem", marginTop: "0.5rem" }}>
                <Mono size="0.28rem" color="rgba(255,255,255,0.25)">REGISTRY OVERVIEW</Mono>
                {[
                  { label: "Verified Properties",   val: 1, color: G },
                  { label: "Pending Verification",   val: assets.filter(a => !["MINTED","MARKETPLACE_LIVE","REJECTED"].includes(a.state)).length, color: A },
                  { label: "Total Verified",          val: 1 + assets.filter(a => ["MINTED","MARKETPLACE_LIVE"].includes(a.state)).length, color: B },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between",
                                               padding: "0.35rem 0",
                                               borderBottom: `1px solid ${BDR}40` }}>
                    <Mono size="0.3rem" color="rgba(255,255,255,0.4)">{r.label}</Mono>
                    <Mono size="0.3rem" color={r.color}>{r.val}</Mono>
                  </div>
                ))}
              </div>

              <button onClick={reset} style={{
                marginTop: "0.5rem", padding: "0.4rem 0.75rem", borderRadius: 4,
                border: `1px solid ${R}30`, background: "transparent",
                color: `${R}60`, fontFamily: M, fontSize: "0.3rem", fontWeight: 700,
                cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                RESET SESSION
              </button>
            </div>

            {/* ── Asset detail ── */}
            {sel && (
              <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 8 }}>

                {/* Header */}
                <div style={{ padding: "1.25rem 1.5rem",
                               borderBottom: `1px solid ${BDR}`,
                               display: "flex", justifyContent: "space-between",
                               alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                                   marginBottom: 4 }}>
                      <Mono size="0.3rem" color="rgba(255,255,255,0.3)">ASSET RECORD</Mono>
                      <Mono size="0.42rem" color={STATE_COLORS[sel.state]}>●</Mono>
                    </div>
                    <Mono size="0.9rem" color={W}>{sel.id}</Mono>
                    <div style={{ fontFamily: S, fontSize: "0.8rem",
                                   color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                      {ASSET_LABELS[sel.assetType] ?? sel.assetType}
                      {sel.estimatedValue ? ` · $${sel.estimatedValue}` : ""}
                      {sel.jurisdiction ? ` · ${sel.jurisdiction}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: M, fontSize: "0.34rem", fontWeight: 700,
                                    color: STATE_COLORS[sel.state],
                                    background: `${STATE_COLORS[sel.state]}20`,
                                    border: `1px solid ${STATE_COLORS[sel.state]}40`,
                                    borderRadius: 4, padding: "3px 10px",
                                    textTransform: "uppercase", letterSpacing: "0.1em",
                                    display: "block", marginBottom: 4 }}>
                      {STAGE_META[sel.state]?.label ?? sel.state}
                    </span>
                    {sel.assignedVerifier && (
                      <Mono size="0.28rem" color="rgba(255,255,255,0.3)">
                        Verifier: {sel.assignedVerifier}
                      </Mono>
                    )}
                  </div>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: "flex", borderBottom: `1px solid ${BDR}`,
                               padding: "0 1.5rem" }}>
                  {(["overview","lifecycle","documents","activity"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                      padding: "0.625rem 0.875rem", background: "transparent", border: "none",
                      borderBottom: `2px solid ${tab === t ? G : "transparent"}`,
                      color: tab === t ? G : "rgba(255,255,255,0.3)",
                      fontFamily: M, fontSize: "0.32rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      cursor: "pointer", marginBottom: -1,
                    }}>
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "1.25rem 1.5rem" }}>

                  {/* OVERVIEW TAB */}
                  {tab === "overview" && (
                    <div>
                      {/* 4-score grid */}
                      <div style={{ display: "grid",
                                     gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
                                     gap: "0.5rem", marginBottom: "1.25rem" }}>
                        <ScoreCard label="Verification" value={sel.scores.verification}
                                   color={sel.scores.verification >= 75 ? G : A}
                                   sub={scoreLabel(sel.scores.verification)}/>
                        <ScoreCard label="Liquidity"    value={sel.scores.liquidity}
                                   color={sel.scores.liquidity >= 70 ? B : A}
                                   sub={scoreLabel(sel.scores.liquidity)}/>
                        <ScoreCard label="Fraud Shield" value={sel.scores.fraud}
                                   color={sel.scores.fraud >= 80 ? G : sel.scores.fraud >= 60 ? A : R}
                                   sub={scoreLabel(sel.scores.fraud, true)}/>
                        <ScoreCard label="Marketability" value={sel.scores.marketability}
                                   color={sel.scores.marketability >= 70 ? B : A}
                                   sub={scoreLabel(sel.scores.marketability)}/>
                      </div>

                      {/* Bloomberg-style data grid */}
                      <div style={{ background: "#080B10", border: `1px solid ${BDR}`,
                                     borderRadius: 6, marginBottom: "1rem" }}>
                        {[
                          ["Asset Value",      sel.estimatedValue ? `$${sel.estimatedValue}` : "Pending"],
                          ["Jurisdiction",     sel.jurisdiction || "—"],
                          ["Verification Score", `${sel.scores.overall}/100 · ${scoreLabel(sel.scores.overall)}`],
                          ["Legal Review",     STAGE_META[sel.state]?.progressPct >= 42 ? "In Progress" : "Pending"],
                          ["Tokenization",     sel.state === "MINTED" || sel.state === "MARKETPLACE_LIVE" ? "Authorized" : sel.state === "TOKENIZATION_AUTH" ? "Authorized" : "Pending Approval"],
                          ["Collateral Status",sel.state === "MARKETPLACE_LIVE" ? "ELIGIBLE" : "Pending Verification"],
                          ["Lending Status",   sel.state === "MARKETPLACE_LIVE" ? "AVAILABLE" : "Not Yet Available"],
                          ["Assigned Verifier",sel.assignedVerifier ?? "—"],
                          ["Progress",         `${sel.progressPct}% · ${STAGE_META[sel.state]?.label}`],
                          ["Submitted",        new Date(sel.createdAt).toLocaleString()],
                        ].map(([k,v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between",
                                                 padding: "0.5rem 0.875rem",
                                                 borderBottom: `1px solid ${BDR}30` }}>
                            <Mono size="0.32rem" color="rgba(255,255,255,0.35)">{k}</Mono>
                            <Mono size="0.36rem" color={
                              v === "ELIGIBLE" || v === "AVAILABLE" || v === "Authorized" ? G :
                              v === "Pending Approval" || v === "Pending Verification" ? A : W
                            }>{v}</Mono>
                          </div>
                        ))}
                      </div>

                      {/* AI Notes */}
                      {sel.aiNotes && (
                        <div style={{ padding: "0.875rem 1rem", background: `${B}08`,
                                       border: `1px solid ${B}30`, borderRadius: 6,
                                       marginBottom: "1rem" }}>
                          <Mono size="0.28rem" color={B}>AI ENGINE · CURRENT ASSESSMENT</Mono>
                          <div style={{ fontFamily: S, fontSize: "0.76rem",
                                         color: "rgba(255,255,255,0.65)", lineHeight: 1.7,
                                         marginTop: 6 }}>
                            {sel.aiNotes}
                          </div>
                        </div>
                      )}

                      {/* Sim control */}
                      {sel.state !== "MARKETPLACE_LIVE" && sel.state !== "REJECTED" && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => advance(sel.id)} style={{
                            flex: 1, padding: "0.75rem", borderRadius: 5,
                            background: `${G}10`, border: `1px solid ${G}40`,
                            color: G, fontFamily: M, fontSize: "0.38rem", fontWeight: 700,
                            cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em",
                          }}>
                            SIMULATE NEXT STAGE →
                          </button>
                        </div>
                      )}
                      {sel.state === "MARKETPLACE_LIVE" && (
                        <div style={{ padding: "0.75rem 1rem", background: `${G}10`,
                                       border: `1px solid ${G}40`, borderRadius: 5,
                                       textAlign: "center" }}>
                          <Mono size="0.42rem" color={G}>● MARKETPLACE LIVE · LENDING ELIGIBLE</Mono>
                        </div>
                      )}
                    </div>
                  )}

                  {/* LIFECYCLE TAB */}
                  {tab === "lifecycle" && (
                    <div>
                      <div style={{ position: "relative" }}>
                        {PIPELINE_STAGES.map((stage, i) => {
                          const meta = STAGE_META[stage];
                          const done = i <= pipelineIndex;
                          const active = stage === sel.state;
                          const color = done ? meta.color : "rgba(255,255,255,0.1)";
                          const timelineEv = sel.timeline.find(e => e.state === stage);
                          return (
                            <div key={stage} style={{
                              display: "grid", gridTemplateColumns: "28px 1fr",
                              gap: "0.875rem", marginBottom: "0.75rem",
                              opacity: done ? 1 : 0.4,
                            }}>
                              <div style={{ display: "flex", flexDirection: "column",
                                             alignItems: "center" }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: "50%",
                                  border: `2px solid ${color}`,
                                  background: done ? `${color}20` : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  boxShadow: active ? `0 0 8px ${color}80` : "none",
                                }}>
                                  <Mono size="0.3rem" color={color}>{i+1}</Mono>
                                </div>
                                {i < PIPELINE_STAGES.length - 1 && (
                                  <div style={{ width: 2, flex: 1, minHeight: 12,
                                                 background: done && i < pipelineIndex ? `${color}60` : `${BDR}` }}/>
                                )}
                              </div>
                              <div style={{ paddingBottom: "0.625rem" }}>
                                <div style={{ display: "flex", justifyContent: "space-between",
                                               alignItems: "baseline", flexWrap: "wrap", gap: 4,
                                               marginBottom: 2 }}>
                                  <Mono size="0.38rem" color={done ? W : "rgba(255,255,255,0.3)"}>
                                    {meta.label}
                                  </Mono>
                                  {timelineEv && (
                                    <Mono size="0.26rem" color="rgba(255,255,255,0.25)">
                                      {new Date(timelineEv.at).toLocaleString()}
                                    </Mono>
                                  )}
                                </div>
                                <div style={{ fontFamily: S, fontSize: "0.72rem",
                                               color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                                  {meta.description}
                                </div>
                                {active && (
                                  <div style={{ fontFamily: S, fontSize: "0.72rem",
                                                 color: `${color}90`, fontStyle: "italic" }}>
                                    {meta.aiNote}
                                  </div>
                                )}
                                <Mono size="0.26rem" color="rgba(255,255,255,0.2)">
                                  Verifier: {meta.verifier}
                                </Mono>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* DOCUMENTS TAB */}
                  {tab === "documents" && (
                    <div>
                      <Mono size="0.3rem" color="rgba(255,255,255,0.3)">
                        VERIFICATION PACKAGE — REQUIRED DOCUMENTS
                      </Mono>
                      <div style={{ marginTop: "1rem" }}>
                        {PIPELINE_STAGES.slice(0, pipelineIndex + 3).map(stage => {
                          const meta = STAGE_META[stage];
                          if (!meta.requiredDocs.length) return null;
                          const done = PIPELINE_STAGES.indexOf(stage) <= pipelineIndex;
                          return (
                            <div key={stage} style={{ marginBottom: "1rem" }}>
                              <Mono size="0.3rem" color={done ? G : A}>
                                {done ? "✓ " : "● "}{meta.label.toUpperCase()}
                              </Mono>
                              {meta.requiredDocs.map(d => (
                                <div key={d} style={{ display: "flex", gap: "0.5rem",
                                                       alignItems: "center",
                                                       padding: "0.35rem 0",
                                                       borderBottom: `1px solid ${BDR}40` }}>
                                  <Mono size="0.3rem" color={done ? G : "rgba(255,255,255,0.2)"}>
                                    {done ? "✓" : "○"}
                                  </Mono>
                                  <span style={{ fontFamily: S, fontSize: "0.76rem",
                                                  color: done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}>
                                    {d}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ACTIVITY TAB */}
                  {tab === "activity" && (
                    <div>
                      <Mono size="0.3rem" color="rgba(255,255,255,0.3)">
                        AUDIT LOG — APPEND-ONLY · {sel.timeline.length} EVENTS
                      </Mono>
                      <div style={{ marginTop: "1rem", position: "relative",
                                     paddingLeft: "1.25rem" }}>
                        <div style={{ position: "absolute", left: "0.25rem", top: 0, bottom: 0,
                                       width: 1, background: `${G}20` }}/>
                        {[...sel.timeline].reverse().map((ev, i) => {
                          const color = STATE_COLORS[ev.state] ?? G;
                          return (
                            <div key={i} style={{ position: "relative", marginBottom: "1rem" }}>
                              <div style={{ position: "absolute", left: "-1.15rem", top: 3,
                                             width: 8, height: 8, borderRadius: "50%",
                                             background: color, border: "2px solid #070A0F",
                                             boxShadow: `0 0 4px ${color}60` }}/>
                              <div style={{ display: "flex", justifyContent: "space-between",
                                             flexWrap: "wrap", gap: 4, marginBottom: 2 }}>
                                <Mono size="0.36rem" color={color}>
                                  {STAGE_META[ev.state]?.label ?? ev.state}
                                </Mono>
                                <Mono size="0.28rem" color="rgba(255,255,255,0.25)">
                                  {new Date(ev.at).toLocaleString()}
                                </Mono>
                              </div>
                              {ev.note && (
                                <div style={{ fontFamily: S, fontSize: "0.72rem",
                                               color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                                  {ev.note}
                                </div>
                              )}
                              <Mono size="0.26rem" color="rgba(255,255,255,0.2)">
                                actor: {ev.actor} · progress: {ev.progress ?? 0}%
                              </Mono>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
