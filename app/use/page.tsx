// FILE: app/use/page.tsx
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { usePositions, closePosition, Position } from "@/lib/positionStore";
import { logActivity } from "@/lib/activityStore";
import { useAuth } from "@/lib/authState";
import { fmtUSD, ABRA } from "@/lib/appData";
import { withdrawFromVault, TxState } from "@/lib/vaultService";

interface WithdrawResult {
  txSignature:    string;
  explorerUrl:    string;
  amountReturned: number;
  simulated:      boolean;
}

function UseInner() {
  const router    = useRouter();
  const params    = useSearchParams();
  const preId     = params?.get("id") ?? null;
  const { walletAddressFull, walletConnected } = useAuth();

  const positions = usePositions();
  const active    = positions.filter((p) => p.status === "active");

  const [selectedId, setSelectedId] = useState<string | null>(preId);
  const [txState,    setTxState]    = useState<TxState>("idle");
  const [result,     setResult]     = useState<WithdrawResult | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const selected: Position | null = active.find((p) => p.id === selectedId) ?? null;

  const submit = async () => {
    if (!selected || !walletAddressFull) {
      setError("Connect your wallet to withdraw.");
      setTxState("error");
      return;
    }
    setTxState("withdrawing");

    const res = await withdrawFromVault({
      userWallet:  walletAddressFull,
      mintAddress: selected.mintAddress,
      amount:      selected.amount,
      vaultId:     selected.vaultId,
    });

    if (!res.ok) {
      setError(res.error ?? "Withdraw failed.");
      setTxState("error");
      return;
    }

    closePosition(selected.id);
    logActivity({
      type: "withdraw", vaultId: selected.vaultId, vaultName: selected.vaultName,
      asset: selected.asset, amount: selected.amount,
      message: "Position closed — capital returned",
      txSig: res.txSignature,
    });
    setResult({
      txSignature:    res.txSignature,
      explorerUrl:    res.explorerUrl,
      amountReturned: res.amountReturned,
      simulated:      res.simulated,
    });
    setTxState("withdrawn");
  };

  // ── WITHDRAWN SUCCESS ───────────────────────────────────────────────────────
  if (txState === "withdrawn" && result && selected) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: "60px", height: "60px", margin: "0 auto 1rem", borderRadius: "50%", background: "rgba(61,214,140,0.12)", border: "2px solid var(--green)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>✓</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.5rem", marginBottom: "0.4rem" }}>Capital returned.</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            {fmtUSD(result.amountReturned)} from {selected.vaultName}.
          </p>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden", marginBottom: "0.875rem" }}>
          {[
            { k: "Vault",     v: selected.vaultName },
            { k: "Amount",    v: fmtUSD(result.amountReturned), bold: true },
            { k: "Status",    v: result.simulated ? "Simulated exit" : "Confirmed on-chain" },
            { k: "Token burned", v: "ABRAP · Token-2022" },
          ].map(({ k, v, bold }, i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{k}</span>
              <span style={{ fontSize: "0.78rem", fontWeight: bold ? 700 : 500, color: "var(--text)" }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(61,214,140,0.05)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "0.875rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--gold)", wordBreak: "break-all", marginBottom: "0.5rem" }}>
            {result.txSignature}
          </div>
          <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
            View on Solscan ↗
          </a>
          {result.simulated && (
            <p style={{ fontSize: "0.65rem", color: "var(--subtle)", marginTop: "0.5rem", lineHeight: 1.5 }}>
              Simulated exit — Token-2022 burn and SOL return structure is real. Add VAULT_AUTHORITY_SECRET for live execution.
            </p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
          <Link href="/app" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "10px", padding: "0.85rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Dashboard</button>
          </Link>
          <Link href="/onboard" style={{ textDecoration: "none" }}>
            <button style={{ width: "100%", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.85rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>New position</button>
          </Link>
        </div>
      </div>
    );
  }

  // ── WITHDRAWING STATE ───────────────────────────────────────────────────────
  if (txState === "withdrawing") {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.25rem", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", margin: "0 auto 1.25rem", borderRadius: "50%", border: "3px solid var(--line)", borderTopColor: "var(--gold)", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>Closing position…</p>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Burning Token-2022 · Returning capital</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── MAIN SELECT / REVIEW ────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <button onClick={() => router.push("/app")}
        style={{ background: "none", border: "none", color: "var(--subtle)", fontSize: "0.75rem", cursor: "pointer", marginBottom: "1.25rem" }}>
        ← Dashboard
      </button>

      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Withdraw</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "1.75rem", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
        Use your capital
      </h1>

      {!walletConnected ? (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>Connect your wallet to see positions.</p>
          <Link href="/app" style={{ color: "var(--gold)", textDecoration: "none", fontSize: "0.82rem" }}>Go to dashboard →</Link>
        </div>
      ) : active.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: "12px", padding: "2.5rem 1.25rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>No active positions.</p>
          <Link href="/onboard" style={{ textDecoration: "none" }}>
            <button style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
              Start Operating →
            </button>
          </Link>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
            {active.map((p) => {
              const isOn = selectedId === p.id;
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)} style={{
                  background: isOn ? "rgba(200,169,110,0.08)" : "var(--surface)",
                  border: `1px solid ${isOn ? "var(--gold)" : "var(--line)"}`,
                  borderRadius: "10px", padding: "0.875rem 1.1rem", cursor: "pointer", textAlign: "left",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{p.vaultName}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--green)" }}>{fmtUSD(p.amount)}</span>
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>{p.asset} · {p.apy}% APY</div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", overflow: "hidden", marginBottom: "1rem" }}>
              {[
                { k: "Position",     v: selected.vaultName },
                { k: "Amount out",   v: fmtUSD(selected.amount), bold: true },
                { k: "Token burned", v: "ABRAP · Token-2022" },
                { k: "Exit type",    v: "Simulated exit (clean)" },
              ].map(({ k, v, bold }, i, arr) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 1.1rem", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--subtle)" }}>{k}</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: bold ? 700 : 500, color: "var(--text)" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {txState === "error" && error && (
            <div style={{ background: "rgba(242,107,107,0.06)", border: "1px solid rgba(242,107,107,0.25)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
              <p style={{ fontSize: "0.78rem", color: "var(--red)" }}>{error}</p>
            </div>
          )}

          <button disabled={!selectedId} onClick={submit} style={{
            width: "100%",
            background: selectedId ? "var(--gold)" : "var(--surface)",
            color: selectedId ? "var(--void)" : "var(--subtle)",
            border: "none", borderRadius: "10px", padding: "0.95rem",
            fontWeight: 700, fontSize: "0.9rem",
            cursor: selectedId ? "pointer" : "not-allowed",
          }}>
            Confirm withdraw
          </button>

          <div style={{ marginTop: "1.5rem", padding: "0.875rem 1.1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px" }}>
            <p style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.4rem" }}>Other actions</p>
            <a href={`https://jup.ag/swap/SOL-${ABRA.ca}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "var(--text)" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Swap to {ABRA.ticker}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--gold)" }}>Open Jupiter ↗</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export default function UsePage() {
  return (
    <Suspense fallback={<div style={{ padding: "4rem", textAlign: "center", color: "var(--subtle)" }}>Loading…</div>}>
      <UseInner />
    </Suspense>
  );
}