// FILE: app/operate/page.tsx
// Merged Vaults + Operate. Single tab for full deposit flow.
// Step 1: Pick asset → Step 2: Customize position → Step 3: Deposit
"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { ASSET_TYPES, VAULTS, fmtUSD } from "@/lib/appData";

type OperateStep = "pick" | "customize";

interface PositionMeta {
  displayName:  string;
  description:  string;
}

function OperateInner() {
  const router  = useRouter();
  const params  = useSearchParams();
  const initial = params?.get("type") ?? null;

  const [step,     setStep]     = useState<OperateStep>(initial ? "customize" : "pick");
  const [selected, setSelected] = useState<string | null>(initial);
  const [meta,     setMeta]     = useState<PositionMeta>({ displayName: "", description: "" });

  const asset  = ASSET_TYPES.find((a) => a.key === selected);
  const vault  = asset ? VAULTS.find((v) => v.id === asset.vaultId) : null;

  const proceed = () => {
    if (!asset || !vault) return;
    const params = new URLSearchParams({
      meta: JSON.stringify(meta),
    });
    router.push(`/deposit/${vault.id}?${params.toString()}`);
  };

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "3rem 1.25rem 4rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Operate</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.5rem)", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
        {step === "pick" ? "Pick an asset." : "Name your position."}
      </h1>

      {/* STEP 1 — Pick asset */}
      {step === "pick" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
            {ASSET_TYPES.map((a) => {
              const isOn = selected === a.key;
              const v    = VAULTS.find((x) => x.id === a.vaultId);
              return (
                <button key={a.key} onClick={() => setSelected(a.key)} style={{ background: isOn ? "rgba(200,169,110,0.08)" : "var(--surface)", border: `1px solid ${isOn ? "var(--gold)" : "var(--line)"}`, borderRadius: "12px", padding: "1.1rem 1.25rem", cursor: "pointer", textAlign: "left", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                      <span style={{ fontSize: "1.4rem" }}>{a.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.95rem", color: isOn ? "var(--gold)" : "var(--text)" }}>{a.name}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--green)" }}>{a.apy}%</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{a.howItEarns}</p>
                  {v && isOn && (
                    <div style={{ marginTop: "0.625rem", paddingTop: "0.625rem", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: "1.25rem", fontSize: "0.68rem" }}>
                      <span style={{ color: "var(--subtle)" }}>Vault: <span style={{ color: "var(--gold)" }}>{v.name}</span></span>
                      <span style={{ color: "var(--subtle)" }}>TVL: <span style={{ color: "var(--text)" }}>{fmtUSD(v.tvl)}</span></span>
                      <span style={{ color: "var(--subtle)" }}>Agent: <span style={{ color: "var(--text)" }}>{v.agent}</span></span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button disabled={!selected} onClick={() => selected && setStep("customize")} style={{ width: "100%", background: selected ? "var(--gold)" : "var(--surface)", color: selected ? "var(--void)" : "var(--subtle)", border: "none", borderRadius: "10px", padding: "0.95rem", fontWeight: 700, fontSize: "0.9rem", cursor: selected ? "pointer" : "not-allowed", transition: "background 0.15s" }}>
            Continue →
          </button>

          {/* Active vaults overview */}
          <div style={{ marginTop: "2rem" }}>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>All active vaults</p>
            {VAULTS.map((v) => (
              <Link key={v.id} href={`/deposit/${v.id}`} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{v.name}</div>
                    <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{v.asset} · {v.agent} · {fmtUSD(v.tvl)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--green)" }}>{v.apy}%</div>
                    <div style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>{v.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* STEP 2 — Customize position metadata (used in Token-2022 mint) */}
      {step === "customize" && asset && vault && (
        <>
          <div style={{ background: "var(--surface)", border: "1px solid var(--gold)", borderRadius: "10px", padding: "0.875rem 1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{asset.name}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--subtle)" }}>{vault.name} · {vault.agent}</div>
            </div>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--green)" }}>{asset.apy}%</span>
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1.25rem", lineHeight: 1.6 }}>
            Name your position. This metadata is embedded in your ABRAP Token-2022 and visible on Solscan.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", display: "block", marginBottom: "0.35rem" }}>
                Position name
              </label>
              <input
                type="text"
                value={meta.displayName}
                onChange={(e) => setMeta((m) => ({ ...m, displayName: e.target.value }))}
                placeholder={`e.g. My ${asset.name} Position`}
                style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.875rem", outline: "none", fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", display: "block", marginBottom: "0.35rem" }}>
                Description (optional)
              </label>
              <textarea
                value={meta.description}
                onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
                placeholder="Short note about this position — included in token metadata."
                rows={2}
                style={{ width: "100%", boxSizing: "border-box", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "8px", padding: "0.75rem 1rem", fontSize: "0.875rem", outline: "none", resize: "vertical", fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>
          </div>

          <div style={{ background: "rgba(200,169,110,0.05)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--gold)" }}>ABRAP token metadata</strong> — Your position name and description are embedded in the Token-2022 token. The dashboard, Solscan, and compatible wallets will display this information. Wallet display depends on the wallet's metadata indexing.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.625rem" }}>
            <button onClick={() => setStep("pick")} style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.95rem 1.25rem", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}>
              ← Back
            </button>
            <button onClick={proceed} style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.95rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
              Continue to deposit →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function OperatePage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--subtle)" }}>Loading…</div>}>
      <OperateInner />
    </Suspense>
  );
}