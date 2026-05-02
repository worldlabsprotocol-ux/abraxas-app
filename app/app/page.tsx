// FILE: app/app/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePositions } from "@/lib/positionStore";
import { useAuth } from "@/lib/authState";
import { fmtUSD, VAULTS } from "@/lib/appData";
import { LiveFeed } from "@/components/LiveFeed";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export default function DashboardPage() {
  const router   = useRouter();
  const { walletConnected, walletAddress } = useAuth();
  const positions = usePositions();
  const active    = positions.filter((p) => p.status !== "withdrawn");

  const totalDeposited = active.reduce((s, p) => s + p.principal, 0);
  const annualYield    = active.reduce((s, p) => s + Math.round(p.principal * p.apy / 100), 0);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.25rem 4rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Dashboard</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.4rem)", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
        Your operations
      </h1>

      {!walletConnected && (
        <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.4rem" }}>Connect your wallet</p>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1rem" }}>
            See your balance, positions, and minted tokens.
          </p>
          <div style={{ display: "inline-block" }}>
            <ConnectWalletButton size="lg" />
          </div>
        </div>
      )}

      {walletConnected && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.625rem", marginBottom: "1.5rem" }}>
          {[
            { k: "Wallet",          v: walletAddress ?? "—", mono: true },
            { k: "Positions",       v: String(active.length)            },
            { k: "Total deposited", v: fmtUSD(totalDeposited)           },
            { k: "Annual yield",    v: fmtUSD(annualYield), green: true },
          ].map((s) => (
            <div key={s.k} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1rem" }}>
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.25rem" }}>{s.k}</div>
              <div style={{
                fontWeight: 700, fontSize: s.mono ? "0.75rem" : "1rem",
                color: (s as { green?: boolean }).green ? "var(--green)" : "var(--text)",
                fontFamily: s.mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif",
                wordBreak: "break-all",
              }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Positions */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)" }}>Active positions</p>
          {active.length > 0 && (
            <Link href="/use" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>Withdraw →</Link>
          )}
        </div>

        {active.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: "12px", padding: "2.5rem 1.25rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
              {walletConnected ? "No active positions. Deposit to a vault to get started." : "Connect your wallet to see positions."}
            </p>
            <Link href="/onboard" style={{ textDecoration: "none" }}>
              <button style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                Start Operating →
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {active.map((p) => {
              const vault  = VAULTS.find((v) => v.id === p.vaultId);
              const annual = Math.round(p.principal * p.apy / 100);
              return (
                <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{p.vaultName}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>{p.assetType} · {vault?.agent}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green)" }}>{p.apy}%</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "0.625rem", marginBottom: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Deposited</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fmtUSD(p.principal)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Yield/yr</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--green)" }}>{fmtUSD(annual)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Position token</div>
                      <div style={{ fontWeight: 600, fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "var(--gold)" }}>ABRAP</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap", alignItems: "center" }}>
                    <a href={`https://solscan.io/tx/${p.txSignature}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--gold)", textDecoration: "none" }}>
                      View tx ↗
                    </a>
                    <a href={`https://solscan.io/token/${p.mintAddress}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--gold)", textDecoration: "none" }}>
                      View token ↗
                    </a>
                    <button onClick={() => router.push(`/use?id=${p.id}`)}
                      style={{ marginLeft: "auto", background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.3rem 0.75rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                      Withdraw
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Activity</p>
      <LiveFeed limit={8} showHeader={false} />
    </div>
  );
}