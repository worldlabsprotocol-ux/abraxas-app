"use client";
// FILE: lib/motion/PageTransition.tsx
// Per-navigation wrapper. Intentionally avoids opacity-0 SSR (LCP / FCP regression).

import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: "100%" }}>{children}</div>;
}
