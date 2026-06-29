"use client";
// FILE: components/ProtocolPage.tsx
// Standard page shell for all public protocol pages.

import { PageShell } from "@/components/PageShell";
import { SiteFooter } from "@/components/SiteFooter";

interface ProtocolPageProps {
  children: React.ReactNode;
  onWaitlistClick?: () => void;
  maxWidth?: number;
}

export function ProtocolPage({
  children,
  onWaitlistClick,
  maxWidth = 900,
}: ProtocolPageProps) {
  return (
    <PageShell onWaitlistClick={onWaitlistClick}>
      <main style={{
        maxWidth,
        margin: "0 auto",
        padding: "2rem clamp(1rem, 3vw, 1.75rem) 1rem",
        position: "relative",
        zIndex: 1,
      }}>
        {children}
      </main>
      <SiteFooter />
    </PageShell>
  );
}
