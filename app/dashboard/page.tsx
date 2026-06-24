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
import { UserProfile }             from "@/components/profile/UserProfile";
import { MyAbraxas }               from "@/components/dashboard/MyAbraxas";
import { SophiaCircuit }           from "@/components/dashboard/SophiaCircuit";
import { PurchaseLifecycleAdmin }  from "@/components/dashboard/PurchaseLifecycleAdmin";
import { ContentSection }          from "@/components/terminal/ContentSection";
import { SiteFooter }              from "@/components/SiteFooter";
import { BottomNav }               from "@/components/BottomNav";

/* ── design tokens ─────────────────────────────────────────── */
const M    = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const S    = "system-ui,-apple-system,sans-serif";
const BG   = "#FAFAF8";
const CARD = "#FFFFFF";
const BDR  = "#E5E5E0";
const G    = "#10B981";
const A    = "#F59E0B";
const B    = "#3B82F6";
const P    = "#8B5CF6";
const R    = "#EF4444";
const W    = "#15151A";
const DIM  = "rgba(255,255,255,0.35)";

/* ── helpers ────────────────────────────────────────────────── */
function parseAssetValue(v: string | undefined): number {
  if (!v || v === "Not specified" || v.trim() === "") return 0;
  const n = parseFloat(v.replace(/[,$]/g, ""));
  return isNaN(n) ? 0 : n;
}
function displayValue(v: string | undefined): string {
  const n = parseAssetValue(v);
  if (n === 0) return "N/A";
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
  const [idvStatus, setIdvStatus] = useState<'idle'|'verified'|'unverified'>('idle');
  const [walletAddr, setWalletAddr] = useState<string | null>(null);
  const [credentialLevel, setCredentialLevel] = useState<string|null>(null);

  function refresh() {
    const s = sessionStore.get();
    setSession(s);
    const mine = userAssetStore.listMine();
    setAssets(mine);
    if (mine.length > 0 && !selected) setSelected(mine[0].id);
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

  // Platform-wide verified asset value, not a per-user computation,
  // that's a different, future feature. Hardcoded until live
  // portfolio calculations across all verified assets are wired in.
  const platformVerifiedValue = "Just Under $2M Verified Assets";

  const STAT_CARDS = [
    { label: "Total Assets",  val: assets.length, color: W },
    { label: "In Review",     val: assets.filter(a => ["IDENTITY_REVIEW","OWNERSHIP_REVIEW","LEGAL_REVIEW","DUE_DILIGENCE","RISK_SCORING","APPROVAL_COMMITTEE"].includes(a.state)).length, color: A },
    { label: "Authorized",    val: assets.filter(a => ["TOKENIZATION_AUTH","MINTED","MARKETPLACE_LIVE"].includes(a.state)).length, color: G },
    { label: "Platform Verified Value", val: platformVerifiedValue, color: G },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex",
                   flexDirection: "column", fontFamily: M, color: "var(--text-primary)" }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "var(--nav-bg)",
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
                          fontWeight: 900, color: "var(--text-primary)", letterSpacing: "0.08em" }}>
            ABRAXAS
          </span>
        </Link>

        <div style={{ width: 1, height: 20, background: BDR, flexShrink: 0 }}/>

        <span style={{ fontFamily: M, fontSize: "0.72rem", fontWeight: 700,
                        color: G, letterSpacing: "0.1em",
                        textTransform: "uppercase" }}>Dashboard</span>

        <div style={{ flex: 1 }}/>

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
          {idvStatus !== "verified" && (
            <Link href="/passport" style={{
              fontFamily:M, fontSize:"0.58rem", fontWeight:900, color:"#000",
              background:G, textDecoration:"none", letterSpacing:"0.08em",
              textTransform:"uppercase", padding:"0.35rem 0.75rem",
              borderRadius:4, display:"inline-block",
              boxShadow:`0 0 10px ${G}40`,
            }}>GET VERIFIED →</Link>
          )}
        </div>
        <div style={{ fontFamily:M, fontSize:"0.52rem",
                       color:"rgba(21,21,26,0.15)", letterSpacing:"0.08em" }}>
          {assets.length} ASSET{assets.length !== 1 ? "S" : ""} ·{" "}
        </div>
      </div>

      {/* ── USER PROFILE, always visible, this is core to the dashboard now ── */}
      <div style={{ padding:"0 clamp(0.875rem,2vw,1.5rem) 0.875rem" }}>
        <UserProfile walletAddress={walletAddr} />
      </div>

      {/* ── STAT CARDS ──────────────────────────────────────── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))",
        gap: "1px", background: BDR,
        borderBottom: `1px solid ${BDR}`,
      }}>
        {STAT_CARDS.map(s => {
          const isLongText = typeof s.val === "string" && s.val.length > 8;
          return (
            <div key={s.label} style={{ background: CARD, padding: "0.875rem 1rem" }}>
              <Mono size="0.6rem" color={DIM}>{s.label.toUpperCase()}</Mono>
              <div style={{ fontFamily: M, fontSize: isLongText ? "0.92rem" : "1.5rem",
                             fontWeight: 900, lineHeight: 1.3,
                             color: s.color, marginTop: "0.25rem" }}>
                {s.val}
              </div>
            </div>
          );
        })}
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
          <Link href="/terminal#deal-pipeline" style={{
            padding:"0.6rem 1.125rem", borderRadius:20,
            border:`1px solid ${BDR}`, background:"transparent",
            color:"rgba(21,21,26,0.6)", fontFamily:"'Inter',system-ui,sans-serif",
            fontSize:"0.8rem", fontWeight:600, textDecoration:"none",
          }}>
            Browse investment opportunities
          </Link>
          {idvStatus !== "verified" && (
            <Link href="/passport" style={{
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

        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius:10,
                       padding:"1.25rem clamp(0.875rem,3vw,1.5rem)", marginBottom:"1.5rem" }}>
          <ContentSection
            onSubmit={() => { window.location.href = "/build"; }}
            onTrust={() => { window.location.href = "/terminal"; }}
          />
        </div>

        {/* Sophia and Circuit clustered right here, the official
            auditor layer for everything in the pipeline above,
            this pairing is the point, not separated by other content */}
        <SophiaCircuit />

        <PurchaseLifecycleAdmin />

        {/* Submit asset prompt for users with no submitted assets */}
        {assets.length === 0 && (
          <div style={{ textAlign:"center", padding:"2rem 1rem",
                         borderRadius:12, border:`1px dashed ${BDR}`,
                         marginBottom:"1.5rem" }}>
            <div style={{ fontFamily:S, fontSize:"0.92rem", fontWeight:700,
                           color:"rgba(21,21,26,0.35)", marginBottom:"0.5rem" }}>
              No assets submitted yet
            </div>
            <div style={{ fontFamily:S, fontSize:"0.75rem",
                           color:"rgba(21,21,26,0.2)", marginBottom:"1rem",
                           lineHeight:1.65 }}>
              Once you submit and verify an asset, it shows up here
              with its verification status and investment structure.
            </div>
            <Link href="/terminal" style={{
              fontFamily:S, fontSize:"0.8rem", fontWeight:700, color:G,
              textDecoration:"none", border:`1px solid ${G}30`,
              padding:"0.5rem 1.25rem", borderRadius:8, display:"inline-block",
            }}>Submit an asset →</Link>
          </div>
        )}

      </div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}

