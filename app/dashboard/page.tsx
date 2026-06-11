// FILE: app/dashboard/page.tsx
// Abraxas Institutional Dashboard — clean, no tab switcher at top,
// full-width Bloomberg-style layout.
"use client";

import { useState, useEffect }       from "react";
import Link                          from "next/link";
import { CompactWallet }             from "@/components/CompactWallet";
import { LanguageSelector }          from "@/components/LanguageSelector";
import {
  userAssetStore, ASSET_LABELS, STATE_COLORS,
  STAGE_META, PIPELINE_STAGES,
} from "@/lib/vos/userAssetStore";
import type { UserAsset, LifecycleState } from "@/lib/vos/userAssetStore";
import { sessionStore }              from "@/lib/vos/sessionStore";
import type { Session }              from "@/lib/vos/sessionStore";
import { wyomingRequestStore }       from "@/lib/vos/wyomingRequestStore";
import type { WyomingRequest }       from "@/lib/vos/wyomingRequestStore";
import { notificationService }       from "@/lib/notifications";

/* ── design tokens ─────────────────────────────────────────── */
const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#060810";
const CARD = "#0D1117";
const BDR  = "#1C2333";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const P    = "#8B5CF6";
const R    = "#EF4444";
const W    = "#F8FAFC";
const DIM  = "rgba(255,255,255,0.35)";

/* ── helpers ────────────────────────────────────────────────── */
function parseAssetValue(v: string | undefined): number {
  if (!v || v === "Not specified" || v.trim() === "") return 0;
  const n = parseFloat(v.replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}
function displayValue(v: string | undefined): string {
  const n = parseAssetValue(v);
  if (n === 0) return "—";
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${n.toLocaleString()}`;
}
function scoreLabel(v: number) {
  if (v >= 90) return "ELEVATED";
  if (v >= 85) return "STRONG";
  if (v >= 70) return "GOOD";
  if (v >= 55) return "MODERATE";
  return "DEVELOPING";
}
function scoreColor(v: number) {
  if (v >= 85) return G;
  if (v >= 70) return B;
  if (v >= 55) return A;
  return R;
}

/* ── tiny reusable components ───────────────────────────────── */
function Mono({ children, size = "0.72rem", color = W }:
  { children: React.ReactNode; size?: string; color?: string }) {
  return (
    <span style={{ fontFamily: M, fontSize: size, color, letterSpacing: "0.04em" }}>
      {children}
    </span>
  );
}

function ScoreCard({ label, value, suffix = "/100" }:
  { label: string; value: number; suffix?: string }) {
  const c = scoreColor(value);
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`,
                   borderTop: `2px solid ${c}`, borderRadius: 7, padding: "0.875rem" }}>
      <Mono size="0.58rem" color={DIM}>{label.toUpperCase()}</Mono>
      <div style={{ display: "flex", alignItems: "baseline",
                     gap: "0.25rem", margin: "0.375rem 0 0.2rem" }}>
        <span style={{ fontFamily: M, fontSize: "1.75rem",
                        fontWeight: 900, color: c }}>{value}</span>
        <span style={{ fontFamily: M, fontSize: "0.65rem", color: DIM }}>{suffix}</span>
      </div>
      <Mono size="0.58rem" color={c}>{scoreLabel(value)}</Mono>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const [session,     setSession]     = useState<Session | null>(null);
  const [assets,      setAssets]      = useState<UserAsset[]>([]);
  const [selected,    setSelected]    = useState<string | null>(null);
  const [detailTab,   setDetailTab]   = useState<"overview"|"lifecycle"|"documents"|"activity">("overview");
  const [wyomingReqs, setWyomingReqs] = useState<WyomingRequest[]>([]);
  const [panelTab,    setPanelTab]    = useState<"assets"|"wyoming">("assets");
  const [unread,      setUnread]      = useState(0);

  function refresh() {
    const s = sessionStore.get();
    setSession(s);
    const mine = userAssetStore.listMine();
    setAssets(mine);
    if (mine.length > 0 && !selected) setSelected(mine[0].id);
    setWyomingReqs(wyomingRequestStore.listAll());
    setUnread(notificationService.getUnreadCount());
  }

  useEffect(() => { refresh(); }, []);

  const sel = assets.find(a => a.id === selected) ?? null;

  const portfolioValue = assets.reduce((s, a) => s + parseAssetValue(a.estimatedValue), 0);
  const portfolioDisplay = portfolioValue > 0
    ? (portfolioValue >= 1_000_000
        ? `$${(portfolioValue / 1_000_000).toFixed(2)}M`
        : `$${portfolioValue.toLocaleString()}`)
    : "—";

  const STAT_CARDS = [
    { label: "Total Assets",  val: assets.length, color: W },
    { label: "In Review",     val: assets.filter(a => ["IDENTITY_REVIEW","OWNERSHIP_REVIEW","LEGAL_REVIEW","DUE_DILIGENCE","RISK_SCORING","APPROVAL_COMMITTEE"].includes(a.state)).length, color: A },
    { label: "Authorized",    val: assets.filter(a => ["TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE"].includes(a.state)).length, color: G },
    { label: "Portfolio",     val: portfolioDisplay, color: G },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex",
                   flexDirection: "column", fontFamily: M, color: W }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(6,8,16,0.95)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BDR}`,
        display: "flex", alignItems: "center",
        padding: "0 clamp(0.875rem,2vw,1.5rem)",
        height: 52, gap: "0.75rem",
      }}>
        <Link href="/terminal" style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          textDecoration: "none", flexShrink: 0,
        }}>
          <svg width={20} height={20} viewBox="0 0 40 40" fill="none">
            <polygon points="20,2 38,20 20,38 2,20"
              stroke="#10B981" strokeWidth="2" fill="none"/>
            <polygon points="20,8 32,20 20,32 8,20"
              stroke="#10B981" strokeWidth="1.5" fill="rgba(16,185,129,0.1)"/>
            <circle cx="20" cy="20" r="3" fill="#10B981"/>
          </svg>
          <span style={{ fontFamily: M, fontSize: "0.875rem",
                          fontWeight: 900, color: W, letterSpacing: "0.08em" }}>
            ABRAXAS
          </span>
        </Link>

        <div style={{ width: 1, height: 20, background: BDR, flexShrink: 0 }}/>

        <Link href="/terminal" style={{
          fontFamily: M, fontSize: "0.72rem", fontWeight: 700,
          color: DIM, textDecoration: "none", whiteSpace: "nowrap",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>← Terminal</Link>

        <span style={{ fontFamily: M, fontSize: "0.72rem", fontWeight: 700,
                        color: G, letterSpacing: "0.1em",
                        textTransform: "uppercase" }}>Dashboard</span>

        <div style={{ flex: 1 }}/>

        {/* Notification badge */}
        {unread > 0 && (
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: R, color: "#fff",
            fontFamily: M, fontSize: "0.55rem", fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}

        <LanguageSelector/>
        <CompactWallet/>
      </nav>

      {/* ── STATUS STRIP ────────────────────────────────────── */}
      <div style={{
        background: "#030508", borderBottom: `1px solid ${BDR}`,
        padding: "0.35rem clamp(0.875rem,2vw,1.5rem)",
        display: "flex", alignItems: "center", gap: "1.25rem",
        fontSize: "0.62rem", color: DIM, overflowX: "auto",
      }}>
        <span style={{ color: G, fontWeight: 700 }}>● PORTFOLIO ACTIVE</span>
        <span>SESSION: {session?.label ?? "..."}</span>
        <span style={{ color: A }}>{assets.length} ASSET{assets.length !== 1 ? "S" : ""}</span>
        <span style={{ color: B }}>ABRAXAS OS BUILD 2025.1</span>
        <span style={{ flex: 1 }}/>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>
          {new Date().toISOString().split("T")[0]}
        </span>
      </div>

      {/* ── INSTITUTIONAL BANNER ──────────────────────────────── */}
      <div style={{
        padding: "0.875rem clamp(0.875rem,2vw,1.5rem)",
        background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0) 60%)",
        borderBottom: `1px solid ${BDR}`,
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", flexWrap: "wrap", gap: "0.625rem",
      }}>
        <div>
          <div style={{ fontFamily: M, fontSize: "0.55rem", fontWeight: 700,
                         color: G, letterSpacing: "0.15em", textTransform: "uppercase",
                         marginBottom: 3 }}>
            ABRAXAS PROTOCOL · ASSET DASHBOARD
          </div>
          <div style={{ fontFamily: "Georgia, serif",
                         fontSize: "clamp(0.95rem,2.5vw,1.25rem)",
                         fontWeight: 700, color: W, lineHeight: 1.2 }}>
            Your verified assets.{" "}
            <span style={{ color: G }}>One credential. Every protocol.</span>
          </div>
        </div>
        <div style={{ fontFamily: M, fontSize: "0.52rem",
                       color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em",
                       textAlign: "right" }}>
          W3C VC · SOLANA MAINNET<br/>BUILD 2025.1
        </div>
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
        gap: "1px", background: BDR,
        borderBottom: `1px solid ${BDR}`,
      }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{ background: CARD, padding: "0.875rem 1rem" }}>
            <Mono size="0.6rem" color={DIM}>{s.label.toUpperCase()}</Mono>
            <div style={{ fontFamily: M, fontSize: "1.5rem", fontWeight: 900,
                           color: s.color, marginTop: "0.25rem" }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN BODY ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden",
                     minHeight: 0, flexDirection: "column" }}>

        <div style={{ flex: 1, display: "flex",
                       overflow: "auto", minHeight: 0 }}>

          {/* ── LEFT PANEL (asset list) ───────────────────── */}
          <div style={{
            width: "clamp(220px,28vw,300px)", flexShrink: 0,
            borderRight: `1px solid ${BDR}`, background: "#07090E",
            display: "flex", flexDirection: "column", overflowY: "auto",
          }}>
            {/* Panel tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${BDR}`,
                           flexShrink: 0 }}>
              {([["assets","ASSETS"],["wyoming","WYOMING"]] as const).map(([id, lbl]) => (
                <button key={id} onClick={() => {
                  setPanelTab(id);
                  if (id === "wyoming") {
                    wyomingRequestStore.markAllViewed();
                    setUnread(0);
                  }
                }} style={{
                  flex: 1, padding: "0.625rem", border: "none",
                  borderBottom: `2px solid ${panelTab===id ? G : "transparent"}`,
                  background: "transparent",
                  color: panelTab===id ? G : DIM,
                  fontFamily: M, fontSize: "0.62rem", fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.1em",
                  textTransform: "uppercase", position: "relative",
                }}>
                  {lbl}
                  {id === "wyoming" && unread > 0 && panelTab !== "wyoming" && (
                    <span style={{
                      position: "absolute", top: 4, right: 4,
                      width: 14, height: 14, borderRadius: "50%",
                      background: R, color: "#fff",
                      fontFamily: M, fontSize: "0.48rem", fontWeight: 900,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{unread > 9 ? "9+" : unread}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ padding: "0.5rem", flex: 1, overflowY: "auto" }}>
              {/* ASSETS tab */}
              {panelTab === "assets" && (
                <>
                  <div style={{ padding: "0.375rem 0.5rem", marginBottom: "0.25rem" }}>
                    <Mono size="0.55rem" color={DIM}>
                      ASSET REGISTRY ({assets.length})
                    </Mono>
                  </div>
                  {assets.length === 0 ? (
                    <div style={{ padding: "1rem 0.5rem", textAlign: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily:"Georgia,serif", fontSize:"0.95rem",
                                       fontWeight:700, color:"rgba(255,255,255,0.3)",
                                       marginBottom:"0.5rem", lineHeight:1.4 }}>
                          No verified assets yet.
                        </div>
                        <div style={{ fontFamily:S, fontSize:"0.65rem",
                                       color:"rgba(255,255,255,0.2)", marginBottom:"0.75rem",
                                       lineHeight:1.6 }}>
                          Submit an asset on the terminal to begin V5 verification.
                        </div>
                        <Link href="/terminal" style={{
                          fontFamily: M, fontSize: "0.6rem", color: G,
                          textDecoration: "none", textTransform: "uppercase",
                          letterSpacing: "0.08em", border: `1px solid rgba(16,185,129,0.3)`,
                          padding: "0.4rem 0.75rem", borderRadius: 4, display:"inline-block",
                        }}>Submit asset →</Link>
                      </div>
                    </div>
                  ) : (
                    assets.map(a => (
                      <button key={a.id} onClick={() => setSelected(a.id)} style={{
                        width: "100%", padding: "0.625rem 0.5rem", borderRadius: 5,
                        border: `1px solid ${selected===a.id ? `${G}50` : BDR}`,
                        background: selected===a.id ? `${G}08` : "transparent",
                        textAlign: "left", cursor: "pointer", marginBottom: "0.25rem",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between",
                                       alignItems: "baseline", gap: "0.25rem" }}>
                          <Mono size="0.65rem" color={selected===a.id ? G : W}>
                            {a.id.slice(0,10)}
                          </Mono>
                          <span style={{ fontFamily: M, fontSize: "0.52rem",
                                          color: STATE_COLORS[a.state as LifecycleState] ?? A,
                                          background: `${STATE_COLORS[a.state as LifecycleState] ?? A}15`,
                                          borderRadius: 3, padding: "1px 5px",
                                          textTransform: "uppercase", letterSpacing: "0.05em",
                                          flexShrink: 0, whiteSpace: "nowrap" }}>
                            {a.state.replace(/_/g," ").split(" ")[0]}
                          </span>
                        </div>
                        <div style={{ fontFamily: S, fontSize: "0.68rem",
                                       color: DIM, marginTop: 2 }}>
                          {ASSET_LABELS[a.assetType as keyof typeof ASSET_LABELS] ?? a.assetType}
                          {a.estimatedValue && a.estimatedValue !== "Not specified"
                            ? ` · ${displayValue(a.estimatedValue)}` : ""}
                        </div>
                        <div style={{ marginTop: "0.375rem", height: 3, background: BDR,
                                       borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", borderRadius: 2,
                                         background: G, width: `${a.progressPct || 5}%` }}/>
                        </div>
                      </button>
                    ))
                  )}
                  <button onClick={refresh} style={{
                    width: "100%", marginTop: "0.5rem", padding: "0.5rem",
                    borderRadius: 4, border: `1px solid ${BDR}`,
                    background: "transparent", color: DIM,
                    fontFamily: M, fontSize: "0.6rem", cursor: "pointer",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>RESET SESSION</button>
                </>
              )}

              {/* WYOMING tab */}
              {panelTab === "wyoming" && (
                <>
                  <div style={{ padding: "0.375rem 0.5rem", marginBottom: "0.25rem" }}>
                    <Mono size="0.55rem" color={DIM}>
                      WYOMING REQUESTS ({wyomingReqs.length})
                    </Mono>
                  </div>
                  {wyomingReqs.length === 0 ? (
                    <div style={{ padding: "1rem 0.5rem", textAlign: "center" }}>
                      <Mono size="0.62rem" color={DIM}>No Wyoming requests yet.</Mono>
                    </div>
                  ) : (
                    wyomingReqs.map(r => (
                      <div key={r.id} style={{
                        padding: "0.625rem 0.5rem", borderRadius: 5, marginBottom: "0.25rem",
                        border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`,
                        background: "rgba(255,255,255,0.01)",
                      }}>
                        <div style={{ fontFamily: M, fontSize: "0.65rem",
                                       fontWeight: 700, color: W, marginBottom: 2 }}>
                          {r.companyName}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between",
                                       flexWrap: "wrap", gap: 2 }}>
                          <Mono size="0.55rem" color={G}>
                            {r.tier.toUpperCase()}
                          </Mono>
                          <Mono size="0.52rem" color={DIM}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </Mono>
                        </div>
                        <div style={{ marginTop: 3 }}>
                          <span style={{
                            fontFamily: M, fontSize: "0.5rem", fontWeight: 700,
                            color: G, background: `${G}12`, borderRadius: 3,
                            padding: "1px 5px", textTransform: "uppercase", letterSpacing: "0.06em",
                          }}>{r.lifecycleState}</span>
                        </div>
                        {r.supabaseId && (
                          <div style={{ marginTop: 2 }}>
                            <Mono size="0.5rem" color={`${G}60`}>✓ Supabase synced</Mono>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL (asset detail) ─────────────────── */}
          <div style={{ flex: 1, minWidth: 0, overflowY: "auto",
                         background: BG, padding: "0" }}>
            {!sel ? (
              <div style={{ display: "flex", alignItems: "center",
                             justifyContent: "center", height: "100%",
                             flexDirection: "column", gap: "0.75rem" }}>
                <Mono size="0.65rem" color={DIM}>SELECT AN ASSET TO VIEW DETAILS</Mono>
                <Link href="/terminal" style={{
                  fontFamily: M, fontSize: "0.65rem", color: G,
                  textDecoration: "none", textTransform: "uppercase",
                  letterSpacing: "0.08em", border: `1px solid ${G}`,
                  padding: "0.5rem 1rem", borderRadius: 4,
                }}>← Back to Terminal</Link>
              </div>
            ) : (
              <div>
                {/* Asset header */}
                <div style={{ padding: "1rem 1.25rem",
                               borderBottom: `1px solid ${BDR}`,
                               background: CARD }}>
                  <div style={{ display: "flex", alignItems: "flex-start",
                                 justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center",
                                     gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%",
                                       background: STATE_COLORS[sel.state as LifecycleState] ?? A }}/>
                        <Mono size="0.65rem" color={DIM}>ASSET RECORD</Mono>
                      </div>
                      <div style={{ fontFamily: M, fontSize: "0.875rem",
                                     fontWeight: 900, color: W, marginBottom: 2 }}>
                        {sel.id}
                      </div>
                      <div style={{ fontFamily: S, fontSize: "0.72rem", color: DIM }}>
                        {ASSET_LABELS[sel.assetType as keyof typeof ASSET_LABELS] ?? sel.assetType}
                        {sel.estimatedValue && sel.estimatedValue !== "Not specified"
                          ? ` · ${displayValue(sel.estimatedValue)}` : ""}
                        {" · "}
                        {sel.jurisdiction || "Not specified"}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column",
                                   gap: "0.25rem", alignItems: "flex-end" }}>
                      <span style={{
                        fontFamily: M, fontSize: "0.6rem", fontWeight: 700,
                        color: STATE_COLORS[sel.state as LifecycleState] ?? A,
                        background: `${STATE_COLORS[sel.state as LifecycleState] ?? A}15`,
                        border: `1px solid ${STATE_COLORS[sel.state as LifecycleState] ?? A}30`,
                        borderRadius: 4, padding: "0.35rem 0.625rem",
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>
                        {sel.state.replace(/_/g," ")}
                      </span>
                      {sel.assignedVerifier && (
                        <Mono size="0.58rem" color={DIM}>
                          Verifier: {sel.assignedVerifier}
                        </Mono>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detail tabs */}
                <div style={{ display: "flex", borderBottom: `1px solid ${BDR}`,
                               background: CARD }}>
                  {(["overview","lifecycle","documents","activity"] as const).map(t => (
                    <button key={t} onClick={() => setDetailTab(t)} style={{
                      padding: "0.625rem 0.875rem", border: "none",
                      borderBottom: `2px solid ${detailTab===t ? G : "transparent"}`,
                      background: "transparent",
                      color: detailTab===t ? G : DIM,
                      fontFamily: M, fontSize: "0.62rem", fontWeight: 700,
                      cursor: "pointer", letterSpacing: "0.1em",
                      textTransform: "uppercase", whiteSpace: "nowrap",
                    }}>{t.toUpperCase()}</button>
                  ))}
                </div>

                <div style={{ padding: "1rem 1.25rem" }}>

                  {/* ── OVERVIEW ── */}
                  {detailTab === "overview" && (
                    <div>
                      {/* Score cards */}
                      <div style={{ display: "grid",
                                     gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                                     gap: "0.5rem", marginBottom: "1rem" }}>
                        <ScoreCard label="Verification" value={sel.scores?.verification ?? 55} />
                        <ScoreCard label="Liquidity"    value={sel.scores?.liquidity    ?? 62} />
                        <ScoreCard label="Fraud Shield" value={sel.scores?.fraud        ?? 75} />
                        <ScoreCard label="Marketability" value={sel.scores?.marketability ?? 65} />
                      </div>

                      {/* Data grid */}
                      <div style={{ background: CARD, border: `1px solid ${BDR}`,
                                     borderRadius: 7, overflow: "hidden",
                                     marginBottom: "0.875rem" }}>
                        {[
                          ["Asset Value",       displayValue(sel.estimatedValue)],
                          ["Jurisdiction",      sel.jurisdiction  || "—"],
                          ["Verification Score",`${(sel.scores ? Math.round((sel.scores.verification+sel.scores.fraud)/2) : 64)}/100 · ${scoreLabel(sel.scores ? Math.round((sel.scores.verification+sel.scores.fraud)/2) : 64)}`],
                          ["Legal Review",      sel.state === "LEGAL_REVIEW" || ["RISK_SCORING","APPROVAL_COMMITTEE","TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE"].includes(sel.state) ? "Complete" : "Pending"],
                          ["Tokenization",      ["TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE"].includes(sel.state) ? "Authorized" : "Pending Approval"],
                          ["Collateral Status", ["MINTED","MARKETPLACE_LIVE"].includes(sel.state) ? "Eligible" : "Pending Verification"],
                          ["Lending Status",    sel.state === "MARKETPLACE_LIVE" ? "Available (60% LTV)" : "Not Yet Available"],
                          ["Assigned Verifier", sel.assignedVerifier ?? "—"],
                          ["Progress",          `${sel.progressPct || 5}% · ${sel.state.replace(/_/g," ")}`],
                          ["Submitted",         new Date(sel.createdAt).toLocaleString()],
                        ].map(([k,v]) => (
                          <div key={k} style={{
                            display: "flex", justifyContent: "space-between",
                            padding: "0.5rem 0.875rem",
                            borderBottom: `1px solid ${BDR}40`,
                            flexWrap: "wrap", gap: "0.25rem",
                          }}>
                            <Mono size="0.65rem" color={DIM}>{k}</Mono>
                            <Mono size="0.65rem" color={
                              v === "Pending Approval" ? A :
                              v === "Pending Verification" ? A :
                              v === "Authorized" ? G :
                              v === "Complete" ? G : W
                            }>{v}</Mono>
                          </div>
                        ))}
                      </div>

                      {/* AI Engine note */}
                      {sel.aiNotes && (
                        <div style={{ padding: "0.75rem 0.875rem", borderRadius: 6,
                                       background: `${B}08`, border: `1px solid ${B}25` }}>
                          <div style={{ fontFamily: M, fontSize: "0.58rem", color: B,
                                         letterSpacing: "0.1em", textTransform: "uppercase",
                                         marginBottom: "0.375rem" }}>
                            AI ENGINE · CURRENT ASSESSMENT
                          </div>
                          <div style={{ fontFamily: S, fontSize: "0.72rem",
                                         color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                            {sel.aiNotes}
                          </div>
                        </div>
                      )}

                      {/* Simulate next stage */}
                      {!["MARKETPLACE_LIVE","REJECTED"].includes(sel.state) && (
                        <button
                          onClick={() => {
                            userAssetStore.simulateAdvance(sel.id);
                            refresh();
                          }}
                          style={{
                            marginTop: "1rem", width: "100%",
                            padding: "0.75rem", borderRadius: 5, border: "none",
                            background: G, color: "#000", fontFamily: M,
                            fontSize: "0.78rem", fontWeight: 900,
                            cursor: "pointer", letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}>
                          SIMULATE NEXT STAGE →
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── LIFECYCLE ── */}
                  {detailTab === "lifecycle" && (
                    <div>
                      {PIPELINE_STAGES.map((stage, i) => {
                        const meta   = STAGE_META[stage];
                        const idx    = PIPELINE_STAGES.indexOf(sel.state as LifecycleState);
                        const done   = i < idx;
                        const active = i === idx;
                        const c      = done ? G : active ? A : DIM;
                        return (
                          <div key={stage} style={{
                            display: "flex", gap: "0.875rem",
                            paddingBottom: "0.875rem", marginBottom: "0.875rem",
                            borderBottom: `1px solid ${BDR}40`,
                          }}>
                            <div style={{ flexShrink: 0, display: "flex",
                                           flexDirection: "column", alignItems: "center" }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: "50%",
                                border: `2px solid ${c}`,
                                background: active ? `${c}20` : done ? `${c}10` : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Mono size="0.6rem" color={c}>
                                  {done ? "✓" : String(i+1).padStart(2,"0")}
                                </Mono>
                              </div>
                              {i < PIPELINE_STAGES.length-1 && (
                                <div style={{ width: 1, flex: 1, minHeight: 12,
                                               background: done ? G : BDR, marginTop: 3 }}/>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: M, fontSize: "0.65rem",
                                             fontWeight: 700, color: c, marginBottom: 2,
                                             letterSpacing: "0.08em",
                                             textTransform: "uppercase" }}>
                                {stage.replace(/_/g," ")}
                              </div>
                              {meta && (
                                <>
                                  <div style={{ fontFamily: S, fontSize: "0.7rem",
                                                 color: DIM, lineHeight: 1.55 }}>
                                    {meta.description}
                                  </div>
                                  <div style={{ fontFamily: M, fontSize: "0.58rem",
                                                 color: "rgba(255,255,255,0.25)",
                                                 marginTop: 2 }}>
                                    Verifier: {meta.verifier}
                                  </div>
                                </>
                              )}
                              {active && (
                                <div style={{ marginTop: "0.25rem" }}>
                                  <span style={{ fontFamily: M, fontSize: "0.55rem",
                                                  fontWeight: 700, color: A,
                                                  background: `${A}15`, borderRadius: 3,
                                                  padding: "1px 6px", letterSpacing: "0.06em" }}>
                                    CURRENT STAGE
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── DOCUMENTS ── */}
                  {detailTab === "documents" && (
                    <div>
                      <Mono size="0.65rem" color={DIM}>
                        Document upload available on the terminal page asset submission form.
                      </Mono>
                      <div style={{ marginTop: "0.75rem" }}>
                        <Link href="/terminal" style={{
                          fontFamily: M, fontSize: "0.65rem", color: G,
                          textDecoration: "none", letterSpacing: "0.06em",
                          textTransform: "uppercase", border: `1px solid ${G}`,
                          padding: "0.5rem 0.875rem", borderRadius: 4,
                          display: "inline-block",
                        }}>Go to Terminal →</Link>
                      </div>
                    </div>
                  )}

                  {/* ── ACTIVITY ── */}
                  {detailTab === "activity" && (
                    <div>
                      {(sel.timeline ?? []).length === 0 ? (
                        <Mono size="0.65rem" color={DIM}>No activity yet.</Mono>
                      ) : (
                        [...(sel.timeline ?? [])].reverse().map((e, i) => (
                          <div key={i} style={{
                            padding: "0.5rem 0", borderBottom: `1px solid ${BDR}40`,
                            display: "flex", gap: "0.75rem", alignItems: "flex-start",
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%",
                                           background: G, flexShrink: 0, marginTop: 5 }}/>
                            <div>
                              <div style={{ fontFamily: S, fontSize: "0.7rem",
                                             color: W, lineHeight: 1.5 }}>{e.note}</div>
                              <Mono size="0.58rem" color={DIM}>
                                {new Date(e.at).toLocaleString()} · {e.actor}
                              </Mono>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
