import Link from "next/link";

export const metadata = { title: "Transparency — Abraxas" };

const DEFENSE_LOG = [
  {
    id: "DEF-014",
    ts: "2026-04-27 14:22:08 UTC",
    vault: "VAULT-490",
    agent: "AGENT-001",
    trigger: "Streaming velocity drawdown",
    inputSignal: "7-day rolling stream count dropped 22.4% vs prior 7-day window",
    threshold: "Configured at 20% drawdown",
    decision: "Reduce deployed position 18%. Raise reserve buffer from 15% to 22%.",
    decisionType: "Rule-based circuit: velocity_drawdown_threshold",
    outcome: "Position reduced. $42,180 moved to reserve. No capital lost.",
    solscan: "https://solscan.io/account/CQ1UzRrB6C2XV39wZNB7URKwGRhEKkDQgc2xVF5dJGdf",
    capitalPreserved: 42180,
    status: "resolved",
  },
  {
    id: "DEF-013",
    ts: "2026-04-26 22:11:33 UTC",
    vault: "VAULT-493",
    agent: "AGENT-004",
    trigger: "Counterparty credit score drop",
    inputSignal: "Counterparty credit score moved from A to B+ on third-party scoring model",
    threshold: "Configured at single-notch downgrade from A-grade",
    decision: "Rotate position to higher-quality counterparty pool within same asset class.",
    decisionType: "Rule-based circuit: counterparty_downgrade_threshold",
    outcome: "Position rotated. $8,400 redeployed to A-grade counterparty. No loss.",
    solscan: "https://solscan.io/account/Db6RHGeqsZYkxjMvqjFQ4EV8KLs9xMxto3dK9Y8Q9TFf",
    capitalPreserved: 8400,
    status: "resolved",
  },
  {
    id: "DEF-012",
    ts: "2026-04-26 04:18:01 UTC",
    vault: "VAULT-491",
    agent: "AGENT-002",
    trigger: "Streaming volume drawdown",
    inputSignal: "Monthly streaming volume 18.7% below 90-day baseline",
    threshold: "Configured at 15% below 90-day baseline",
    decision: "Increase hedge ratio from 0.38 to 0.41. No position reduction.",
    decisionType: "Rule-based circuit: volume_hedge_adjustment",
    outcome: "Hedge ratio adjusted. $3,120 additional hedged. Full position maintained.",
    solscan: "https://solscan.io/account/CmWVgyeS8uR9ForuhBPs9vPoQknTMAs8CZuenLiotdDk",
    capitalPreserved: 3120,
    status: "resolved",
  },
];

export default function TransparencyPage() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>System Log</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>Transparency</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7, maxWidth: "560px" }}>
          Every defense event, agent decision, and system action is logged here with full reasoning traces. This is what "autonomous agents" actually means in practice.
        </p>
      </div>

      {/* Agent architecture — what "autonomous" means */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", padding: "1.5rem", marginBottom: "2.5rem" }}>
        <p style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.875rem" }}>Agent Architecture — What "Autonomous" Means</p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {[
            { label: "Decision architecture", value: "Rule-based circuits with configurable thresholds. Each vault has a defined set of input signals, decision rules, and response actions. No LLM inference in the execution path. Deterministic, auditable, reproducible." },
            { label: "Input signals",          value: "Streaming velocity (music vaults), rent flow delta (real estate), counterparty credit scores (receivables), on-chain liquidity depth, price volatility indices." },
            { label: "Decision rules",         value: "If/then threshold circuits. Example: IF 7-day stream velocity drops >20% THEN reduce deployed position by 15–25% AND raise reserve buffer. All thresholds are configured at vault setup and visible in vault detail pages." },
            { label: "Human override",         value: "Vault operators can pause agent execution at any time from their operator profile. All pauses are logged on-chain with timestamp and wallet signature." },
            { label: "What agents cannot do",  value: "Agents cannot move capital out of the vault to an external address, override a user's position close request, or execute actions not in their predefined rule set. The rule set is fixed at vault creation and cannot be updated without a new vault deployment." },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: "1px" }}>{row.label}</span>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65 }}>{row.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Defense event log */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)" }}>
            Defense Event Log — Most Recent
          </p>
          <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.72rem" }}>
            <span style={{ color: "var(--text)" }}>Total events: <strong>31</strong></span>
            <span style={{ color: "var(--green)" }}>$0 unrecovered</span>
          </div>
        </div>

        {DEFENSE_LOG.map((ev) => (
          <div key={ev.id} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.68rem", color: "var(--gold)", background: "rgba(200,169,110,0.1)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>{ev.id}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 600 }}>{ev.vault} · {ev.agent}</span>
                <span style={{ fontSize: "0.62rem", background: "rgba(61,214,140,0.1)", color: "var(--green)", border: "1px solid rgba(61,214,140,0.25)", padding: "0.1rem 0.4rem", borderRadius: "4px" }}>resolved</span>
              </div>
              <span style={{ fontSize: "0.62rem", color: "var(--subtle)", fontFamily: "'JetBrains Mono', monospace" }}>{ev.ts}</span>
            </div>

            {[
              { k: "Trigger",        v: ev.trigger },
              { k: "Input signal",   v: ev.inputSignal },
              { k: "Threshold",      v: ev.threshold },
              { k: "Decision",       v: ev.decision },
              { k: "Decision type",  v: ev.decisionType },
              { k: "Outcome",        v: ev.outcome },
            ].map((row) => (
              <div key={row.k} style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.65rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: "1px" }}>{row.k}</span>
                <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.55 }}>{row.v}</p>
              </div>
            ))}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.875rem", paddingTop: "0.875rem", borderTop: "1px solid var(--line)", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 }}>
                Capital preserved: ${ev.capitalPreserved.toLocaleString()}
              </span>
              <a href={ev.solscan} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--gold)", textDecoration: "none" }}>
                Vault wallet on Solscan ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "1rem 1.25rem", background: "rgba(200,169,110,0.04)", border: "1px solid rgba(200,169,110,0.15)", borderRadius: "10px" }}>
        <p style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.65 }}>
          Full defense event history and on-chain transaction records available via vault detail pages. Each vault's Solscan wallet address is linked. For metric definitions, see <Link href="/methodology" style={{ color: "var(--gold)", textDecoration: "none" }}>/methodology</Link>.
        </p>
      </div>
    </div>
  );
}