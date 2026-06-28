"use client";
// FILE: components/PageShell.tsx
// Shared page wrapper: wallet provider, background, nav.

import { LiveBackground } from "@/components/LiveBackground";
import { SiteNav } from "@/components/SiteNav";
import { BottomNav } from "@/components/BottomNav";
import { WalletContextProvider } from "@/components/WalletContextProvider";

interface PageShellProps {
  children: React.ReactNode;
  onWaitlistClick?: () => void;
}

export function PageShell({ children, onWaitlistClick }: PageShellProps) {
  return (
    <WalletContextProvider>
      <div style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
        position: "relative",
      }}>
        <LiveBackground />
        <SiteNav onWaitlistClick={onWaitlistClick} />
        <div style={{ position: "relative", zIndex: 1 }}>
          {children}
        </div>
        <BottomNav />
      </div>
    </WalletContextProvider>
  );
}
