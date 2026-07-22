"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { ACCENT, CONCEPT_TYPE, GLASS, GRADIENT_TEXT, MESH, type MeshKey, PREMIUM_DISPLAY, PREMIUM_FONT, PREMIUM_MONO, DEMO_TYPE } from "./demoPremium";

export function PremiumMeshBg({ mesh }: { mesh: MeshKey }) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0" style={{ background: MESH[mesh] }} aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
        }}
        aria-hidden
      />
    </>
  );
}

/** Act progress pills — shows which chapter of the demo is playing. */
export function DemoActProgress({
  act,
  actCount,
  accent,
  labels,
  centered = true,
  large = false,
}: {
  act: number;
  actCount: number;
  accent: string;
  labels?: string[];
  centered?: boolean;
  large?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: centered ? "center" : "flex-start",
        gap: 6,
        marginTop: 10,
        flexWrap: "wrap",
      }}
    >
      {Array.from({ length: actCount }, (_, i) => {
        const n = i + 1;
        const active = n === act;
        const done = n < act;
        return (
          <motion.span
            key={n}
            animate={{
              opacity: active ? 1 : done ? 0.7 : 0.35,
              scale: active ? 1.02 : 1,
            }}
            transition={{ duration: 0.35 }}
            style={{
              fontFamily: PREMIUM_MONO,
              fontSize: large ? DEMO_TYPE.actPillHero : DEMO_TYPE.actPill,
              fontWeight: active ? 800 : 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "5px 10px",
              borderRadius: 999,
              color: active ? accent : done ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.35)",
              border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,0.08)"}`,
              background: active ? `${accent}18` : "rgba(0,0,0,0.2)",
              boxShadow: active ? `0 0 16px ${accent}22` : undefined,
            }}
          >
            {labels?.[i] ?? `Act ${n}`}
          </motion.span>
        );
      })}
    </div>
  );
}

export function PremiumEyebrow({ children, accent, centered, large }: { children: ReactNode; accent: string; centered?: boolean; large?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        justifyContent: centered ? "center" : undefined,
        fontFamily: PREMIUM_MONO,
        fontSize: large ? DEMO_TYPE.eyebrowHero : DEMO_TYPE.sm,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: accent,
      }}
    >
      <span style={{ width: 16, height: 1, background: `${accent}88` }} />
      {children}
    </span>
  );
}

export function PremiumHeadline({ children, mesh, centered = false, large = false }: { children: ReactNode; mesh: MeshKey; centered?: boolean; large?: boolean }) {
  return (
    <h3
      style={{
        fontFamily: large ? PREMIUM_DISPLAY : PREMIUM_FONT,
        fontSize: large ? DEMO_TYPE.headlineHero : DEMO_TYPE.headline,
        fontWeight: large ? 900 : 800,
        letterSpacing: "-0.03em",
        lineHeight: 1.2,
        margin: "0.5rem 0 0",
        textAlign: centered ? "center" : undefined,
        maxWidth: centered ? 640 : undefined,
        marginLeft: centered ? "auto" : undefined,
        marginRight: centered ? "auto" : undefined,
        background: GRADIENT_TEXT[mesh],
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {children}
    </h3>
  );
}

export function PremiumStat({
  value,
  label,
  accent,
  pulse,
}: {
  value: string;
  label: string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.02, 1] } : undefined}
      transition={pulse ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : undefined}
      style={{
        ...GLASS,
        borderRadius: 16,
        padding: "16px 20px",
        textAlign: "center",
        minWidth: 100,
        border: `1px solid ${accent}33`,
      }}
    >
      <div
        style={{
          fontFamily: PREMIUM_FONT,
          fontSize: "clamp(1.5rem, 4vw, 2rem)",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          color: "#FAFAFA",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: PREMIUM_MONO,
          fontSize: CONCEPT_TYPE.monoSm,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginTop: 8,
        }}
      >
        {label}
      </div>
    </motion.div>
  );
}

export function PremiumGlassCard({
  children,
  accent,
  glow,
  style,
}: {
  children: ReactNode;
  accent?: string;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...GLASS,
        borderRadius: 20,
        padding: "18px 20px",
        border: accent ? `1px solid ${accent}40` : GLASS.border,
        boxShadow: glow ? `0 0 48px ${accent ?? "#E8C547"}22, 0 24px 64px rgba(0,0,0,0.4)` : GLASS.boxShadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function FlowArrow({ accent, vertical }: { accent: string; vertical?: boolean }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 1, 0.4] }}
      transition={{ duration: 1.8, repeat: Infinity }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: accent,
        fontSize: vertical ? "1.25rem" : "1.5rem",
        transform: vertical ? "rotate(90deg)" : undefined,
      }}
    >
      →
    </motion.div>
  );
}

export function SplitCompare({
  left,
  right,
  leftLabel,
  rightLabel,
  accent,
}: {
  left: ReactNode;
  right: ReactNode;
  leftLabel: string;
  rightLabel: string;
  accent: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "stretch", width: "100%", maxWidth: 480 }}>
      <div>
        <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.1em" }}>
          {leftLabel}
        </div>
        {left}
      </div>
      <FlowArrow accent={accent} />
      <div>
        <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: accent, marginBottom: 8, letterSpacing: "0.1em" }}>
          {rightLabel}
        </div>
        {right}
      </div>
    </div>
  );
}

export function ApiGlowPanel({
  method,
  path,
  fields,
  litField,
}: {
  method: string;
  path: string;
  fields: { key: string; value: string }[];
  litField?: number;
}) {
  return (
    <PremiumGlassCard accent={ACCENT.emerald} glow style={{ width: "100%", maxWidth: 380, padding: 0, overflow: "hidden" }}>
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(0,0,0,0.25)",
      }}>
        <span style={{
          fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.mono, fontWeight: 800,
          padding: "3px 8px", borderRadius: 6,
          background: "rgba(52,211,153,0.15)", color: "#6EE7B7",
          border: "1px solid rgba(52,211,153,0.3)",
        }}>
          {method}
        </span>
        <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: "rgba(255,255,255,0.5)" }}>{path}</span>
      </div>
      <div style={{ padding: "14px 16px" }}>
        {fields.map((f, i) => (
          <motion.div
            key={f.key}
            animate={{ opacity: litField === i ? 1 : 0.55 }}
            style={{
              display: "flex", justifyContent: "space-between", gap: 12,
              padding: "8px 10px", marginBottom: 4, borderRadius: 8,
              background: litField === i ? "rgba(52,211,153,0.1)" : "transparent",
              border: litField === i ? "1px solid rgba(52,211,153,0.25)" : "1px solid transparent",
            }}
          >
            <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: "rgba(255,255,255,0.4)" }}>{f.key}</span>
            <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, fontWeight: 700, color: litField === i ? "#A7F3D0" : "rgba(255,255,255,0.7)" }}>
              {f.value}
            </span>
          </motion.div>
        ))}
      </div>
    </PremiumGlassCard>
  );
}

export function StackSlab({
  label,
  sub,
  widthPct,
  accent,
  foundation,
  delay = 0,
}: {
  label: string;
  sub: string;
  widthPct: number;
  accent: string;
  foundation?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, type: "spring", stiffness: 100 }}
      style={{
        width: `${widthPct}%`,
        margin: "0 auto",
        padding: "14px 18px",
        borderRadius: foundation ? 4 : 12,
        ...GLASS,
        border: foundation ? `1px solid ${accent}66` : `1px solid rgba(255,255,255,0.08)`,
        background: foundation
          ? `linear-gradient(90deg, ${accent}18, rgba(255,255,255,0.03))`
          : GLASS.background,
        boxShadow: foundation ? `0 0 40px ${accent}20, 0 20px 50px rgba(0,0,0,0.4)` : GLASS.boxShadow,
      }}
    >
      <div style={{ fontFamily: PREMIUM_FONT, fontSize: foundation ? CONCEPT_TYPE.title : CONCEPT_TYPE.body, fontWeight: 800, color: foundation ? "#FAFAFA" : "rgba(255,255,255,0.85)" }}>
        {label}
      </div>
      <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: "rgba(255,255,255,0.4)", marginTop: 6, letterSpacing: "0.04em" }}>
        {sub}
      </div>
    </motion.div>
  );
}

export function OrbitHub({
  count,
  label,
  nodes,
  accent,
  radius = 90,
}: {
  count: number;
  label: string;
  nodes: { name: string; angle: number; active: boolean }[];
  accent: string;
  radius?: number;
}) {
  return (
    <div style={{ position: "relative", width: radius * 2 + 100, height: radius * 2 + 80, margin: "0 auto" }}>
      <svg
        className="pointer-events-none absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        width={radius * 2 + 40}
        height={radius * 2 + 40}
        aria-hidden
      >
        {nodes.filter(n => n.active).map(n => {
          const rad = (n.angle * Math.PI) / 180;
          const cx = radius + 20 + Math.cos(rad) * radius;
          const cy = radius + 20 + Math.sin(rad) * radius;
          return (
            <line
              key={n.name}
              x1={radius + 20}
              y1={radius + 20}
              x2={cx}
              y2={cy}
              stroke={`${accent}55`}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      <motion.div
        animate={{ boxShadow: [`0 0 40px ${accent}25`, `0 0 64px ${accent}40`, `0 0 40px ${accent}25`] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
          width: 72, height: 72, borderRadius: "50%",
          border: `2px solid ${accent}88`,
          background: `radial-gradient(circle, ${accent}30 0%, rgba(8,8,12,0.95) 70%)`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          zIndex: 2,
        }}
      >
        <span style={{ fontFamily: PREMIUM_FONT, fontSize: "1.25rem", fontWeight: 900, color: "#FAFAFA" }}>{count}</span>
        <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: accent, letterSpacing: "0.08em" }}>{label}</span>
      </motion.div>
      {nodes.map(n => {
        const rad = (n.angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        return (
          <div
            key={n.name}
            style={{
              position: "absolute",
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: "translate(-50%, -50%)",
              padding: "8px 14px",
              borderRadius: 999,
              fontFamily: PREMIUM_FONT,
              fontSize: CONCEPT_TYPE.body,
              fontWeight: 800,
              whiteSpace: "nowrap",
              color: n.active ? "#FAFAFA" : "rgba(255,255,255,0.35)",
              border: `1px solid ${n.active ? `${accent}66` : "rgba(255,255,255,0.08)"}`,
              background: n.active ? `${accent}22` : "rgba(0,0,0,0.4)",
              boxShadow: n.active ? `0 0 20px ${accent}25` : undefined,
            }}
          >
            {n.name}
          </div>
        );
      })}
    </div>
  );
}

export function AssetHeroCard({
  title,
  id,
  location,
  gradient,
  badge,
}: {
  title: string;
  id: string;
  location: string;
  gradient: string;
  badge?: string;
}) {
  return (
    <PremiumGlassCard accent={ACCENT.gold} glow style={{ width: "100%", maxWidth: 340, padding: 0, overflow: "hidden" }}>
      <div style={{ height: 88, background: gradient, position: "relative" }}>
        {badge && (
          <span style={{
            position: "absolute", top: 12, left: 12,
            fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, fontWeight: 800,
            padding: "4px 10px", borderRadius: 999,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(232,197,71,0.4)",
            color: "#F5E6A8", letterSpacing: "0.1em",
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ fontFamily: PREMIUM_FONT, fontSize: CONCEPT_TYPE.title, fontWeight: 900, letterSpacing: "-0.02em", color: "#FAFAFA" }}>
          {title}
        </div>
        <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.mono, color: ACCENT.gold, marginTop: 6 }}>{id}</div>
        <div style={{ fontFamily: PREMIUM_FONT, fontSize: CONCEPT_TYPE.sub, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{location}</div>
      </div>
    </PremiumGlassCard>
  );
}

export function VerifyResultHero({ valid }: { valid: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        ...GLASS,
        borderRadius: 24,
        padding: "28px 32px",
        textAlign: "center",
        border: `1px solid ${valid ? "rgba(52,211,153,0.45)" : "rgba(248,113,113,0.4)"}`,
        boxShadow: valid ? "0 0 60px rgba(16,185,129,0.2)" : undefined,
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
        background: valid ? "rgba(16,185,129,0.2)" : "rgba(248,113,113,0.15)",
        border: `2px solid ${valid ? "#34D399" : "#F87171"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.5rem", color: valid ? "#6EE7B7" : "#FCA5A5",
      }}>
        {valid ? "✓" : "×"}
      </div>
      <div style={{ fontFamily: PREMIUM_FONT, fontSize: CONCEPT_TYPE.title, fontWeight: 900, color: "#FAFAFA", letterSpacing: "-0.02em" }}>
        {valid ? "Cryptographically valid" : "Invalid signature"}
      </div>
      <div style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.monoSm, color: "rgba(255,255,255,0.45)", marginTop: 10, letterSpacing: "0.06em" }}>
        Verified locally · no server trust required
      </div>
    </motion.div>
  );
}

export function ClaimRow({
  label,
  value,
  redacted,
  visible,
}: {
  label: string;
  value: string;
  redacted?: boolean;
  visible: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: visible ? 1 : 0.25 }}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.mono, color: "rgba(148,163,184,0.9)", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{
        fontFamily: PREMIUM_MONO, fontSize: CONCEPT_TYPE.mono, fontWeight: 700,
        color: redacted ? "rgba(255,255,255,0.2)" : "#E2E8F0",
      }}>
        {redacted ? "████████" : value}
      </span>
    </motion.div>
  );
}
