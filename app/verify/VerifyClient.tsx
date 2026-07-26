"use client";
// FILE: app/verify/VerifyClient.tsx

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PublicVerifierPanel } from "@/components/verify/PublicVerifierPanel";
import { RelyingPartyVerifyPanel } from "@/components/verify/RelyingPartyVerifyPanel";
import { SuiAuthProvider, useSuiAuth } from "@/components/sui/SuiAuthProvider";

export type VerifyTab = "registry" | "credential";

function tabFromParams(mode: string | null): VerifyTab {
  if (mode === "credential" || mode === "policy") return "credential";
  return "registry";
}

export function VerifyClient() {
  const searchParams = useSearchParams();
  const initial = tabFromParams(searchParams.get("mode"));
  const [tab, setTab] = useState<VerifyTab>(initial);

  return (
    <SuiAuthProvider>
      <VerifyTabs tab={tab} setTab={setTab} />
    </SuiAuthProvider>
  );
}

function VerifyTabs({ tab, setTab }: { tab: VerifyTab; setTab: (t: VerifyTab) => void }) {
  const { suiAddress } = useSuiAuth();

  const tabs: Array<[VerifyTab, string]> = [
    ["registry", "Registry"],
    ["credential", "Credentials & policy"],
  ];

  return (
    <>
      <p style={{
        fontFamily: "'Inter',system-ui,sans-serif",
        fontSize: "0.78rem",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        margin: "0 0 1rem",
        maxWidth: 560,
      }}>
        Look up tokenized assets on-registry, or test how a partner checks your Abraxas proof.
        Profile settings live under your account menu (top right).
      </p>
      <div style={{
        display: "flex", gap: "0.35rem", flexWrap: "wrap",
        padding: "0.25rem", borderRadius: 999, marginBottom: "1.5rem",
        background: "var(--surface-inset)", border: "1px solid var(--border)",
      }}>
        {tabs.map(([id, label]) => (
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

      {tab === "registry" && (
        <Suspense fallback={null}>
          <PublicVerifierPanel />
        </Suspense>
      )}
      {tab === "credential" && <RelyingPartyVerifyPanel suiAddress={suiAddress} showPolicyCheck />}
    </>
  );
}
