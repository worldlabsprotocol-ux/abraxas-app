// FILE: lib/productLoopStepThemes.ts
// Distinct visual identity per product-loop step — photo vs diagram modes.

export type ProductLoopVisualMode = "photo" | "diagram";

export interface ProductLoopStepTheme {
  mode: ProductLoopVisualMode;
  /** CSS background when no photo (diagram steps). */
  gradient: string;
  /** Photo overlay strength 0–1 */
  overlayStrength: number;
  /** Optional CSS filter on background photo */
  imageFilter?: string;
  accent: string;
}

export const PRODUCT_LOOP_STEP_THEMES: Record<string, ProductLoopStepTheme> = {
  browse: {
    mode: "photo",
    gradient: "linear-gradient(160deg, #0a1218 0%, #06090B 100%)",
    overlayStrength: 0.72,
    imageFilter: "saturate(0.85) contrast(1.05)",
    accent: "#10B981",
  },
  book: {
    mode: "photo",
    gradient: "linear-gradient(160deg, #101820 0%, #06090B 100%)",
    overlayStrength: 0.68,
    imageFilter: "saturate(1.1) brightness(0.92)",
    accent: "#38BDF8",
  },
  signin: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 80% 60% at 20% 15%, rgba(66,133,244,0.28) 0%, transparent 55%),
      radial-gradient(ellipse 55% 50% at 85% 75%, rgba(16,185,129,0.22) 0%, transparent 50%),
      linear-gradient(155deg, #0a1424 0%, #06090B 100%)
    `,
    overlayStrength: 0.35,
    accent: "#4285F4",
  },
  consent: {
    mode: "diagram",
    gradient: `
      radial-gradient(ellipse 70% 55% at 75% 20%, rgba(168,85,247,0.25) 0%, transparent 55%),
      radial-gradient(ellipse 50% 45% at 15% 80%, rgba(245,158,11,0.18) 0%, transparent 50%),
      linear-gradient(155deg, #120a1a 0%, #06090B 100%)
    `,
    overlayStrength: 0.4,
    accent: "#A855F7",
  },
  verify: {
    mode: "photo",
    gradient: "linear-gradient(160deg, #081510 0%, #06090B 100%)",
    overlayStrength: 0.78,
    imageFilter: "saturate(0.9) hue-rotate(-8deg)",
    accent: "#10B981",
  },
};

export function themeForStep(stepId: string): ProductLoopStepTheme {
  return PRODUCT_LOOP_STEP_THEMES[stepId] ?? PRODUCT_LOOP_STEP_THEMES.browse;
}
