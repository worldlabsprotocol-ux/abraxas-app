export function DemoEnvironmentBanner() {
  if (process.env.NEXT_PUBLIC_ABRAXAS_JUDGE_DEMO?.trim() !== "true") {
    return null;
  }

  return (
    <div
      role="status"
      data-testid="demo-environment-banner"
      style={{
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        fontSize: "0.78rem",
        letterSpacing: "0.02em",
        padding: "0.55rem 1rem",
        textAlign: "center",
        borderBottom: "1px solid #334155",
      }}
    >
      DEMO environment · Test data · Testnet transfer submission is disabled
    </div>
  );
}
