// FILE: app/onboard/page.tsx
"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ASSET_TYPES } from "@/lib/appData";

function OnboardInner() {
  const router  = useRouter();
  const params  = useSearchParams();
  const initial = params?.get("type") ?? null;
  const [selected, setSelected] = useState<string | null>(initial);

  const proceed = (vaultId: string) => router.push(`/deposit/${vaultId}`);

  return (
    <div style={{ maxWidth: "560px", margin: "0 auto", padding: "3rem 1.25rem 4rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Step 1 of 2</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", letterSpacing: "-0.02em", marginBottom: "0.625rem" }}>
        Pick an asset.
      </h1>
      <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "2rem", lineHeight: 1.6 }}>
        Each asset class has its own vault and agent. Pick what you want to operate.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {ASSET_TYPES.map((a) => {
          const isOn = selected === a.key;
          return (
            <button
              key={a.key}
              onClick={() => setSelected(a.key)}
              style={{
                background: isOn ? "rgba(200,169,110,0.08)" : "var(--surface)",
                border: `1px solid ${isOn ? "var(--gold)" : "var(--line)"}`,
                borderRadius: "12px", padding: "1.1rem 1.25rem",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <span style={{ fontSize: "1.4rem" }}>{a.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: isOn ? "var(--gold)" : "var(--text)" }}>{a.name}</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green)" }}>{a.apy}%</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{a.howItEarns}</p>
            </button>
          );
        })}
      </div>

      <button
        disabled={!selected}
        onClick={() => {
          const a = ASSET_TYPES.find((x) => x.key === selected);
          if (a) proceed(a.vaultId);
        }}
        style={{
          width: "100%",
          background: selected ? "var(--gold)" : "var(--surface)",
          color: selected ? "var(--void)" : "var(--subtle)",
          border: "none", borderRadius: "10px", padding: "0.95rem",
          fontWeight: 700, fontSize: "0.9rem",
          cursor: selected ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        Continue to deposit →
      </button>

      <p style={{ fontSize: "0.7rem", color: "var(--subtle)", textAlign: "center", marginTop: "1rem" }}>
        Already have a vault in mind? <Link href="/marketplace" style={{ color: "var(--gold)" }}>Browse all vaults</Link>
      </p>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--subtle)" }}>Loading…</div>}>
      <OnboardInner />
    </Suspense>
  );
}