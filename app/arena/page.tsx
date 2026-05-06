// FILE: app/arena/page.tsx
// Abraxas Collector Arena — Anchor-aligned interactive duel system.
// State models derived from on-chain Vault + DuelRecord accounts.
// Navigation never breaks: all async is guarded, all renders have fallbacks.
// Image system: resolveImage() handles https/ipfs/ar/undefined.
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArenaAsset, DuelBattle, DuelRecord, DuelResolvedEvent,
  resolveImage, resolveDuelSimulated, SEED_ASSETS,
} from "@/lib/arena/duelEngine";

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
type SVGProps = { size?: number; color?: string; style?: React.CSSProperties };
const I = (d: string) => ({ size = 16, color, style }: SVGProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color ?? "currentColor"} strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d={d} />
  </svg>
);
const ShieldIcon = I("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
const SwordsIcon = ({ size = 16, style }: SVGProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
    <line x1="13" y1="19" x2="19" y2="13"/>
    <line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="19" y1="21" x2="21" y2="19"/>
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
    <line x1="5" y1="14" x2="9" y2="18"/>
    <line x1="7" y1="11" x2="11" y2="15"/>
  </svg>
);
const ZapIcon   = I("M13 2L3 14h9l-1 8 10-12h-9l1-8z");
const TrendIcon = ({ size = 16, style }: SVGProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

// ─── Vault state labels (matches Vault.state: 0=normal,1=circuit_triggered,2=paused)
const VAULT_STATE_CONFIG = {
  0: { label: "NORMAL",   color: "#3dd68c" },
  1: { label: "TRIGGERED",color: "#f26b6b" },
  2: { label: "PAUSED",   color: "#FBBF24" },
} as const;

// ─── Safe image component ──────────────────────────────────────────────────────
function SafeImage({ src, alt, fallbackIcon, color, height = 160 }: {
  src?: string; alt: string; fallbackIcon: string; color: string; height?: number;
}) {
  const resolved            = resolveImage(src);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Reset when src changes
  useEffect(() => { setFailed(false); setLoaded(false); }, [resolved]);

  return (
    <div style={{
      height, width: "100%", position: "relative", overflow: "hidden",
      background: `linear-gradient(135deg, ${color}22, ${color}08)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {!failed && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={resolved}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover",
            opacity: loaded ? 1 : 0, transition: "opacity 0.3s",
            position: "absolute", inset: 0,
          }}
        />
      )}
      {/* Fallback icon — always rendered underneath, visible when image fails or loading */}
      <span style={{
        fontSize: "3rem",
        filter: `drop-shadow(0 0 12px ${color}88)`,
        opacity: (failed || !loaded) ? 1 : 0,
        transition: "opacity 0.3s",
        position: "absolute",
        zIndex: 0,
      }}>
        {fallbackIcon}
      </span>
    </div>
  );
}

// ─── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.5rem", color: "rgba(255,255,255,0.35)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <span>{label}</span><span style={{ color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "3px" }}>
        <div style={{ width: `${value}%`, height: "100%", background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: "2px", transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

// ─── Arena asset card ─────────────────────────────────────────────────────────
interface AssetCardProps {
  asset:     ArenaAsset;
  mode:      "gallery" | "duel" | "stake";
  selected:  boolean;
  onSelect:  (id: string) => void;
  onStake?:  (id: string) => void;
}

function AssetCard({ asset, mode, selected, onSelect, onStake }: AssetCardProps) {
  const vc     = VAULT_STATE_CONFIG[asset.vaultState] ?? VAULT_STATE_CONFIG[0];
  const riskC  = asset.riskLevel > 180 ? "#f26b6b" : asset.riskLevel > 90 ? "#FBBF24" : "#3dd68c";

  return (
    <div
      onClick={() => onSelect(asset.id)}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${asset.color}20, ${asset.color}08)`
          : "rgba(10,12,22,0.95)",
        border: `1px solid ${selected ? asset.color + "80" : asset.color + "25"}`,
        borderRadius: "14px",
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: selected ? `0 0 24px ${asset.color}22` : "none",
        transform: selected ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      {/* Selected overlay */}
      {selected && mode === "duel" && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: `${asset.color}08`,
          boxShadow: `inset 0 0 20px ${asset.color}22`,
        }} />
      )}

      <SafeImage src={asset.image} alt={asset.name} fallbackIcon={asset.icon} color={asset.color} height={130} />

      {/* State badges */}
      <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
        <span style={{ fontSize: "0.46rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(0,0,0,0.72)", color: asset.color, letterSpacing: "0.06em" }}>
          {asset.rarity.toUpperCase().slice(0, 10)}
        </span>
        <span style={{ fontSize: "0.44rem", fontWeight: 700, padding: "0.08rem 0.3rem", borderRadius: "3px", background: "rgba(0,0,0,0.72)", color: vc.color, letterSpacing: "0.04em" }}>
          {vc.label}
        </span>
      </div>
      <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem" }}>
        <span style={{ fontSize: "0.48rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: "3px", background: "rgba(0,0,0,0.72)", color: "#FBBF24" }}>
          {asset.grade}
        </span>
      </div>

      {/* Defense/staked status */}
      <div style={{ position: "absolute", bottom: "0.5rem", left: "0.5rem", display: "flex", gap: "0.25rem" }}>
        {asset.protected && (
          <span style={{ fontSize: "0.44rem", padding: "0.08rem 0.3rem", borderRadius: "3px", background: "rgba(61,214,140,0.2)", color: "#3dd68c", border: "1px solid rgba(61,214,140,0.3)" }}>
            ARMED
          </span>
        )}
        {asset.staked && (
          <span style={{ fontSize: "0.44rem", padding: "0.08rem 0.3rem", borderRadius: "3px", background: "rgba(107,140,255,0.2)", color: "#6b8cff", border: "1px solid rgba(107,140,255,0.3)" }}>
            STAKED
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "0.625rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.375rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.78rem", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#f0f0f0" }}>{asset.name}</div>
            <div style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>{asset.series}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "0.4rem" }}>
            <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "#fff" }}>{asset.priceSol.toFixed(0)}</div>
            <div style={{ fontSize: "0.46rem", color: "rgba(255,255,255,0.3)" }}>SOL</div>
          </div>
        </div>

        {/* Risk level bar — maps to Vault.risk_level (0-255) */}
        <div style={{ marginBottom: "0.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Risk Level</span>
            <span style={{ color: riskC, fontWeight: 700 }}>{asset.riskLevel}/255</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "3px" }}>
            <div style={{ width: `${(asset.riskLevel / 255) * 100}%`, height: "100%", background: riskC, borderRadius: "2px", transition: "width 0.5s" }} />
          </div>
        </div>

        {/* Duel stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.18rem", marginBottom: "0.5rem" }}>
          <StatBar label="PWR" value={asset.power}   color={asset.color} />
          <StatBar label="DEF" value={asset.defense} color="#3dd68c" />
          <StatBar label="SPD" value={asset.speed}   color="#6b8cff" />
        </div>

        {/* Mode-specific action */}
        {mode === "duel" && (
          <div style={{ fontSize: "0.6rem", fontWeight: 700, textAlign: "center", padding: "0.25rem", borderRadius: "5px", background: selected ? `${asset.color}18` : "transparent", color: selected ? asset.color : "rgba(255,255,255,0.3)", border: `1px solid ${selected ? asset.color + "40" : "transparent"}`, transition: "all 0.2s" }}>
            {selected ? "✓ Selected" : "Click to Select"}
          </div>
        )}
        {mode === "stake" && (
          <button
            onClick={(e) => { e.stopPropagation(); onStake?.(asset.id); }}
            style={{ width: "100%", padding: "0.3rem", borderRadius: "6px", fontSize: "0.6rem", fontWeight: 700, background: asset.staked ? "rgba(242,107,107,0.12)" : "rgba(61,214,140,0.1)", border: `1px solid ${asset.staked ? "rgba(242,107,107,0.3)" : "rgba(61,214,140,0.25)"}`, color: asset.staked ? "#f26b6b" : "#3dd68c", cursor: "pointer" }}>
            {asset.staked ? "Unstake" : "Stake"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Duel panel ───────────────────────────────────────────────────────────────
function DuelPanel({ battle, onClear }: { battle: DuelBattle; onClear: () => void }) {
  const { assetA, assetB, event, log } = battle;
  const winner = event?.winner && event.winner !== "draw"
    ? (event.winner === assetA?.id ? assetA : assetB)
    : null;
  const draw   = event?.winner === "draw";

  const RISK_SIGNAL_LABELS = { 0:"LOW", 1:"MEDIUM", 2:"HIGH", 3:"CRITICAL" };
  const RISK_SIGNAL_COLORS = { 0:"#3dd68c", 1:"#FBBF24", 2:"#fb923c", 3:"#f26b6b" };

  return (
    <div style={{ background: "rgba(10,12,22,0.97)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: "16px", padding: "1.25rem", marginBottom: "1rem" }}>
      {/* Matchup header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
        {[assetA, assetB].map((asset, i) => (
          <div key={i} style={{ textAlign: i === 0 ? "left" : "right" }}>
            {asset ? (
              <>
                <SafeImage src={asset.image} alt={asset.name} fallbackIcon={asset.icon} color={asset.color} height={80} />
                <div style={{ fontWeight: 700, fontSize: "0.8rem", marginTop: "0.3rem", color: event ? (winner?.id === asset.id ? "#3dd68c" : draw ? "#FBBF24" : "#f26b6b") : "#f0f0f0" }}>
                  {asset.name}
                </div>
                <div style={{ fontSize: "0.54rem", color: "rgba(255,255,255,0.35)" }}>{asset.grade}</div>
                {event && (
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, color: winner?.id === asset.id ? "#3dd68c" : draw ? "#FBBF24" : "#f26b6b", marginTop: "0.2rem" }}>
                    {winner?.id === asset.id ? "VICTORY" : draw ? "DRAW" : "DEFEATED"}
                  </div>
                )}
              </>
            ) : (
              <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: i === 0 ? "flex-start" : "flex-end" }}>
                <div style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Select card</div>
              </div>
            )}
          </div>
        ))}
        <div style={{ textAlign: "center" }}>
          <SwordsIcon size={28} style={{ color: "rgba(255,107,53,0.6)" }} />
        </div>
      </div>

      {/* Event data — maps to DuelResolvedEvent fields */}
      {event && (
        <div style={{ marginBottom: "0.75rem", padding: "0.625rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
            <div>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Risk Signal</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: RISK_SIGNAL_COLORS[event.riskSignal] }}>
                {RISK_SIGNAL_LABELS[event.riskSignal]}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Vault State</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: VAULT_STATE_CONFIG[event.newVaultState]?.color ?? "#fff" }}>
                {VAULT_STATE_CONFIG[event.newVaultState]?.label ?? "UNKNOWN"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>$ABRA Burn</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f26b6b" }}>0.5</div>
            </div>
          </div>
        </div>
      )}

      {/* Agent reasoning log */}
      {log.length > 0 && (
        <div style={{ background: "rgba(2,3,10,0.97)", border: "1px solid rgba(107,140,255,0.15)", borderRadius: "8px", padding: "0.625rem", maxHeight: "160px", overflowY: "auto", fontFamily: "'JetBrains Mono',monospace", marginBottom: "0.75rem" }}>
          {log.map((line, i) => (
            <p key={i} style={{ margin: "0 0 0.2rem", fontSize: "0.58rem", lineHeight: 1.5, color: i === 0 ? "#60A5FA" : `rgba(96,165,250,${Math.max(0.2, 0.85 - i * 0.05)})` }}>
              {line}
            </p>
          ))}
        </div>
      )}

      <button onClick={onClear} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}>
        New Duel
      </button>
    </div>
  );
}

// ─── Main Arena page ──────────────────────────────────────────────────────────
type Mode = "gallery" | "duel" | "stake";

export default function ArenaPage() {
  // ── Core state — never undefined, always initialised ──────────────────────
  const [assets,    setAssets]    = useState<ArenaAsset[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [mode,      setMode]      = useState<Mode>("gallery");
  const [filter,    setFilter]    = useState<ArenaAsset["category"] | "all">("all");
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [abraBurned, setAbraBurned] = useState(0);
  const [battle, setBattle] = useState<DuelBattle>({
    record: null, assetA: null, assetB: null,
    status: "idle", event: null, log: [],
  });

  // Load assets safely — never throws, always sets loading=false
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // In production: fetch from /api/duel (DuelRecord PDAs) + NFT metadata
        // For now: use seed data derived from on-chain structure
        await new Promise(r => setTimeout(r, 300)); // simulate fetch latency
        if (!cancelled) {
          setAssets(SEED_ASSETS);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load assets");
          setAssets(SEED_ASSETS); // always show something
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Selection logic ───────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string) => {
    if (mode !== "duel") return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 2) {
        next.add(id);
      } else {
        // Replace the first selected with new selection
        const [first] = Array.from(next);
        next.delete(first);
        next.add(id);
      }
      return next;
    });
    setBattle(prev => ({ ...prev, status: "idle", event: null, log: [] }));
  }, [mode]);

  // ── Start duel ────────────────────────────────────────────────────────────
  const startDuel = useCallback(() => {
    const sel = assets.filter(a => selected.has(a.id));
    if (sel.length !== 2) return;
    // Check vault state — mirrors Anchor require!(!vault.is_paused, CardsError::VaultPaused)
    if (sel.some(a => a.vaultState === 2)) {
      setBattle(prev => ({
        ...prev,
        status: "idle",
        log: ["[ERROR] Duel blocked — vault is paused (VaultState=2). Anchor: CardsError::VaultPaused"],
      }));
      return;
    }
    setBattle({
      record: null, assetA: sel[0], assetB: sel[1],
      status: "ready", event: null, log: [
        `[READY] ${sel[0].name} vs ${sel[1].name}`,
        `[CHECK] Vault states: ${sel[0].vaultState} / ${sel[1].vaultState} — OK`,
        "[READY] Click Resolve to execute duel on-chain",
      ],
    });
  }, [assets, selected]);

  // ── Resolve duel — calls Anchor-aligned simulation ────────────────────────
  const resolveDuel = useCallback(async () => {
    if (!battle.assetA || !battle.assetB || battle.status !== "ready") return;
    setBattle(prev => ({ ...prev, status: "resolving" }));

    await new Promise(r => setTimeout(r, 800)); // simulate on-chain latency

    const result = resolveDuelSimulated(battle.assetA!, battle.assetB!);
    setAbraBurned(prev => prev + 0.5);

    // Update asset vault states based on DuelResolvedEvent.newVaultState
    // In production: refetch Vault PDA after tx confirmation
    if (result.event.newVaultState === 1) {
      setAssets(prev => prev.map(a =>
        selected.has(a.id) ? { ...a, vaultState: 1 as const, protected: false } : a
      ));
    }

    setBattle(prev => ({
      ...prev,
      record:  result.record,
      event:   result.event,
      status:  "resolved",
      log:     result.log,
    }));
  }, [battle, selected]);

  // ── Stake toggle ──────────────────────────────────────────────────────────
  const handleStake = useCallback((id: string) => {
    setAssets(prev => prev.map(a =>
      a.id === id ? { ...a, staked: !a.staked } : a
    ));
    setAbraBurned(prev => prev + 0.1);
  }, []);

  // ── Clear battle ──────────────────────────────────────────────────────────
  const clearBattle = useCallback(() => {
    setSelected(new Set());
    setBattle({ record: null, assetA: null, assetB: null, status: "idle", event: null, log: [] });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const filtered     = assets.filter(a => filter === "all" || a.category === filter);
  const selArray     = assets.filter(a => selected.has(a.id));
  const canStartDuel = mode === "duel" && selected.size === 2 && battle.status === "idle";
  const canResolve   = battle.status === "ready";

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.25rem 3rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "0.75rem" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ borderRadius: "14px", overflow: "hidden", background: "rgba(10,12,22,0.95)", border: "1px solid rgba(255,255,255,0.06)", height: 340, animation: "pulse 1.5s ease-in-out infinite" }}>
            <div style={{ height: 130, background: "rgba(255,255,255,0.04)" }} />
            <div style={{ padding: "0.625rem" }}>
              <div style={{ height: "0.8rem", background: "rgba(255,255,255,0.06)", borderRadius: "4px", marginBottom: "0.4rem" }} />
              <div style={{ height: "0.6rem", background: "rgba(255,255,255,0.04)", borderRadius: "4px", width: "60%" }} />
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "1.5rem 1.25rem 3rem" }}>

      {/* Error banner — non-blocking */}
      {error && (
        <div style={{ padding: "0.625rem 1rem", background: "rgba(242,107,107,0.08)", border: "1px solid rgba(242,107,107,0.2)", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.7rem", color: "#f26b6b" }}>
          ⚠ {error} — showing cached data
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p style={{ fontSize: "0.56rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: "0.2rem" }}>
              Collector Crypt · $CARDS Program
            </p>
            <h1 style={{ fontWeight: 800, fontSize: "clamp(1.4rem,3.5vw,1.9rem)", letterSpacing: "-0.02em", margin: 0 }}>
              Collector Arena
            </h1>
          </div>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--gold,#C8A96E)" }}>
                {assets.reduce((s, a) => s + a.priceSol, 0).toFixed(0)} SOL
              </div>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Portfolio</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#3dd68c" }}>
                {assets.filter(a => a.staked).length}
              </div>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Staked</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f26b6b", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <ZapIcon size={14} style={{ color: "#f26b6b" }} />{abraBurned.toFixed(1)}
              </div>
              <div style={{ fontSize: "0.52rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>$ABRA Burned</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "1.1rem", flexWrap: "wrap", alignItems: "center" }}>
        {(["gallery","duel","stake"] as Mode[]).map(m => (
          <button key={m} onClick={() => { setMode(m); setSelected(new Set()); clearBattle(); }}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.875rem", borderRadius: "8px", border: `1px solid ${mode === m ? "rgba(107,140,255,0.4)" : "rgba(255,255,255,0.08)"}`, background: mode === m ? "rgba(107,140,255,0.12)" : "transparent", color: mode === m ? "#6b8cff" : "rgba(255,255,255,0.4)", fontSize: "0.7rem", fontWeight: mode === m ? 700 : 400, cursor: "pointer", textTransform: "capitalize" }}>
            {m === "gallery" && <ShieldIcon size={12} style={{ color: mode === m ? "#6b8cff" : undefined }} />}
            {m === "duel"    && <SwordsIcon size={12} />}
            {m === "stake"   && <TrendIcon  size={12} />}
            {m}
          </button>
        ))}

        {/* Category filter */}
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem" }}>
          {(["all","pokemon","onepiece","luxury"] as const).map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: "0.3rem 0.5rem", borderRadius: "5px", border: `1px solid ${filter === cat ? "var(--gold,#C8A96E)" : "rgba(255,255,255,0.08)"}`, background: filter === cat ? "rgba(200,169,110,0.1)" : "transparent", color: filter === cat ? "#C8A96E" : "rgba(255,255,255,0.35)", fontSize: "0.6rem", fontWeight: filter === cat ? 700 : 400, cursor: "pointer" }}>
              {cat === "all" ? "All" : cat === "pokemon" ? "Pokémon" : cat === "onepiece" ? "One Piece" : "Luxury"}
            </button>
          ))}
        </div>
      </div>

      {/* Duel action bar */}
      {mode === "duel" && (
        <div style={{ padding: "0.75rem 1rem", background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: "10px", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
            {selected.size === 0 && "Select 2 assets to duel"}
            {selected.size === 1 && `${selArray[0]?.name} selected — pick opponent`}
            {selected.size === 2 && battle.status === "idle" && `${selArray[0]?.name} vs ${selArray[1]?.name} — ready`}
            {battle.status === "ready" && "Duel ready — resolve to execute"}
            {battle.status === "resolving" && "Resolving on-chain…"}
            {battle.status === "resolved" && "Duel complete — new duel below"}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {canStartDuel && (
              <button onClick={startDuel}
                style={{ background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.35)", borderRadius: "7px", padding: "0.4rem 0.875rem", fontSize: "0.7rem", fontWeight: 700, color: "#FF6B35", cursor: "pointer" }}>
                Start Duel →
              </button>
            )}
            {canResolve && (
              <button onClick={resolveDuel}
                style={{ background: "#FF6B35", border: "none", borderRadius: "7px", padding: "0.4rem 0.875rem", fontSize: "0.72rem", fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                ⚔ Resolve Duel (0.5 $ABRA)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Battle panel — only when battle has cards or log */}
      {(battle.assetA || battle.log.length > 0) && (
        <DuelPanel battle={battle} onClear={clearBattle} />
      )}

      {/* Asset grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,180px),1fr))", gap: "0.75rem" }}>
        {filtered.map(asset => (
          <AssetCard key={asset.id} asset={asset} mode={mode}
            selected={selected.has(asset.id)}
            onSelect={handleSelect}
            onStake={handleStake} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.72rem" }}>
          No assets in this category.
        </div>
      )}
    </div>
  );
}