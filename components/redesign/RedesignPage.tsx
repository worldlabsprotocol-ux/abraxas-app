"use client";
// FILE: components/redesign/RedesignPage.tsx
// Standard inner page wrapper: RedesignShell + content + footer.

import { RedesignShell } from "./RedesignShell";
import { RedesignFooter } from "./RedesignFooter";

interface RedesignPageProps {
  children: React.ReactNode;
  maxWidth?: number;
}

export function RedesignPage({ children, maxWidth = 900 }: RedesignPageProps) {
  return (
    <RedesignShell>
      <div style={{
        maxWidth,
        margin: "0 auto",
        padding: "2rem clamp(1rem, 3vw, 1.75rem) 0",
      }}>
        {children}
      </div>
      <RedesignFooter />
    </RedesignShell>
  );
}
