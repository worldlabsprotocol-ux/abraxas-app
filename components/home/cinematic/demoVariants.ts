// FILE: components/home/cinematic/demoVariants.ts
// Visual identity per concept demo — each variant reads as its own "film."

import type { CSSProperties } from "react";

export type DemoVariant =
  | "default"
  | "terminal"
  | "blueprint"
  | "constellation"
  | "dossier"
  | "auditor"
  | "market"
  | "policy";

export type ProgressStyle = "dots" | "steps" | "timeline" | "orbit" | "minimal";

export interface VariantTheme {
  frameClass: string;
  frameStyle: CSSProperties;
  ambient: string;
  labelColor: string;
  captionColor: string;
  accent: string;
  progressStyle: ProgressStyle;
}

export const DEMO_VARIANTS: Record<DemoVariant, VariantTheme> = {
  default: {
    frameClass: "rounded-2xl",
    frameStyle: {
      border: "1px solid rgba(255,255,255,0.08)",
      background: "linear-gradient(165deg, rgba(8,10,16,0.95), rgba(4,5,8,0.98))",
    },
    ambient: "radial-gradient(ellipse 80% 55% at 50% 42%, rgba(212,175,55,0.08), transparent 62%)",
    labelColor: "rgba(255,255,255,0.45)",
    captionColor: "rgba(255,255,255,0.88)",
    accent: "#E8C547",
    progressStyle: "dots",
  },
  terminal: {
    frameClass: "rounded-lg",
    frameStyle: {
      border: "1px solid rgba(52,211,153,0.22)",
      background: "linear-gradient(180deg, #0a0f0c 0%, #050807 100%)",
      boxShadow: "0 0 0 1px rgba(0,0,0,0.5), 0 24px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(52,211,153,0.08)",
    },
    ambient: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(52,211,153,0.12), transparent 55%)",
    labelColor: "rgba(52,211,153,0.75)",
    captionColor: "rgba(209,250,229,0.92)",
    accent: "#34D399",
    progressStyle: "steps",
  },
  blueprint: {
    frameClass: "rounded-sm",
    frameStyle: {
      border: "1px solid rgba(96,165,250,0.28)",
      background: "linear-gradient(180deg, #0a1220 0%, #060a12 100%)",
      backgroundImage:
        "linear-gradient(rgba(96,165,250,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.06) 1px, transparent 1px)",
      backgroundSize: "24px 24px",
    },
    ambient: "radial-gradient(ellipse 85% 60% at 50% 100%, rgba(59,130,246,0.14), transparent 58%)",
    labelColor: "rgba(147,197,253,0.8)",
    captionColor: "rgba(219,234,254,0.92)",
    accent: "#60A5FA",
    progressStyle: "timeline",
  },
  constellation: {
    frameClass: "rounded-3xl",
    frameStyle: {
      border: "1px solid rgba(167,139,250,0.25)",
      background: "radial-gradient(ellipse 120% 80% at 50% 50%, #120f1c 0%, #060508 70%)",
    },
    ambient: "radial-gradient(ellipse 60% 45% at 50% 50%, rgba(167,139,250,0.16), transparent 65%)",
    labelColor: "rgba(196,181,253,0.85)",
    captionColor: "rgba(237,233,254,0.92)",
    accent: "#A78BFA",
    progressStyle: "orbit",
  },
  dossier: {
    frameClass: "rounded-xl",
    frameStyle: {
      border: "1px solid rgba(251,191,36,0.22)",
      background: "linear-gradient(155deg, #14100c 0%, #0a0908 55%, #080a10 100%)",
    },
    ambient: "radial-gradient(ellipse 75% 55% at 30% 20%, rgba(251,191,36,0.1), transparent 60%)",
    labelColor: "rgba(252,211,77,0.8)",
    captionColor: "rgba(254,243,199,0.92)",
    accent: "#FBBF24",
    progressStyle: "steps",
  },
  auditor: {
    frameClass: "rounded-md",
    frameStyle: {
      border: "1px solid rgba(16,185,129,0.3)",
      background: "linear-gradient(180deg, #081210 0%, #040807 100%)",
    },
    ambient: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(16,185,129,0.11), transparent 58%)",
    labelColor: "rgba(110,231,183,0.85)",
    captionColor: "rgba(209,250,229,0.92)",
    accent: "#10B981",
    progressStyle: "minimal",
  },
  market: {
    frameClass: "rounded-2xl",
    frameStyle: {
      border: "1px solid rgba(244,114,182,0.2)",
      background: "linear-gradient(135deg, #120a10 0%, #0a0814 50%, #080a10 100%)",
    },
    ambient: "radial-gradient(ellipse 80% 50% at 80% 20%, rgba(244,114,182,0.1), transparent 55%)",
    labelColor: "rgba(251,207,232,0.75)",
    captionColor: "rgba(253,242,248,0.92)",
    accent: "#F472B6",
    progressStyle: "timeline",
  },
  policy: {
    frameClass: "rounded-xl",
    frameStyle: {
      border: "1px solid rgba(148,163,184,0.25)",
      background: "linear-gradient(165deg, #0f1115 0%, #08090c 100%)",
    },
    ambient: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(148,163,184,0.1), transparent 58%)",
    labelColor: "rgba(203,213,225,0.8)",
    captionColor: "rgba(241,245,249,0.9)",
    accent: "#94A3B8",
    progressStyle: "minimal",
  },
};
