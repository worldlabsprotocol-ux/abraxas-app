// FILE: lib/productLoopStepThemes.ts
// Diagram-only visual identity — no photo overlays (1-1-1 clarity).

export type ProductLoopVisualMode = "diagram";

export interface ProductLoopStepTheme {
  mode: ProductLoopVisualMode;
  gradient: string;
  accent: string;
}

export const PRODUCT_LOOP_STEP_THEMES: Record<string, ProductLoopStepTheme> = {
  browse: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 70% 55% at 20% 20%, rgba(16,185,129,0.22) 0%, transparent 55%),
      linear-gradient(155deg, #0a1218 0%, #06090B 100%)
    `,
    accent: "#10B981",
  },
  book: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 65% 50% at 80% 25%, rgba(56,189,248,0.2) 0%, transparent 55%),
      linear-gradient(155deg, #0a1420 0%, #06090B 100%)
    `,
    accent: "#38BDF8",
  },
  signin: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 80% 60% at 20% 15%, rgba(66,133,244,0.28) 0%, transparent 55%),
      radial-gradient(ellipse 55% 50% at 85% 75%, rgba(16,185,129,0.22) 0%, transparent 50%),
      linear-gradient(155deg, #0a1424 0%, #06090B 100%)
    `,
    accent: "#4285F4",
  },
  consent: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 70% 55% at 75% 20%, rgba(168,85,247,0.25) 0%, transparent 55%),
      radial-gradient(ellipse 50% 45% at 15% 80%, rgba(245,158,11,0.18) 0%, transparent 50%),
      linear-gradient(155deg, #120a1a 0%, #06090B 100%)
    `,
    accent: "#A855F7",
  },
  verify: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 60% 50% at 50% 30%, rgba(16,185,129,0.2) 0%, transparent 55%),
      linear-gradient(155deg, #081510 0%, #06090B 100%)
    `,
    accent: "#10B981",
  },
};

export function themeForStep(stepId: string): ProductLoopStepTheme {
  return PRODUCT_LOOP_STEP_THEMES[stepId] ?? PRODUCT_LOOP_STEP_THEMES.browse;
}
