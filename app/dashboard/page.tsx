// FILE: app/dashboard/page.tsx
"use client";

import Link from "next/link";
import { usePositions, computeYield, Position } from "@/lib/positionStore";
import { useAuth } from "@/lib/authState";
import { fmtUSD } from "@/lib/appData";
import { LiveFeed } from "@/components/LiveFeed";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export default function DashboardPage() {
  const { walletConnected, walletAddress } = useAuth();
  const positions = usePositions();
  const active    = positions.filter((p) => p.status !== "withdrawn");
  const withdrawn = positions.filter((p) => p.status === "withdrawn");

  const totalPrincipal = active.reduce((s, p) => s + p.principal, 0);
  const totalYield     = active.reduce((s, p) => s + computeYield(p), 0);
  const totalValue     = totalPrincipal + totalYield;
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
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "1rem" }}>See your balance, positions, and position tokens.</p>
          <div style={{ display: "inline-block" }}><ConnectWalletButton size="lg" /></div>
        </div>
      )}

      {walletConnected && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.625rem", marginBottom: "1.5rem" }}>
          {[
            { k: "Wallet",          v: walletAddress ?? "—", mono: true },
            { k: "Positions",       v: String(active.length) },
            { k: "Principal",       v: fmtUSD(totalPrincipal) },
            { k: "Accrued yield",   v: fmtUSD(totalYield), green: true },
            { k: "Total value",     v: fmtUSD(totalValue), bold: true },
            { k: "Annual yield",    v: fmtUSD(annualYield), green: true },
          ].map((s) => (
            <div key={s.k} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", padding: "0.875rem 1rem" }}>
              <div style={{ fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.25rem" }}>{s.k}</div>
              <div style={{ fontWeight: (s as {bold?:boolean}).bold ? 800 : 700, fontSize: s.mono ? "0.72rem" : "1rem", color: (s as {green?:boolean}).green ? "var(--green)" : "var(--text)", fontFamily: s.mono ? "'JetBrains Mono', monospace" : "'Space Grotesk', sans-serif", wordBreak: "break-all" }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active positions */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.875rem" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)" }}>Active positions</p>
          <Link href="/operate" style={{ fontSize: "0.72rem", color: "var(--gold)", textDecoration: "none" }}>+ New position</Link>
        </div>

        {active.length === 0 ? (
          <div style={{ background: "var(--surface)", border: "1px dashed var(--line)", borderRadius: "12px", padding: "2.5rem 1.25rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "1rem" }}>
              {walletConnected ? "No active positions. Deposit to a vault to get started." : "Connect wallet to see positions."}
            </p>
            <Link href="/operate" style={{ textDecoration: "none" }}>
              <button style={{ background: "var(--gold)", color: "var(--void)", border: "none", borderRadius: "8px", padding: "0.7rem 1.4rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Start Operating →</button>
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {active.map((p: Position) => {
              const accrued  = computeYield(p);
              const total    = p.principal + accrued;
              const annual   = Math.round(p.principal * p.apy / 100);
              return (
                <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.625rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{p.displayName}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--subtle)" }}>{p.vaultName} · {p.assetType}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--green)" }}>{p.apy}%</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--subtle)", textTransform: "uppercase" }}>APY</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem", paddingTop: "0.625rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Principal</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fmtUSD(p.principal)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Accrued</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--green)" }}>{fmtUSD(accrued)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total value</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fmtUSD(total)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.58rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Annual</div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--green)" }}>{fmtUSD(annual)}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.6rem", color: "var(--subtle)" }}>
                      {p.tokenSymbol} · {p.mintAddress.slice(0, 12)}…
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <a href={p.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>View tx ↗</a>
                      <a href={`https://solscan.io/token/${p.mintAddress}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.68rem", color: "var(--gold)", textDecoration: "none" }}>View token ↗</a>
                      <Link href={`/withdraw/${p.id}`} style={{ textDecoration: "none" }}>
                        <button style={{ background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "6px", padding: "0.28rem 0.7rem", fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>Withdraw</button>
                      </Link>
                    </div>
                  </div>
                  {p.simulated && (
                    <div style={{ marginTop: "0.5rem", fontSize: "0.6rem", color: "var(--subtle)" }}>Simulated mode · Add VAULT_AUTHORITY_SECRET for live on-chain position</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Withdrawn positions */}
      {withdrawn.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Withdrawn</p>
          {withdrawn.map((p: Position) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.7rem 1.1rem", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "10px", marginBottom: "0.5rem", opacity: 0.65 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.displayName}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--subtle)" }}>{p.vaultName} · {new Date(p.withdrawnAt ?? 0).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fmtUSD(p.totalValue)}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--subtle)" }}>returned</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live feed reads from same activity store */}
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.75rem" }}>Activity</p>
      <LiveFeed limit={8} showHeader={false} />
    </div>
  );
}