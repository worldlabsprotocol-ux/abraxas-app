// FILE: components/GachaVaultDeploy.tsx
// Collector Crypt gacha-style vault deployment animation.
// Triggered when user deploys a vault for a physical RWA asset.
// Reveals the Token-2022 position mint with a staged animation sequence.
// No new packages — pure CSS keyframes + React state.
"use client";

import { useState, useEffect } from "react";

export type GachaPhase =
  | "idle"
  | "charging"   // power-up animation
  | "spinning"   // gacha drum spin
  | "revealing"  // card flip reveal
  | "minted"     // success state with Token-2022 details
  | "error";

interface MintResult {
  mintAddress:    string;
  txSignature:    string;
  explorerUrl:    string;
  assetName:      string;
  policyArmed:    boolean;
  simulated:      boolean;
}

interface Props {
  assetName:   string;
  assetType:   string;
  vaultName:   string;
  onComplete:  (result: MintResult) => void;
  onCancel:    () => void;
}

// Fake base58 for simulation
function fakeBase58(len: number): string {
  const ch = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let o = ""; for (let i = 0; i < len; i++) o += ch[Math.floor(Math.random() * ch.length)]; return o;
}

const PHASE_MESSAGES: Record<GachaPhase, string> = {
  idle:      "",
  charging:  "Powering up vault deployment…",
  spinning:  "Generating Token-2022 position…",
  revealing: "Minting RWA representation…",
  minted:    "Vault deployed. Policy armed.",
  error:     "Deployment failed. Retry.",
};

const COLLECTOR_CRYPT_CA = "CARDSccUMFKoPRZxt5vt3ksUbxEFEcnZ3H2pd3dKxYjp";

export function GachaVaultDeploy({ assetName, assetType, vaultName, onComplete, onCancel }: Props) {
  const [phase, setPhase] = useState<GachaPhase>("idle");
  const [result, setResult] = useState<MintResult | null>(null);
  const [dots, setDots]   = useState("");

  // Animated dots for charging/spinning phases
  useEffect(() => {
    if (phase === "idle" || phase === "minted" || phase === "error") return;
    const t = setInterval(() => setDots((d) => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(t);
  }, [phase]);

  const deploy = async () => {
    setPhase("charging");
    await sleep(900);
    setPhase("spinning");
    await sleep(1100);
    setPhase("revealing");

    // Try real mint, fall back to simulation
    let mintResult: MintResult;
    try {
      const res  = await fetch("/api/mint/position", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetName, assetType, vaultName, userWallet: "simulation" }),
      });
      const data = await res.json();
      if (data.ok && data.mintAddress) {
        mintResult = { mintAddress: data.mintAddress, txSignature: data.txSignature ?? fakeBase58(88), explorerUrl: data.explorerUrl ?? `https://solscan.io/tx/${fakeBase58(88)}`, assetName, policyArmed: true, simulated: data.simulated ?? true };
      } else throw new Error("mint failed");
    } catch {
      mintResult = { mintAddress: fakeBase58(44), txSignature: fakeBase58(88), explorerUrl: `https://solscan.io/tx/${fakeBase58(88)}`, assetName, policyArmed: true, simulated: true };
    }

    await sleep(700);
    setResult(mintResult);
    setPhase("minted");
    onComplete(mintResult);
  };

  function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

  const active = phase !== "idle" && phase !== "minted" && phase !== "error";
  const pc = {
    idle:      { color: "var(--gold)",  glow: "rgba(200,169,110,0.3)" },
    charging:  { color: "#60A5FA",      glow: "rgba(96,165,250,0.4)"  },
    spinning:  { color: "#FBBF24",      glow: "rgba(251,191,36,0.5)"  },
    revealing: { color: "#14F195",      glow: "rgba(20,241,149,0.5)"  },
    minted:    { color: "#14F195",      glow: "rgba(20,241,149,0.3)"  },
    error:     { color: "#f26b6b",      glow: "rgba(242,107,107,0.4)" },
  }[phase];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={!active ? onCancel : undefined} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }} />

      <div style={{ position: "relative", background: "var(--surface)", border: `1px solid ${pc.color}44`, borderRadius: "18px", padding: "2rem 1.75rem", width: "100%", maxWidth: "360px", zIndex: 1, textAlign: "center", boxShadow: `0 0 40px ${pc.glow}` }}>

        {/* Gacha orb */}
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", margin: "0 auto 1.25rem", background: `radial-gradient(circle at 35% 35%, ${pc.color}88, ${pc.color}22)`, border: `2px solid ${pc.color}`, boxShadow: `0 0 30px ${pc.glow}`, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.4s", animation: active ? "pulse 0.6s ease-in-out infinite" : "none" }}>
          <span style={{ fontSize: "2rem" }}>
            {phase === "minted" ? "✦" : phase === "error" ? "✗" : assetType === "music" ? "♪" : assetType === "realestate" ? "◻" : "◈"}
          </span>
        </div>

        {/* Phase label */}
        <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: pc.color, marginBottom: "0.5rem" }}>
          {phase === "idle" ? "Collector Crypt · Token-2022" : PHASE_MESSAGES[phase]}{active ? dots : ""}
        </p>

        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: "1.1rem", marginBottom: "0.35rem" }}>
          {phase === "minted" ? "Position Minted" : phase === "idle" ? `Deploy ${vaultName}` : "Minting…"}
        </h2>
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "1.25rem" }}>
          {assetName} · {assetType}
        </p>

        {/* Minted details */}
        {phase === "minted" && result && (
          <div style={{ background: "rgba(20,241,149,0.06)", border: "1px solid rgba(20,241,149,0.2)", borderRadius: "10px", padding: "0.75rem", marginBottom: "1rem", textAlign: "left" }}>
            <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.4rem" }}>Token-2022 Position</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: "#14F195", wordBreak: "break-all", marginBottom: "0.3rem" }}>
              {result.mintAddress}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--gold)", textDecoration: "none" }}>Solscan ↗</a>
              <a href={`https://solscan.io/account/${COLLECTOR_CRYPT_CA}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.65rem", color: "var(--subtle)", textDecoration: "none" }}>Collector Crypt ↗</a>
            </div>
            {result.simulated && <p style={{ fontSize: "0.58rem", color: "var(--subtle)", marginTop: "0.35rem" }}>Simulation Mode — no real mint</p>}
          </div>
        )}

        {/* CTA */}
        {phase === "idle" && (
          <button onClick={deploy} style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "9px", padding: "0.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "'Space Grotesk',sans-serif" }}>
            ⬡ Deploy Vault
          </button>
        )}
        {phase === "minted" && (
          <button onClick={onCancel} style={{ width: "100%", background: "#14F195", color: "var(--void)", border: "none", borderRadius: "9px", padding: "0.75rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
            Continue →
          </button>
        )}
        {!active && phase !== "minted" && (
          <button onClick={onCancel} style={{ marginTop: "0.625rem", background: "none", border: "none", color: "var(--subtle)", fontSize: "0.72rem", cursor: "pointer" }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}