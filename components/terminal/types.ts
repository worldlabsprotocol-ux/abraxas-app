// FILE: components/terminal/types.ts
// All shared TypeScript types for the terminal subsystem.
// Named aliases only. no inline string literal generics.

export type DeepView    = "main" | "asset" | "registry" | "submit" | "trust";
export type WyomingTier = "starter" | "growth" | "enterprise";

export interface TerminalNavProps {
  onNavigate: (view: DeepView) => void;
}
