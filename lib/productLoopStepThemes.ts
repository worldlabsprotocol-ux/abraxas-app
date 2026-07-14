// FILE: lib/productLoopStepThemes.ts
// Diagram-only visual identity — re-verify pain → closed loop.

export type ProductLoopVisualMode = "diagram";

export interface ProductLoopStepTheme {
  mode: ProductLoopVisualMode;
  gradient: string;
  accent: string;
}

export const PRODUCT_LOOP_STEP_THEMES: Record<string, ProductLoopStepTheme> = {
  spam: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 70% 55% at 30% 25%, rgba(248,113,113,0.22) 0%, transparent 55%),
      linear-gradient(155deg, #1a0a0a 0%, #06090B 100%)
    `,
    accent: "#F87171",
  },
  pain: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 65% 50% at 70% 30%, rgba(245,158,11,0.25) 0%, transparent 55%),
      linear-gradient(155deg, #1a1208 0%, #06090B 100%)
    `,
    accent: "#F59E0B",
  },
  "verify-once": {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 80% 60% at 20% 15%, rgba(232,197,71,0.18) 0%, transparent 55%),
      radial-gradient(ellipse 55% 50% at 85% 75%, rgba(66,133,244,0.22) 0%, transparent 50%),
      linear-gradient(155deg, #0a1424 0%, #06090B 100%)
    `,
    accent: "#E8C547",
  },
  global: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 70% 55% at 75% 20%, rgba(56,189,248,0.22) 0%, transparent 55%),
      radial-gradient(ellipse 50% 45% at 15% 80%, rgba(16,185,129,0.18) 0%, transparent 50%),
      linear-gradient(155deg, #081520 0%, #06090B 100%)
    `,
    accent: "#38BDF8",
  },
  settle: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 60% 50% at 50% 30%, rgba(232,197,71,0.22) 0%, transparent 55%),
      radial-gradient(ellipse 45% 40% at 80% 80%, rgba(167,139,250,0.12) 0%, transparent 50%),
      linear-gradient(155deg, #081510 0%, #06090B 100%)
    `,
    accent: "#E8C547",
  },
};

export function themeForStep(stepId: string): ProductLoopStepTheme {
  return PRODUCT_LOOP_STEP_THEMES[stepId] ?? PRODUCT_LOOP_STEP_THEMES.spam;
}
