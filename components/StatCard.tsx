interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subVariant?: "positive" | "neutral" | "negative";
  valueColor?: string;
}

export function StatCard({ label, value, sub, subVariant = "positive", valueColor }: StatCardProps) {
  const subColor = { positive: "var(--green)", neutral: "var(--subtle)", negative: "var(--red)" }[subVariant];
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "14px",
      padding: "1.25rem 1.5rem",
    }}>
      <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.6rem" }}>
        {label}
      </div>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.6rem", letterSpacing: "-0.01em", color: valueColor ?? "var(--text)" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.72rem", marginTop: "0.25rem", color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}
