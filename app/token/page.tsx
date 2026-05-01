import Link from "next/link";

export const metadata = { title: "$ABRA Token — Abraxas" };

export default function TokenPage() {
  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>Token</p>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: "2.25rem", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>$ABRA</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--muted)", lineHeight: 1.7 }}>
          What $ABRA is, what it does, and — importantly — what it does not require.
        </p>
      </div>

      {/* Critical clarification for institutional users */}
      <div style={{ background: "rgba(61,214,140,0.06)", border: "1px solid rgba(61,214,140,0.25)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "2.5rem" }}>
        <p style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem", color: "var(--green)" }}>
          $ABRA is not required to use the platform.
        </p>
        <p style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.7 }}>
          Asset originators, vault operators, and earn pool depositors can use Abraxas with any Solana wallet. You do not need to hold, buy, or interact with $ABRA to deposit capital, register an asset, or earn yield. $ABRA is an optional participation layer — holding it unlocks access tiers and fee benefits, but is never a prerequisite.
        </p>
      </div>

      {/* Token details */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>Token details</p>
        <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
          {[
            { k: "Token",          v: "$ABRA" },
            { k: "Chain",          v: "Solana (SPL)" },
            { k: "Contract",       v: "5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS", mono: true },
            { k: "Holders",        v: "47 (as of April 2026)" },
            { k: "Distribution",   v: "Launched via Bags.fm fair launch. Bonding curve. No pre-mine, no team allocation ahead of public." },
            { k: "Supply",         v: "Dynamic (bonding curve). Current bonding progress: 14.7%" },
          ].map((row, i) => (
            <div key={row.k} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.75rem", padding: "0.875rem 1.25rem", borderBottom: i < 5 ? "1px solid var(--line)" : "none" }}>
              <span style={{ fontSize: "0.68rem", color: "var(--subtle)", textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: "1px" }}>{row.k}</span>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: (row as any).mono ? "'JetBrains Mono', monospace" : "inherit", wordBreak: "break-all" }}>{row.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What $ABRA does */}
      <div style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.62rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "1.25rem" }}>What $ABRA does</p>
        {[
          {
            role: "Access tiers",
            desc: "Holding $ABRA determines your operator tier (Initiate → Operator → Architect → Sovereign). Higher tiers unlock priority vault access, fee reductions, and APY boosts on earn pools. Full tier details at /stake.",
            active: true,
          },
          {
            role: "Fee reduction",
            desc: "Operator tier (10,000+ $ABRA): 10% fee reduction. Architect tier (100,000+): 25% reduction. Sovereign tier (1,000,000+): 50% reduction on all platform fees.",
            active: true,
          },
          {
            role: "Revenue sharing",
            desc: "At protocol graduation from beta: 25% of all vault fees allocated to a buy-and-distribute program for $ABRA holders. Governance weighting proportional to holdings.",
            active: false,
            activating: "At graduation from beta",
          },
          {
            role: "Governance",
            desc: "Sovereign-tier holders ($1M+ $ABRA) receive protocol governance weighting — input on vault parameter changes, new asset class additions, and fee structure updates.",
            active: false,
            activating: "At graduation from beta",
          },
        ].map((item) => (
          <div key={item.role} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.875rem 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ flexShrink: 0, marginTop: "2px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: item.active ? "var(--green)" : "var(--subtle)" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{item.role}</span>
                {!item.active && <span style={{ fontSize: "0.6rem", color: "var(--subtle)", border: "1px solid var(--line)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>{item.activating}</span>}
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform vs token separation */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "2rem" }}>
        <p style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.75rem" }}>Platform surface vs. token surface</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.68rem", color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Platform (no $ABRA required)</p>
            {["Vault deposits", "Asset registration", "Earn pool deposits", "Agent assignment", "Withdrawal", "Circuit defense", "Live feed"].map((item) => (
              <p key={item} style={{ fontSize: "0.75rem", color: "var(--muted)", padding: "0.2rem 0" }}>◎ {item}</p>
            ))}
          </div>
          <div>
            <p style={{ fontSize: "0.68rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Token layer ($ABRA optional)</p>
            {["Tier badges", "Fee reductions", "Priority vault access", "APY boosts", "Revenue sharing (future)", "Governance (future)"].map((item) => (
              <p key={item} style={{ fontSize: "0.75rem", color: "var(--muted)", padding: "0.2rem 0" }}>◈ {item}</p>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <a href="https://bags.fm/$WORLDLABSPROTOCOL-UX" target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: "none" }}>
          <div style={{ background: "var(--gold)", color: "var(--void)", borderRadius: "8px", padding: "0.75rem 1.25rem", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            Buy on Bags.fm ↗
          </div>
        </a>
        <a href="https://solscan.io/token/5c1FHZj36pkA3cpXcyZxDhRmQyxzUqMNQn8K5neDBAGS" target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: "none" }}>
          <div style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.75rem 1.25rem", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "0.82rem", cursor: "pointer" }}>
            View on Solscan ↗
          </div>
        </a>
        <Link href="/stake" style={{ flex: 1, textDecoration: "none" }}>
          <div style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: "8px", padding: "0.75rem 1.25rem", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: "0.82rem", cursor: "pointer" }}>
            View Tiers →
          </div>
        </Link>
      </div>
    </div>
  );
}