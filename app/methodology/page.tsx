// FILE: app/methodology/page.tsx
import Link from "next/link";

export const metadata = { title: "Methodology. Abraxas" };

const ITEMS = [
  {
    metric: "Total AUM",
    definition: "Sum of TVL across all active vaults. No multiplier, no projections, no committed-but-not-deployed capital.",
    calc: "VAULT-490 + VAULT-491 + VAULT-492 + VAULT-493 + VAULT-494",
    source: "Matches the marketplace card values exactly.",
  },
  {
    metric: "Active Vaults",
    definition: "Vaults currently in operating or graduating status. Paused vaults are excluded.",
    calc: "Count of vaults where status ≠ paused.",
    source: "Per-vault status visible in /marketplace.",
  },
  {
    metric: "Unrecovered",
    definition: "Capital lost to defense events that has not been recovered or made whole. Currently $0.",
    calc: "Sum of confirmed principal losses across all vaults since inception.",
    source: "Updated after each defense event resolution.",
  },
  {
    metric: "Yield (APY)",
    definition: "Annualized rate projected from realized income performance. Vaults under 90 days of history are projections, not realized full-year figures.",
    calc: "(Cumulative income ÷ days operating) × 365 ÷ TVL",
    source: "Per-vault APY shown on each vault card.",
  },
  {
    metric: "Token-2022 Position",
    definition: "Each deposit mints one position token to the depositor's Sui wallet. The token name and symbol match the on-screen UI exactly.",
    calc: "1 token minted per deposit. Burned on withdraw.",
    source: "On-chain Solscan verifiable via the deposit success screen.",
  },
];

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Transparency</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "clamp(1.75rem, 5vw, 2.4rem)", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
        Methodology
      </h1>
      <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.65, marginBottom: "2rem" }}>
        Every headline number on Abraxas has a single, auditable definition. If a number on the site doesn't match a number here, that's a bug. flag it.
      </p>

      {ITEMS.map((it, i) => (
        <div key={it.metric} style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: i < ITEMS.length - 1 ? "1px solid var(--line)" : "none" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--gold)", marginBottom: "0.75rem" }}>
            {it.metric}
          </h2>
          {[
            { k: "Definition",  v: it.definition },
            { k: "Calculation", v: it.calc       },
            { k: "Source",      v: it.source     },
          ].map((row) => (
            <div key={row.k} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: "1px" }}>{row.k}</span>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65 }}>{row.v}</p>
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem" }}>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.65 }}>
          Found a number that doesn't match? <Link href="/" style={{ color: "var(--gold)" }}>Go to home</Link> and tell us.
        </p>
      </div>
    </div>
  );
}