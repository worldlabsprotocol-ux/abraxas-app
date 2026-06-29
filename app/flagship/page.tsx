"use client";
// FILE: app/flagship/page.tsx
// Flagship asset detail (Cielo Sunrise) in the redesigned dark shell.
// Reachable from the Verified Assets Explorer. Data/content unchanged.
import { WalletContextProvider } from "@/components/WalletContextProvider";
import { AmbientGlow } from "@/components/redesign/AmbientGlow";
import { RedesignNav } from "@/components/redesign/RedesignNav";
import { FlagshipAssetPage } from "@/components/assets/FlagshipAssetPage";

export default function FlagshipPage() {
  return (
    <WalletContextProvider>
      <div data-theme="dark" style={{
        background: "var(--bg)", color: "var(--text-primary)",
        minHeight: "100vh", position: "relative", overflowX: "hidden",
      }}>
        <AmbientGlow />
        <RedesignNav />
        <main style={{ position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 1180, margin: "0 auto",
                         padding: "0.75rem clamp(1rem,3vw,2rem) 0" }}>
            <a href="/terminal#assets" style={{
              fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.8rem",
              fontWeight: 600, color: "var(--text-muted)", textDecoration: "none",
            }}>
              ← Back to verified assets
            </a>
          </div>
          <FlagshipAssetPage />
        </main>
      </div>
    </WalletContextProvider>
  );
}
