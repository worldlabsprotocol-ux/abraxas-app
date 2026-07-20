"use client";
// FILE: components/redesign/RedesignHome.tsx
// Homepage shell — nav, footer, wallet providers. Content is server-rendered via children.

import { WalletContextProvider } from "@/components/WalletContextProvider";
import { SuiAuthProvider } from "@/components/sui/SuiAuthProvider";
import { RedesignNav } from "./RedesignNav";
import { RedesignFooter } from "./RedesignFooter";

const MAXW: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "0 clamp(1rem, 3vw, 2rem)",
};

export function RedesignHome({ children }: { children: React.ReactNode }) {
  return (
    <WalletContextProvider>
      <SuiAuthProvider>
        <div
          data-theme="dark"
          style={{
            background: "var(--bg)",
            color: "var(--text-primary)",
            minHeight: "100vh",
            position: "relative",
            overflowX: "hidden",
          }}
        >
          <RedesignNav />
          <main style={{ position: "relative", zIndex: 1 }}>
            <div style={MAXW}>{children}</div>
          </main>
          <RedesignFooter />
        </div>
      </SuiAuthProvider>
    </WalletContextProvider>
  );
}
