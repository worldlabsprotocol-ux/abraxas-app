interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  subVariant?: "positive" | "neutral" | "negative";
  valueColor?: string;
}

export function StatCard({ label, value, sub, subVariant = "positive", valueColor }: StatCardProps) {
  const subColor = {
    positive: "var(--green)",
    neutral: "var(--subtle)",
    negative: "var(--red)",
  }[subVariant];

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: "14px",
      padding: "1.25rem 1.5rem",
    }}>
      <div style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--subtle)", marginBottom: "0.5rem" }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: "1.5rem",
        letterSpacing: "-0.01em",
        color: valueColor ?? "var(--text)",
        transition: "color 0.4s",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.7rem", marginTop: "0.2rem", color: subColor }}>
          {sub}
        </div>
      )}
    </div>
  );
}