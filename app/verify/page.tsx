"use client";
// FILE: app/verify/page.tsx
// Public verifier — registry lookup + relying-party credential JWT tester.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RedesignShell } from "@/components/redesign/RedesignShell";
import { PublicVerifierPanel } from "@/components/verify/PublicVerifierPanel";
import { RelyingPartyVerifyPanel } from "@/components/verify/RelyingPartyVerifyPanel";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";

export default function VerifyPage() {
  return (
    <RedesignShell>
      <Suspense fallback={null}>
        <VerifyPageInner />
      </Suspense>
    </RedesignShell>
  );
}

type Tab = "registry" | "credential";

function VerifyPageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("mode") === "credential" ? "credential" : "registry";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <SuiAuthProvider>
      <VerifyPageContent tab={tab} setTab={setTab} />
    </SuiAuthProvider>
  );
}

function VerifyPageContent({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { suiAddress } = useSuiAuth();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(2rem, 6vw, 4rem) clamp(1rem, 3vw, 2rem)" }}>
      <div style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "#10B981", marginBottom: "0.75rem",
      }}>
        Public verifier
      </div>
      <h1 style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)",
        margin: "0 0 0.75rem", lineHeight: 1.1,
      }}>
        Test Abraxas verification
      </h1>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.9rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 680, margin: "0 0 1.25rem",
      }}>
        Registry lookup for assets and DIDs, or credential JWT verification for relying parties —
        the same endpoints partners integrate in production.
      </p>

      <div style={{
        display: "flex", gap: "0.35rem", flexWrap: "wrap",
        padding: "0.25rem", borderRadius: 999, marginBottom: "1.5rem",
        background: "var(--surface-inset)", border: "1px solid var(--border)",
        width: "fit-content",
      }}>
        {([
          ["registry", "Registry lookup"],
          ["credential", "Credential JWT (partners)"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "0.5rem 1rem", borderRadius: 999, border: "none", cursor: "pointer",
              fontFamily: "'Inter',system-ui,sans-serif", fontSize: "0.78rem", fontWeight: 700,
              background: tab === id ? "#10B981" : "transparent",
              color: tab === id ? "#04130C" : "var(--text-secondary)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "registry" ? (
        <Suspense fallback={null}>
          <PublicVerifierPanel />
        </Suspense>
      ) : (
        <RelyingPartyVerifyPanel suiAddress={suiAddress} />
      )}
    </div>
  );
}
