import Link from "next/link";

export const metadata = { title: "Methodology — Abraxas" };

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Transparency</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>Methodology</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7 }}>
          Every headline metric on Abraxas has a precise operational definition. This page explains exactly what each number means, how it is calculated, and what it does not include.
        </p>
      </div>

      {[
        {
          metric: "Total AUM",
          definition: "Sum of TVLs across all active vaults. No multiplier, no pipeline projections, no committed-but-not-deployed capital.",
          calculation: "VAULT-490 TVL + VAULT-491 TVL + VAULT-492 TVL + VAULT-493 TVL + VAULT-494 TVL",
          notIncluded: "Off-chain assets pending vault assignment. Yield accrued but not yet compounded. Historical World Labs Protocol positions not yet migrated.",
          source: "Updated live from vault position data. Matches marketplace vault cards exactly.",
        },
        {
          metric: "Agent Actions",
          definition: "A recorded decision-execution cycle where an agent evaluates a signal, computes a response, and either executes an on-chain transaction or logs a confirmed hold decision.",
          calculation: "Each action is one of: (1) on-chain transaction executed, (2) position rebalance computed and submitted, (3) defense circuit evaluation with documented outcome. Heartbeat pings, price snapshots, and health checks are NOT counted as actions.",
          notIncluded: "Internal state polls. Price data refreshes. System health checks. Logging events with no decision output.",
          source: "Cumulative since vault inception date. Per-vault counts shown on each vault detail page.",
        },
        {
          metric: "Defense Events",
          definition: "A circuit defense activation where the agent detected a risk threshold breach and executed a protective response — either reducing position size, raising reserve buffer, or halting deployment pending review.",
          calculation: "Counted when ALL of the following are true: (1) a monitored metric crossed a predefined threshold, (2) the agent executed a response action, (3) the response was logged with before/after position state.",
          notIncluded: "Threshold approaches that did not trigger activation. Routine rebalancing. Risk score updates with no protective action.",
          source: "Detailed log at /transparency. Each event links to agent reasoning trace and on-chain outcome.",
        },
        {
          metric: "$0 Unrecovered",
          definition: "No defense event has resulted in a capital loss that was not subsequently recovered or made whole within the same operating period. No user has filed a capital-loss claim. All positions are at or above their entry TVL.",
          calculation: "Running total of confirmed principal losses across all vaults since inception. Currently $0.",
          notIncluded: "Unrealized yield variance. Positions currently in defense mode (reduced but not lost). Yield below projected APY.",
          source: "Updated after each defense event resolution. Zero-loss record maintained since VAULT-490 inception Feb 14, 2026.",
        },
        {
          metric: "Yield YTD",
          definition: "Annualized yield rate projected from actual income stream performance since vault inception. For vaults with less than 90 days of history, this is an annualized projection, not a realized full-year figure.",
          calculation: "Monthly income captured ÷ deployed TVL × 12. For vaults under 90 days: (cumulative income ÷ days operating) × 365 ÷ TVL.",
          notIncluded: "Compounding effect (yield on yield). Reinvestment returns not yet settled. Yield on reserved capital.",
          source: "Per-vault. Note: VAULT-492, VAULT-493, VAULT-494 have less than 90 days of history — projections are preliminary.",
        },
      ].map((item, i) => (
        <div key={item.metric} style={{ marginBottom: "2.5rem", paddingBottom: "2.5rem", borderBottom: i < 4 ? "1px solid var(--line)" : "none" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.75rem", color: "var(--gold)" }}>
            {item.metric}
          </h2>
          {[
            { label: "Definition",    value: item.definition    },
            { label: "Calculation",   value: item.calculation   },
            { label: "Not included",  value: item.notIncluded   },
            { label: "Source",        value: item.source        },
          ].map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--subtle)", letterSpacing: "0.06em", textTransform: "uppercase", paddingTop: "1px" }}>{row.label}</span>
              <p style={{ fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.65 }}>{row.value}</p>
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text)" }}>Questions or discrepancies?</strong> If you find a number on the site that doesn't match this methodology, that's a bug and we want to know. Reach out on{" "}
          <a href="https://twitter.com/pabloretroworld" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold)", textDecoration: "none" }}>X @pabloretroworld</a>.
          All vault TVL figures are verifiable on Solscan — every vault wallet address is linked on its detail page.
        </p>
      </div>
    </div>
  );
}