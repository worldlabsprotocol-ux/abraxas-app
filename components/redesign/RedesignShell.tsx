"use client";
// FILE: components/redesign/RedesignShell.tsx
// Reusable dark premium page shell: scoped dark theme + ambient glow +
// premium nav (with language + wallet). Drop-in replacement for the
// legacy PageShell on migrated routes.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AbxAtmosphericBackground } from "@/components/design/AbxAtmosphericBackground";
import { RedesignNav } from "./RedesignNav";

export function RedesignShell({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider>
      <div data-theme="dark" className="abx-institutional-shell">
        <AbxAtmosphericBackground />
        <RedesignNav />
        <main style={{ position: "relative", zIndex: 1 }}>
          {children}
        </main>
      </div>
    </WalletContextProvider>
  );
}
