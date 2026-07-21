// FILE: components/home/cinematic/demoPremium.ts
// Premium DeFi-native demo tokens — glass, mesh, bold type (institutional × crypto-native).

import type { CSSProperties } from "react";

export const PREMIUM_FONT = "'Inter', system-ui, -apple-system, sans-serif";
export const PREMIUM_MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace";

export const GLASS: CSSProperties = {
  background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
};

export const MESH = {
  gold: "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(232,197,71,0.18) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(167,139,250,0.14) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 50% 50%, rgba(34,211,238,0.06) 0%, transparent 60%), #050508",
  violet: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(167,139,250,0.22) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(139,92,246,0.12) 0%, transparent 50%), radial-gradient(ellipse 35% 25% at 10% 60%, rgba(34,211,238,0.08) 0%, transparent 55%), #06040c",
  emerald: "radial-gradient(ellipse 75% 55% at 30% 10%, rgba(16,185,129,0.2) 0%, transparent 55%), radial-gradient(ellipse 55% 45% at 85% 90%, rgba(52,211,153,0.1) 0%, transparent 50%), radial-gradient(ellipse 40% 30% at 60% 40%, rgba(167,139,250,0.06) 0%, transparent 55%), #040807",
  rose: "radial-gradient(ellipse 70% 50% at 80% 15%, rgba(244,114,182,0.14) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 10% 90%, rgba(251,191,36,0.08) 0%, transparent 50%), #0a0608",
  ice: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(96,165,250,0.14) 0%, transparent 58%), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(147,197,253,0.06) 0%, transparent 50%), #060a12",
  slate: "radial-gradient(ellipse 65% 50% at 50% 0%, rgba(148,163,184,0.1) 0%, transparent 55%), #08090c",
  danger: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(248,113,113,0.12) 0%, transparent 58%), #0a0606",
} as const;

export type MeshKey = keyof typeof MESH;

export const GRADIENT_TEXT: Record<MeshKey, string> = {
  gold: "linear-gradient(90deg, #F5E6A8 0%, #E8C547 45%, #A78BFA 100%)",
  violet: "linear-gradient(90deg, #EDE9FE 0%, #A78BFA 50%, #E8C547 100%)",
  emerald: "linear-gradient(90deg, #A7F3D0 0%, #34D399 50%, #6EE7B7 100%)",
  rose: "linear-gradient(90deg, #FBCFE8 0%, #F472B6 50%, #F5E6A8 100%)",
  ice: "linear-gradient(90deg, #BFDBFE 0%, #60A5FA 50%, #93C5FD 100%)",
  slate: "linear-gradient(90deg, #F1F5F9 0%, #94A3B8 100%)",
  danger: "linear-gradient(90deg, #FCA5A5 0%, #F87171 100%)",
};

export const ACCENT: Record<MeshKey, string> = {
  gold: "#E8C547",
  violet: "#A78BFA",
  emerald: "#34D399",
  rose: "#F472B6",
  ice: "#60A5FA",
  slate: "#94A3B8",
  danger: "#F87171",
};

/** Legible demo typography — hero cinematic + mobile (v3: ~15% larger than v2). */
export const DEMO_TYPE = {
  micro: "0.55rem",
  xs: "0.64rem",
  sm: "0.74rem",
  md: "0.84rem",
  lg: "0.96rem",
  xl: "1.08rem",
  counter: "clamp(1.45rem, 4.6vw, 2rem)",
  debtLabel: "clamp(0.66rem, 1.85vw, 0.82rem)",
  debtSub: "clamp(0.74rem, 2vw, 0.9rem)",
  portalTitle: "clamp(0.7rem, 1.95vw, 0.88rem)",
  proofId: "clamp(1rem, 2.9vw, 1.24rem)",
  proofRow: "clamp(0.62rem, 1.7vw, 0.76rem)",
  cardTitle: "clamp(0.96rem, 2.65vw, 1.15rem)",
  verifierTitle: "clamp(0.86rem, 2.15vw, 1.06rem)",
  noRelay: "clamp(0.62rem, 1.7vw, 0.76rem)",
  eyebrow: "0.78rem",
  headline: "clamp(1.24rem, 3.4vw, 1.72rem)",
  headlineHero: "clamp(1.32rem, 3.7vw, 1.88rem)",
  finalLine: "clamp(0.95rem, 2.4vw, 1.2rem)",
  actPill: "0.62rem",
} as const;

/** Secondary concept demos — shared legible scale (replaces scattered 0.42–0.72rem values). */
export const CONCEPT_TYPE = {
  label: "0.68rem",
  body: "0.84rem",
  title: "1rem",
  hero: "1.32rem",
  mono: "0.68rem",
  monoSm: "0.6rem",
  stat: "0.8rem",
  sub: "0.72rem",
} as const;
