// FILE: app/dashboard/page.tsx
// Abraxas Institutional Dashboard. clean, no tab switcher at top,
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
import { UserProfile }             from "@/components/profile/UserProfile";
import { AssetRegistryDashboard }  from "@/components/dashboard/AssetRegistryDashboard";
import { MyAbraxas }               from "@/components/dashboard/MyAbraxas";

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
  const [idvStatus, setIdvStatus] = useState<'idle'|'verified'|'unverified'>('idle');
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [credentialLevel, setCredentialLevel] = useState<string|null>(null);

  function refresh() {
    const s = sessionStore.get();
    setSession(s);
    const mine = userAssetStore.listMine();
    setAssets(mine);
    if (mine.length > 0 && !selected) setSelected(mine[0].id);
    setWyomingReqs(wyomingRequestStore.listAll());
    setUnread(notificationService.getUnreadCount());
  }

  useEffect(() => {
    refresh();
    // Read wallet address from localStorage (set by wallet adapter on connect)
    if (typeof window !== "undefined") {
      try {
        // Phantom / any Solana wallet stores last connected key
        const stored = localStorage.getItem("abraxas_credential_v1");
        if (stored) {
          const c = JSON.parse(stored) as { wallet?: string };
          if (c.wallet) setWalletAddr(c.wallet);
        }
        // Also try solana wallet standard
        const phantomKey = localStorage.getItem("walletName");
        if (!phantomKey) { /* no wallet connected yet */ }
      } catch {}
    }
    // Check credential status without importing the hook (avoids SSR issues)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("abraxas_credential_v1");
        if (stored) {
          const cred = JSON.parse(stored);
          const expired = new Date(cred.expires_at) < new Date();
          setIdvStatus(expired ? "unverified" : "verified");
          setCredentialLevel(cred.level ?? "BASIC");
        } else {
          setIdvStatus("unverified");
        }
      } catch { setIdvStatus("unverified"); }
    }
  }, []);

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

      {/* ── PASSPORT STATUS WIDGET ─────────────────────────────── */}
      <div style={{
        padding: "0.625rem clamp(0.875rem,2vw,1.5rem)",
        borderBottom: `1px solid ${BDR}`,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.625rem" }}>
          {/* Passport status indicator */}
          <div style={{
            display:"flex", alignItems:"center", gap:"0.375rem",
            padding:"0.3rem 0.75rem", borderRadius:4,
            background: idvStatus === "verified" ? `${G}10` : "rgba(255,255,255,0.03)",
            border: `1px solid ${idvStatus === "verified" ? G+"30" : BDR}`,
          }}>
            <div style={{ width:7, height:7, borderRadius:"50%",
                           background: idvStatus === "verified" ? G : "rgba(255,255,255,0.2)",
                           boxShadow: idvStatus === "verified" ? `0 0 5px ${G}` : "none" }}/>
            <span style={{ fontFamily:M, fontSize:"0.58rem", fontWeight:700,
                            color: idvStatus === "verified" ? G : "rgba(255,255,255,0.3)",
                            textTransform:"uppercase", letterSpacing:"0.1em" }}>
              {idvStatus === "verified"
                ? `PASSPORT ACTIVE · ${credentialLevel ?? "BASIC"}`
                : "PASSPORT NOT VERIFIED"}
            </span>
          </div>
          <button onClick={() => setShowProfile(p => !p)} style={{
            fontFamily:M, fontSize:"0.58rem", fontWeight:700,
            color:"rgba(255,255,255,0.35)", background:"transparent",
            border:`1px solid ${BDR}`, borderRadius:3,
            padding:"0.2rem 0.5rem", cursor:"pointer",
            letterSpacing:"0.08em", textTransform:"uppercase",
          }}>
            {showProfile ? "HIDE PROFILE" : "MY PROFILE"}
          </button>
          {idvStatus !== "verified" && (
            <Link href="/identity" style={{
              fontFamily:M, fontSize:"0.58rem", fontWeight:900, color:"#000",
              background:G, textDecoration:"none", letterSpacing:"0.08em",
              textTransform:"uppercase", padding:"0.35rem 0.75rem",
              borderRadius:4, display:"inline-block",
              boxShadow:`0 0 10px ${G}40`,
            }}>GET VERIFIED →</Link>
          )}
        </div>
        <div style={{ fontFamily:M, fontSize:"0.52rem",
                       color:"rgba(255,255,255,0.15)", letterSpacing:"0.08em" }}>
          {assets.length} ASSET{assets.length !== 1 ? "S" : ""} ·{" "}
          {wyomingReqs.length} LLC REQUEST{wyomingReqs.length !== 1 ? "S" : ""}
        </div>
      </div>

      {/* ── USER PROFILE (collapsible) ─────────────────────────────── */}
      {showProfile && (
        <div style={{ padding:"0 clamp(0.875rem,2vw,1.5rem) 0.875rem" }}>
          <UserProfile walletAddress={walletAddr} />
        </div>
      )}

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
      <div style={{ flex: 1, overflowY: "auto",
                     padding: "1rem clamp(0.875rem,2vw,1.5rem)" }}>

        {/* Quick actions */}
        <div style={{ display:"flex", gap:"0.625rem", flexWrap:"wrap",
                       marginBottom:"1.5rem" }}>
          <Link href="/terminal" style={{
            padding:"0.6rem 1.125rem", borderRadius:20, border:"none",
            background:G, color:"#000", fontFamily:"'Inter',system-ui,sans-serif",
            fontSize:"0.8rem", fontWeight:700, textDecoration:"none",
          }}>
            Submit an asset
          </Link>
          <Link href="/terminal" style={{
            padding:"0.6rem 1.125rem", borderRadius:20,
            border:`1px solid ${BDR}`, background:"transparent",
            color:"rgba(255,255,255,0.6)", fontFamily:"'Inter',system-ui,sans-serif",
            fontSize:"0.8rem", fontWeight:600, textDecoration:"none",
          }}>
            Browse investment opportunities
          </Link>
          {idvStatus !== "verified" && (
            <Link href="/identity" style={{
              padding:"0.6rem 1.125rem", borderRadius:20,
              border:`1px solid ${G}30`, background:`${G}08`,
              color:G, fontFamily:"'Inter',system-ui,sans-serif",
              fontSize:"0.8rem", fontWeight:600, textDecoration:"none",
            }}>
              Get verified
            </Link>
          )}
        </div>

        {/* Persistent identity + activity panel */}
        <MyAbraxas identityLabel={walletAddr} />

        {/* Full protocol asset registry, all 4 assets */}
        <AssetRegistryDashboard />

        {/* Panel tabs */}
        <div style={{ display:"flex", gap:"0.375rem", marginBottom:"1rem",
                       borderBottom:`1px solid ${BDR}`, paddingBottom:"0.75rem",
                       flexWrap:"wrap", alignItems:"center",
                       justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:"0.375rem" }}>
            {([["assets","ASSETS"],["wyoming","WYOMING"]] as const).map(([id,lbl]) => (
              <button key={id} onClick={() => {
                setPanelTab(id);
                if (id === "wyoming") {
                  wyomingRequestStore.markAllViewed();
                  setUnread(0);
                }
              }} style={{
                padding:"0.4rem 0.875rem", borderRadius:4, border:"none",
                borderBottom:`2px solid ${panelTab===id ? G : "transparent"}`,
                background: panelTab===id ? `${G}10` : "transparent",
                color: panelTab===id ? G : DIM,
                fontFamily:M, fontSize:"0.65rem", fontWeight:700,
                cursor:"pointer", letterSpacing:"0.1em",
                textTransform:"uppercase", position:"relative",
              }}>
                {lbl}
                {id==="wyoming" && unread > 0 && panelTab!=="wyoming" && (
                  <span style={{ position:"absolute", top:2, right:2,
                                  width:12, height:12, borderRadius:"50%",
                                  background:R, color:"#fff",
                                  fontFamily:M, fontSize:"0.45rem", fontWeight:900,
                                  display:"flex", alignItems:"center", justifyContent:"center",
                  }}>{unread>9?"9+":unread}</span>
                )}
              </button>
            ))}
          </div>
          <button onClick={refresh} style={{
            padding:"0.35rem 0.75rem", borderRadius:4,
            border:`1px solid ${BDR}`, background:"transparent",
            color:DIM, fontFamily:M, fontSize:"0.6rem",
            cursor:"pointer", letterSpacing:"0.06em", textTransform:"uppercase",
          }}>REFRESH</button>
        </div>

        {/* ── ASSETS GRID ── */}
        {panelTab === "assets" && (
          <div>
            {assets.length === 0 ? (
              <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                <div style={{ fontFamily:"Georgia,serif", fontSize:"1.1rem",
                               fontWeight:700, color:"rgba(255,255,255,0.25)",
                               marginBottom:"0.625rem" }}>
                  No verified assets yet.
                </div>
                <div style={{ fontFamily:S, fontSize:"0.72rem",
                               color:"rgba(255,255,255,0.2)", marginBottom:"1rem",
                               lineHeight:1.65 }}>
                  Submit an asset on the terminal to begin the V5 verification pipeline.
                </div>
                <Link href="/terminal" style={{
                  fontFamily:M, fontSize:"0.65rem", color:G,
                  textDecoration:"none", textTransform:"uppercase",
                  letterSpacing:"0.08em", border:`1px solid rgba(16,185,129,0.3)`,
                  padding:"0.5rem 1rem", borderRadius:4, display:"inline-block",
                }}>→ Submit Asset</Link>
              </div>
            ) : (
              <div style={{ display:"grid",
                             gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
                             gap:"0.75rem" }}>
                {assets.map(a => {
                  const isSel = selected === a.id;
                  const stateColor = STATE_COLORS[a.state as LifecycleState] ?? A;
                  const pct = a.progressPct || 5;
                  return (
                    <div key={a.id}
                      onClick={() => setSelected(isSel ? null : a.id)}
                      style={{ background:CARD,
                                border:`1px solid ${isSel ? G+"60" : BDR}`,
                                borderRadius:8, padding:"1rem",
                                cursor:"pointer", transition:"all 0.15s",
                                boxShadow: isSel ? `0 0 20px ${G}18` : "none",
                              }}>
                      {/* Card header */}
                      <div style={{ display:"flex", justifyContent:"space-between",
                                     alignItems:"flex-start", marginBottom:"0.625rem" }}>
                        <div>
                          <div style={{ fontFamily:M, fontSize:"0.7rem",
                                         fontWeight:700, color:W, marginBottom:2 }}>
                            {a.id.slice(0,12)}
                          </div>
                          <div style={{ fontFamily:S, fontSize:"0.65rem", color:DIM }}>
                            {ASSET_LABELS[a.assetType as keyof typeof ASSET_LABELS] ?? a.assetType}
                          </div>
                        </div>
                        <span style={{
                          fontFamily:M, fontSize:"0.55rem", fontWeight:700,
                          color:stateColor,
                          background:`${stateColor}15`,
                          border:`1px solid ${stateColor}30`,
                          borderRadius:3, padding:"2px 7px",
                          textTransform:"uppercase", letterSpacing:"0.06em",
                          whiteSpace:"nowrap",
                        }}>
                          {a.state.replace(/_/g," ").split(" ")[0]}
                        </span>
                      </div>

                      {/* Score row */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)",
                                     gap:"0.375rem", marginBottom:"0.625rem" }}>
                        {[
                          ["V",a.scores?.verification??55],
                          ["L",a.scores?.liquidity??62],
                          ["F",a.scores?.fraud??75],
                          ["M",a.scores?.marketability??65],
                        ].map(([k,v]) => (
                          <div key={k as string} style={{
                            textAlign:"center", padding:"0.3rem 0.2rem",
                            background:"rgba(255,255,255,0.03)",
                            borderRadius:4,
                            border:`1px solid ${scoreColor(v as number)}25`,
                          }}>
                            <div style={{ fontFamily:M, fontSize:"0.5rem",
                                           color:"rgba(255,255,255,0.25)",
                                           marginBottom:1 }}>{k}</div>
                            <div style={{ fontFamily:M, fontSize:"0.78rem",
                                           fontWeight:900,
                                           color:scoreColor(v as number) }}>
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom:"0.5rem" }}>
                        <div style={{ display:"flex", justifyContent:"space-between",
                                       marginBottom:3 }}>
                          <Mono size="0.55rem" color={DIM}>V5 PIPELINE</Mono>
                          <Mono size="0.55rem" color={G}>{pct}%</Mono>
                        </div>
                        <div style={{ height:3, background:BDR,
                                       borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:2,
                                         background:G, width:`${pct}%` }}/>
                        </div>
                      </div>

                      {/* Value + actions */}
                      <div style={{ display:"flex", justifyContent:"space-between",
                                     alignItems:"center" }}>
                        <div style={{ fontFamily:M, fontSize:"0.65rem",
                                       color:G, fontWeight:700 }}>
                          {displayValue(a.estimatedValue)}
                        </div>
                        {!["MARKETPLACE_LIVE","REJECTED"].includes(a.state) && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              userAssetStore.simulateAdvance(a.id);
                              refresh();
                            }}
                            style={{ padding:"0.25rem 0.625rem", borderRadius:4,
                                      border:`1px solid ${G}30`, background:`${G}10`,
                                      color:G, fontFamily:M, fontSize:"0.58rem",
                                      fontWeight:700, cursor:"pointer",
                                      letterSpacing:"0.04em", textTransform:"uppercase" }}>
                            ADVANCE →
                          </button>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {isSel && (
                        <div style={{ marginTop:"0.75rem", paddingTop:"0.75rem",
                                       borderTop:`1px solid ${BDR}40` }}>
                          {[
                            ["Jurisdiction",      a.jurisdiction ?? "—"],
                            ["Assigned Verifier", a.assignedVerifier ?? "—"],
                            ["Submitted",         new Date(a.createdAt).toLocaleDateString()],
                            ["Lending",           a.state==="MARKETPLACE_LIVE" ? "Available (60% LTV)" : "Not yet available"],
                          ].map(([k,v]) => (
                            <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                                   padding:"0.25rem 0",
                                                   borderBottom:`1px solid ${BDR}30` }}>
                              <Mono size="0.58rem" color={DIM}>{k}</Mono>
                              <Mono size="0.58rem" color={W}>{v}</Mono>
                            </div>
                          ))}
                          {a.aiNotes && (
                            <div style={{ marginTop:"0.5rem", padding:"0.5rem 0.625rem",
                                           borderRadius:4, background:`${B}08`,
                                           border:`1px solid ${B}25` }}>
                              <Mono size="0.55rem" color={B}>AI ASSESSMENT</Mono>
                              <div style={{ fontFamily:S, fontSize:"0.65rem",
                                             color:"rgba(255,255,255,0.5)",
                                             lineHeight:1.55, marginTop:3 }}>
                                {a.aiNotes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add new asset card */}
                <Link href="/terminal" style={{
                  background:"rgba(16,185,129,0.04)",
                  border:`1px dashed ${G}30`, borderRadius:8,
                  padding:"1.5rem 1rem", display:"flex",
                  flexDirection:"column", alignItems:"center",
                  justifyContent:"center", gap:"0.5rem",
                  textDecoration:"none", minHeight:160,
                }}>
                  <div style={{ fontFamily:M, fontSize:"1.25rem", color:`${G}50` }}>+</div>
                  <div style={{ fontFamily:M, fontSize:"0.65rem", fontWeight:700,
                                 color:`${G}70`, letterSpacing:"0.08em",
                                 textTransform:"uppercase" }}>
                    Submit Asset
                  </div>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── WYOMING GRID ── */}
        {panelTab === "wyoming" && (
          <div>
            {wyomingReqs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                <div style={{ fontFamily:"Georgia,serif", fontSize:"1rem",
                               fontWeight:700, color:"rgba(255,255,255,0.25)",
                               marginBottom:"0.625rem" }}>No Wyoming requests yet.</div>
                <Link href="/terminal" style={{
                  fontFamily:M, fontSize:"0.65rem", color:G,
                  textDecoration:"none", textTransform:"uppercase",
                  letterSpacing:"0.08em", border:`1px solid rgba(16,185,129,0.3)`,
                  padding:"0.5rem 1rem", borderRadius:4, display:"inline-block",
                }}>→ Tokenize a Business</Link>
              </div>
            ) : (
              <div style={{ display:"grid",
                             gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",
                             gap:"0.75rem" }}>
                {wyomingReqs.map(r => (
                  <div key={r.id} style={{
                    background:CARD, border:`1px solid ${G}25`,
                    borderLeft:`3px solid ${G}`, borderRadius:8, padding:"1rem",
                  }}>
                    <div style={{ fontFamily:M, fontSize:"0.72rem",
                                   fontWeight:700, color:W, marginBottom:"0.375rem" }}>
                      {r.companyName}
                    </div>
                    <div style={{ display:"flex", gap:"0.375rem",
                                   flexWrap:"wrap", marginBottom:"0.375rem" }}>
                      <span style={{ fontFamily:M, fontSize:"0.58rem", color:G,
                                      background:`${G}12`, borderRadius:3,
                                      padding:"1px 6px", textTransform:"uppercase",
                                      letterSpacing:"0.06em" }}>
                        {r.tier.toUpperCase()}
                      </span>
                      <span style={{ fontFamily:M, fontSize:"0.55rem",
                                      color:"rgba(255,255,255,0.3)" }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontFamily:M, fontSize:"0.52rem", fontWeight:700,
                                      color:G, background:`${G}12`, borderRadius:3,
                                      padding:"1px 5px", letterSpacing:"0.06em",
                                      textTransform:"uppercase" }}>
                        {r.lifecycleState}
                      </span>
                    </div>
                    {r.supabaseId && (
                      <div style={{ marginTop:"0.3rem" }}>
                        <Mono size="0.5rem" color={`${G}60`}>✓ Supabase synced</Mono>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lifecycle detail drawer (when asset selected) */}
        {panelTab === "assets" && selected && (() => {
          const sel = assets.find(a => a.id === selected);
          if (!sel) return null;
          return (
            <div style={{ marginTop:"1.5rem", background:CARD,
                           border:`1px solid ${G}25`, borderRadius:8,
                           overflow:"hidden" }}>
              <div style={{ padding:"0.875rem 1rem",
                             borderBottom:`1px solid ${BDR}`,
                             background:"#0A0D13",
                             display:"flex", justifyContent:"space-between",
                             alignItems:"center" }}>
                <div>
                  <Mono size="0.58rem" color={DIM}>ASSET DETAIL · {sel.id}</Mono>
                </div>
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  {(["overview","lifecycle","activity"] as const).map(t => (
                    <button key={t} onClick={() => setDetailTab(t)} style={{
                      padding:"0.25rem 0.625rem", borderRadius:3, border:"none",
                      background: detailTab===t ? `${G}15` : "transparent",
                      color: detailTab===t ? G : DIM,
                      fontFamily:M, fontSize:"0.6rem", fontWeight:700,
                      cursor:"pointer", textTransform:"uppercase",
                      letterSpacing:"0.06em",
                    }}>{t.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div style={{ padding:"1rem" }}>
                {detailTab === "overview" && (
                  <div style={{ display:"grid",
                                 gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
                                 gap:"0.5rem" }}>
                    {[
                      ["State",          sel.state.replace(/_/g," ")],
                      ["Asset Value",    displayValue(sel.estimatedValue)],
                      ["Jurisdiction",   sel.jurisdiction ?? "—"],
                      ["Verifier",       sel.assignedVerifier ?? "—"],
                      ["Tokenization",   ["TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE"].includes(sel.state) ? "Authorized" : "Pending"],
                      ["Lending",        sel.state==="MARKETPLACE_LIVE" ? "60% LTV Available" : "Not Yet Available"],
                    ].map(([k,v]) => (
                      <div key={k} style={{ padding:"0.625rem 0.75rem",
                                             background:"rgba(255,255,255,0.02)",
                                             borderRadius:5,
                                             border:`1px solid ${BDR}` }}>
                        <Mono size="0.55rem" color={DIM}>{k}</Mono>
                        <div style={{ fontFamily:M, fontSize:"0.72rem",
                                       fontWeight:700, color:W, marginTop:3 }}>
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {detailTab === "lifecycle" && (
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"0.25rem" }}>
                    {PIPELINE_STAGES.map((stage, i) => {
                      const idx = PIPELINE_STAGES.indexOf(sel.state as LifecycleState);
                      const done = i < idx; const active = i === idx;
                      const c = done ? G : active ? A : "rgba(255,255,255,0.15)";
                      return (
                        <div key={stage} style={{ padding:"0.35rem 0.625rem",
                                                   borderRadius:4,
                                                   border:`1px solid ${c}40`,
                                                   background:`${c}08` }}>
                          <Mono size="0.55rem" color={c}>
                            {done?"✓ ":active?"▶ ":""}{stage.replace(/_/g," ")}
                          </Mono>
                        </div>
                      );
                    })}
                  </div>
                )}
                {detailTab === "activity" && (
                  <div>
                    {(sel.timeline ?? []).length === 0
                      ? <Mono size="0.65rem" color={DIM}>No activity yet.</Mono>
                      : [...(sel.timeline??[])].reverse().map((e,i) => (
                          <div key={i} style={{ padding:"0.4rem 0",
                                                borderBottom:`1px solid ${BDR}30`,
                                                display:"flex", gap:"0.625rem" }}>
                            <div style={{ width:5, height:5, borderRadius:"50%",
                                           background:G, flexShrink:0, marginTop:6 }}/>
                            <div>
                              <div style={{ fontFamily:S, fontSize:"0.68rem",
                                             color:W }}>{e.note}</div>
                              <Mono size="0.55rem" color={DIM}>
                                {new Date(e.at).toLocaleString()} · {e.actor}
                              </Mono>
                            </div>
                          </div>
                        ))
                    }
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
