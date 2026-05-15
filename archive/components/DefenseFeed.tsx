import { mockDefenseEvents } from "@/lib/mockData";
import { formatCurrency } from "@/lib/utils";

export function DefenseFeed({ limit }: { limit?: number }) {
  const events = limit ? mockDefenseEvents.slice(0, limit) : mockDefenseEvents;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{
        padding: "0.875rem 1.25rem",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--raise)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--gold)", display: "inline-block" }} />
          <span style={{ fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text)" }}>
            Circuit Defense
          </span>
        </div>
        <span style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--green)" }}>$0 Unrecovered</span>
      </div>

      <div>
        {events.map((e, i) => (
          <div key={e.id} style={{
            padding: "1rem 1.25rem",
            borderBottom: i < events.length - 1 ? "1px solid var(--line)" : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: "var(--subtle)" }}>{e.timestamp}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--green)", fontWeight: 600 }}>
                {formatCurrency(e.capitalPreserved)} preserved
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
              <span style={{ color: "var(--gold)", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>VAULT-{e.vaultId}</span>
              <span style={{ color: "var(--subtle)", fontSize: "0.75rem" }}>· {e.trigger}</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--subtle)" }}>→ {e.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
