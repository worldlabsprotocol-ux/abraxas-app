"use client";
// FILE: app/template.tsx
// App Router template. re-mounts on every navigation, giving each route
// a smooth fade + rise entrance via the shared PageTransition wrapper.
import { PageTransition } from "@/lib/motion/PageTransition";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
