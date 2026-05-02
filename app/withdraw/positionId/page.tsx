// FILE: app/withdraw/[positionId]/page.tsx
// Withdraw flow. Calculates exit = principal + accruedYield.
// Updates position status → withdrawn. Logs WithdrawEvent.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { usePositions, withdrawPosition, computeYield, Position } from "@/lib/positionStore";
import { logEvent } from "@/lib/activityStore";
import { withdrawFromVault, TxState } from "@/lib/protocolService";
import { useAuth } from "@/lib/authState";
import { fmtUSD } from "@/lib/appData";

interface WithdrawResult {
  txSignature:    string;
  explorerUrl:    string;
  amountReturned: number;
  simulated:      boolean;
}

export default function WithdrawPage({ params }: { params: { positionId: string } }) {
  const router    = useRouter();
  const { walletAddressFull, walletConnected } = useAuth();
  const positions = usePositions();

  const [txState, setTxState] = useState<TxState>("idle");
  const [result,  setResult]  = useState<WithdrawResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [liveYield, setLiveYield] = useState(0);

  const position: Position | null = positions.find((p) => p.id === params.positionId && p.status !== "withdrawn") ?? null;

  useEffect(() => {
    if (!position) return;
    const update = () => setLiveYield(computeYield(position));
    update();
    const t = setInterval(update, 10_000);
    return () => clearInterval(t);
  }, [position]);

  if (!position) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "var(--muted)", marginBottom: "1rem" }}>Position not found or already withdrawn.</p>
        <Link href="/dashboard" style={{ color: "var(--gold)" }}>Back to dashboard →</Link>
      </div>
    );
  }

  const exitAmount = position.principal + liveYield;

  const submit = async () => {
    if (!walletConnected || !walletAddressFull) {
      setError("Connect your wallet to withdraw.");
      setTxState("error");
      return;
    }
    setTxState("withdrawing");

    const res = await withdrawFromVault({
      userWallet:   walletAddressFull,
      positionId:   position.id,
      mintAddress:  position.mintAddress,
      principal:    position.principal,
      accruedYield: liveYield,
    });

    if (!res.ok) {
      setError(res.error ?? "Withdraw failed.");
      setTxState("error");
      return;
    }

    // Update position state — withdrawn, amount locked
    withdrawPosition(position.id);

    // Log WithdrawEvent
    logEvent({
      type:        "withdraw",
      userWallet:  walletAddressFull,
      vaultId:     position.vaultId,
      vaultName:   position.vaultName,
      assetType:   position.assetType,
      amount:      res.amountReturned,
      message:     `Position closed — ${fmtUSD(res.amountReturned)} returned`,
      txSignature: res.txSignature,
      simulated:   res.simulated,
    });

    setResult({ txSignature: res.txSignature, explorerUrl: res.explorerUrl, amountReturned: res.amountReturned, simulated: res.simulated });
    setTxState("withdrawn");
  };

  // ── WITHDRAWN SUCCESS ───────────────────────────────────────────────────────
  if (txState === "withdrawn" && result) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: "60px", height: "60px", margin: "0 auto 1rem", borderRadius: "50%", background: "rgba(61,214,140,0.12)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>✓</div>
          <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.4rem" }}>Capital returned.</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{fmtUSD(result.amountReturned)} from {position.vaultName}.</p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "0.875rem" }}>
          {[
            { k: "Position",       v: position.displayName },
            { k: "Vault",          v: position.vaultName },
            { k: "Principal",      v: fmtUSD(position.principal) },
            { k: "Accrued yield",  v: fmtUSD(liveYield), green: true },
            { k: "Total returned", v: fmtUSD(result.amountReturned), bold: true },
            { k: "ABRAP burned",   v: `${position.tokenSymbol} · Token-2022` },
            { k: "Status",         v: result.simulated ? "Simulated exit — labeled honestly" : "Confirmed on-chain" },
          ].map(({ k, v, bold, green }, i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>{k}</span>
              <span style={{ fontSize: "0.75rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)" }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--gold)", wordBreak: "break-all", marginBottom: "0.5rem" }}>{result.txSignature}</div>
          <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>View on Solscan ↗</a>
          {result.simulated && (
            <p style={{ fontSize: "0.65rem", color: "var(--subtle)", marginTop: "0.5rem", lineHeight: 1.5 }}>
              Simulated exit — ABRAP burn and capital return structure is real. Add VAULT_AUTHORITY_SECRET for live on-chain execution.
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.85rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Dashboard</button>
          </Link>
          <Link href="/operate" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.85rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>New position</button>
          </Link>
        </div>
      </div>
    );
  }

  // ── PROCESSING ──────────────────────────────────────────────────────────────
  if (txState === "withdrawing") {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", margin: "0 auto 1.25rem", borderRadius: "50%", border: "3px solid var(--line)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Closing position…</p>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Burning ABRAP · Returning {fmtUSD(exitAmount)}</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── REVIEW ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>← Dashboard</button>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Withdraw</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.75rem", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>Close position.</h1>

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "1rem" }}>
        {[
          { k: "Position",       v: position.displayName },
          { k: "Vault",          v: position.vaultName },
          { k: "Principal",      v: fmtUSD(position.principal) },
          { k: "Accrued yield",  v: fmtUSD(liveYield), green: true },
          { k: "Exit amount",    v: fmtUSD(exitAmount), bold: true },
          { k: "Exit type",      v: "Simulated exit (clearly labeled)" },
          { k: "ABRAP burned",   v: "1 × ABRAP Token-2022" },
        ].map(({ k, v, bold, green }, i, arr) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--subtle)" }}>{k}</span>
            <span style={{ fontSize: "0.75rem", fontWeight: bold ? 700 : 500, color: green ? "var(--green)" : "var(--text)" }}>{v}</span>
          </div>
        ))}
      </div>

      {txState === "error" && error && (
        <div style={{ background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
          <p style={{ fontSize: "0.78rem", color: "#f26b6b", margin: 0 }}>{error}</p>
        </div>
      )}

      <button onClick={submit} style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.95rem", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
        Confirm withdraw — {fmtUSD(exitAmount)}
      </button>
    </div>
  );
}