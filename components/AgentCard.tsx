// FILE: components/AgentCard.tsx
// Premium AgentCard / PokemonCard component.
// 3D tilt via CSS transform on mousemove (no Framer Motion needed).
// Rarity-based neon glows using CSS custom properties.
// Actions: Tokenize as RWA · Deploy to Arena · Stake
"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { PokemonCard } from "@/lib/pokemonApi";

// ─── Rarity config ────────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<string, {
  glow: string; border: string; badge: string; badgeText: string; shimmer: string;
}> = {
  "Rare Holo":         { glow:"rgba(168,85,247,0.6)",  border:"#a855f7", badge:"bg-purple-900/80",  badgeText:"text-purple-300",  shimmer:"from-purple-500/20" },
  "Rare Ultra":        { glow:"rgba(250,204,21,0.7)",   border:"#facc15", badge:"bg-yellow-900/80",  badgeText:"text-yellow-300",  shimmer:"from-yellow-400/20" },
  "Rare Rainbow":      { glow:"rgba(99,255,240,0.7)",   border:"#63fff0", badge:"bg-cyan-900/80",    badgeText:"text-cyan-300",    shimmer:"from-cyan-400/20"   },
  "Illustration Rare": { glow:"rgba(236,72,153,0.7)",   border:"#ec4899", badge:"bg-pink-900/80",    badgeText:"text-pink-300",    shimmer:"from-pink-400/20"   },
  "Rare Secret":       { glow:"rgba(251,146,60,0.8)",   border:"#fb923c", badge:"bg-orange-900/80",  badgeText:"text-orange-300",  shimmer:"from-orange-400/20" },
  "Common":            { glow:"rgba(96,165,250,0.3)",   border:"rgba(96,165,250,0.3)", badge:"bg-blue-900/60", badgeText:"text-blue-400", shimmer:"from-blue-400/10" },
  "default":           { glow:"rgba(107,140,255,0.5)",  border:"#6b8cff", badge:"bg-indigo-900/80", badgeText:"text-indigo-300",  shimmer:"from-indigo-400/20" },
};

const TYPE_COLORS: Record<string, string> = {
  Fire:"text-orange-400", Water:"text-blue-400", Lightning:"text-yellow-400",
  Psychic:"text-purple-400", Grass:"text-green-400", Fighting:"text-red-400",
  Darkness:"text-gray-400", Metal:"text-slate-300", Dragon:"text-cyan-400",
  Colorless:"text-gray-300",
};

function getRarityConfig(rarity?: string) {
  if (!rarity) return RARITY_CONFIG.default;
  for (const key of Object.keys(RARITY_CONFIG)) {
    if (rarity.toLowerCase().includes(key.toLowerCase())) return RARITY_CONFIG[key];
  }
  return RARITY_CONFIG.default;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
export function AgentCardSkeleton() {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-void border border-white/5 animate-pulse" style={{ height: 420 }}>
      <div className="h-56 bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-white/8 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-white/5 rounded-xl flex-1" />
          <div className="h-8 bg-white/5 rounded-xl flex-1" />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface AgentCardProps {
  card:        PokemonCard;
  onTokenize?: (card: PokemonCard) => void;
  onArena?:    (card: PokemonCard) => void;
  onStake?:    (card: PokemonCard) => void;
  selected?:   boolean;
  compact?:    boolean;
}

export function AgentCard({ card, onTokenize, onArena, onStake, selected, compact }: AgentCardProps) {
  const rc       = getRarityConfig(card.rarity);
  const cardRef  = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glowX: 50, glowY: 50 });
  const [hovered, setHovered] = useState(false);
  const [imgErr, setImgErr]   = useState(false);
  const [actionState, setActionState] = useState<"idle" | "tokenizing" | "deploying" | "staking">("idle");

  // CSS 3D tilt on mousemove
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || compact) return;
    const rect   = cardRef.current.getBoundingClientRect();
    const cx     = (e.clientX - rect.left) / rect.width;
    const cy     = (e.clientY - rect.top)  / rect.height;
    const rotX   = (cy - 0.5) * -18;
    const rotY   = (cx - 0.5) *  18;
    setTilt({ x: rotX, y: rotY, glowX: cx * 100, glowY: cy * 100 });
  }, [compact]);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
    setTilt({ x: 0, y: 0, glowX: 50, glowY: 50 });
  }, []);

  const typeColor = card.types?.[0] ? (TYPE_COLORS[card.types[0]] ?? "text-gray-300") : "text-gray-300";
  const riskColor = (card.circuitScore ?? 50) > 60 ? "#f26b6b" : (card.circuitScore ?? 50) > 35 ? "#FBBF24" : "#3dd68c";

  async function handleTokenize() {
    setActionState("tokenizing");
    await new Promise(r => setTimeout(r, 1200));
    onTokenize?.(card);
    setActionState("idle");
  }
  async function handleArena() {
    setActionState("deploying");
    await new Promise(r => setTimeout(r, 800));
    onArena?.(card);
    setActionState("idle");
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => !compact && (onArena?.(card))}
      style={{
        transform: hovered
          ? `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(8px)`
          : "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)",
        transition: hovered ? "transform 0.1s ease" : "transform 0.4s ease",
        boxShadow: hovered
          ? `0 0 30px ${rc.glow}, 0 0 60px ${rc.glow}55, inset 0 0 20px ${rc.glow}11`
          : selected
          ? `0 0 20px ${rc.glow}`
          : "0 4px 20px rgba(0,0,0,0.5)",
        border: `1px solid ${selected ? rc.border : rc.border + "44"}`,
        borderRadius: "16px",
        overflow: "hidden",
        background: "rgba(7,10,18,0.95)",
        cursor: "pointer",
        position: "relative",
        willChange: "transform",
      }}
    >
      {/* Holographic shimmer overlay — active on hover */}
      {hovered && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
          background: `radial-gradient(circle at ${tilt.glowX}% ${tilt.glowY}%, ${rc.glow}22 0%, transparent 60%)`,
          transition: "background 0.05s",
        }} />
      )}

      {/* Card image */}
      <div style={{ position: "relative", height: compact ? 100 : 200, overflow: "hidden", background: `linear-gradient(135deg, ${rc.border}18, transparent)` }}>
        {!imgErr ? (
          <Image
            src={card.images.large}
            alt={card.name}
            fill
            sizes="(max-width:640px) 100vw, 300px"
            className="object-cover"
            style={{ objectFit: "cover" }}
            onError={() => setImgErr(true)}
            priority={false}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "3rem" }}>
            {card.types?.[0] === "Fire" ? "🔥" : card.types?.[0] === "Water" ? "💧" : card.types?.[0] === "Lightning" ? "⚡" : "◈"}
          </div>
        )}

        {/* Rarity badge */}
        {card.rarity && (
          <div style={{
            position: "absolute", top: "0.5rem", left: "0.5rem",
            padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.5rem", fontWeight: 700,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
            color: rc.border, border: `1px solid ${rc.border}55`, letterSpacing: "0.06em",
          }}>
            {card.rarity.toUpperCase().slice(0, 12)}
          </div>
        )}

        {/* HP */}
        {card.hp && !compact && (
          <div style={{
            position: "absolute", top: "0.5rem", right: "0.5rem",
            padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.55rem", fontWeight: 700,
            background: "rgba(0,0,0,0.75)", color: "#f26b6b", letterSpacing: "0.04em",
          }}>
            HP {card.hp}
          </div>
        )}

        {/* Set name */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "1.5rem 0.5rem 0.35rem",
          background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          fontSize: "0.52rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em",
        }}>
          {card.set.name} #{card.number}
        </div>
      </div>

      {/* Card info */}
      <div style={{ padding: compact ? "0.5rem" : "0.75rem" }}>
        {/* Name + type */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: compact ? "0.78rem" : "0.95rem", lineHeight: 1.2, color: "#f0f0f0" }}>{card.name}</div>
            {card.types && (
              <div style={{ fontSize: "0.56rem", fontWeight: 600, marginTop: "1px",
                color: TYPE_COLORS[card.types[0]] ?? "#aaa" }}>
                {card.types.join(" · ")} · {card.subtypes?.[0]}
              </div>
            )}
          </div>
          {card.priceSol !== undefined && (
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "0.5rem" }}>
              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#fff" }}>{card.priceSol.toFixed(1)}</div>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.35)" }}>SOL</div>
            </div>
          )}
        </div>

        {/* Stats row */}
        {!compact && (
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.625rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Circuit Risk</div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "2px", height: "3px" }}>
                <div style={{ width: `${card.circuitScore ?? 40}%`, height: "100%", background: riskColor, borderRadius: "2px", transition: "width 0.5s" }} />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>APY</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#3dd68c" }}>{card.stakeApy ?? 12}%</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!compact && (
          <div style={{ display: "flex", gap: "0.375rem" }}>
            <button
              onClick={(e) => { e.stopPropagation(); handleTokenize(); }}
              disabled={actionState !== "idle"}
              style={{
                flex: 1, padding: "0.4rem 0.3rem", borderRadius: "8px", fontSize: "0.6rem", fontWeight: 700,
                background: actionState === "tokenizing" ? "rgba(168,85,247,0.15)" : "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.35)", color: "#a855f7", cursor: "pointer",
                letterSpacing: "0.04em", transition: "all 0.2s",
              }}>
              {actionState === "tokenizing" ? "Minting…" : "Tokenize RWA"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleArena(); }}
              disabled={actionState !== "idle"}
              style={{
                flex: 1, padding: "0.4rem 0.3rem", borderRadius: "8px", fontSize: "0.6rem", fontWeight: 700,
                background: actionState === "deploying" ? "rgba(99,255,240,0.15)" : "rgba(99,255,240,0.08)",
                border: "1px solid rgba(99,255,240,0.3)", color: "#63fff0", cursor: "pointer",
                letterSpacing: "0.04em", transition: "all 0.2s",
              }}>
              {actionState === "deploying" ? "Deploying…" : "→ Arena"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}